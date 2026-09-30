-- ─────────────────────────────────────────────────────────────────────────────
-- Lock down wellbeing alert functions (audit finding C2)
--
-- maybe_insert_alert and check_wellbeing_thresholds are SECURITY DEFINER and
-- were executable by PUBLIC, so any user could call them via /rest/v1/rpc:
--   * check_wellbeing_thresholds(<clinic B patient>, <clinic A>) copied the
--     clinic B resident's name and clinical state into clinic A's alerts.
--   * maybe_insert_alert wrote arbitrary alert text into any clinic, and an
--     open fake alert suppressed the real alert of that type.
-- The same leak was reachable through the triggers, because RLS on
-- daily_care_records / medication_logs checks clinic_id but not that
-- patient_id belongs to that clinic.
--
-- Fix: only the triggers may call these functions; both functions refuse a
-- patient that does not belong to the given clinic; search_path is pinned.
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION maybe_insert_alert(
  p_clinic_id  UUID,
  p_patient_id UUID,
  p_alert_type TEXT,
  p_severity   TEXT,
  p_message    TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only ever write an alert into the clinic that owns the patient
  IF NOT EXISTS (
    SELECT 1 FROM patients
    WHERE  id = p_patient_id AND clinic_id = p_clinic_id
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM wellbeing_alerts
    WHERE  patient_id = p_patient_id
      AND  alert_type = p_alert_type
      AND  status     = 'open'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO wellbeing_alerts (clinic_id, patient_id, alert_type, severity, message, triggered_at)
  VALUES (p_clinic_id, p_patient_id, p_alert_type, p_severity, p_message, NOW());
END;
$$;

CREATE OR REPLACE FUNCTION check_wellbeing_thresholds(
  p_patient_id UUID,
  p_clinic_id  UUID
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name             TEXT;
  v_patient_clinic   UUID;
  v_nutrition_days   INTEGER;
  v_none_days        INTEGER;
  v_fluid_days       INTEGER;
  v_mood_low_days    INTEGER;
  v_mood_avg_30d     NUMERIC;
  v_latest_mood      INTEGER;
  v_no_activity_days INTEGER;
  v_refusal_count    INTEGER;
BEGIN
  SELECT first_name || ' ' || last_name, clinic_id
  INTO   v_name, v_patient_clinic
  FROM   patients WHERE id = p_patient_id;

  -- Never evaluate a patient on behalf of another clinic: the alert message
  -- contains the resident's name and clinical state.
  IF v_patient_clinic IS NULL OR v_patient_clinic IS DISTINCT FROM p_clinic_id THEN
    RETURN;
  END IF;

  -- 1. Nutrition < 50% meals for 3 consecutive days
  SELECT COUNT(*) INTO v_nutrition_days
  FROM (
    SELECT (
      CASE WHEN (meals->'breakfast'->>'eaten')::boolean THEN 1 ELSE 0 END +
      CASE WHEN (meals->'lunch'    ->>'eaten')::boolean THEN 1 ELSE 0 END +
      CASE WHEN (meals->'dinner'   ->>'eaten')::boolean THEN 1 ELSE 0 END
    ) AS meals_eaten
    FROM   daily_care_records
    WHERE  patient_id = p_patient_id
      AND  date >= CURRENT_DATE - INTERVAL '3 days'
    ORDER  BY date DESC LIMIT 3
  ) sub WHERE meals_eaten <= 1;

  IF v_nutrition_days >= 3 THEN
    PERFORM maybe_insert_alert(p_clinic_id, p_patient_id, 'nutrition_low', 'high',
      v_name || ' has eaten less than 50% of meals for 3 consecutive days.');
  END IF;

  -- 2. No meals at all for 2 consecutive days
  SELECT COUNT(*) INTO v_none_days
  FROM (
    SELECT (
      CASE WHEN (meals->'breakfast'->>'eaten')::boolean THEN 1 ELSE 0 END +
      CASE WHEN (meals->'lunch'    ->>'eaten')::boolean THEN 1 ELSE 0 END +
      CASE WHEN (meals->'dinner'   ->>'eaten')::boolean THEN 1 ELSE 0 END
    ) AS meals_eaten
    FROM   daily_care_records
    WHERE  patient_id = p_patient_id
      AND  date >= CURRENT_DATE - INTERVAL '2 days'
    ORDER  BY date DESC LIMIT 2
  ) sub WHERE meals_eaten = 0;

  IF v_none_days >= 2 THEN
    PERFORM maybe_insert_alert(p_clinic_id, p_patient_id, 'nutrition_none', 'high',
      v_name || ' has not eaten any meals for 2 consecutive days.');
  END IF;

  -- 3. Fluids < 500 ml for 2 consecutive days
  SELECT COUNT(*) INTO v_fluid_days
  FROM (
    SELECT (meals->>'fluids_ml')::numeric AS fluids_ml
    FROM   daily_care_records
    WHERE  patient_id = p_patient_id
      AND  date >= CURRENT_DATE - INTERVAL '2 days'
    ORDER  BY date DESC LIMIT 2
  ) sub WHERE COALESCE(fluids_ml, 0) < 500;

  IF v_fluid_days >= 2 THEN
    PERFORM maybe_insert_alert(p_clinic_id, p_patient_id, 'fluids_low', 'high',
      v_name || ' has had less than 500ml of fluids recorded for 2 consecutive days.');
  END IF;

  -- 4. Mood score 1-2 for 3 consecutive days
  SELECT COUNT(*) INTO v_mood_low_days
  FROM (
    SELECT mood_score FROM daily_care_records
    WHERE  patient_id = p_patient_id
      AND  date >= CURRENT_DATE - INTERVAL '3 days'
    ORDER  BY date DESC LIMIT 3
  ) sub WHERE mood_score <= 2;

  IF v_mood_low_days >= 3 THEN
    PERFORM maybe_insert_alert(p_clinic_id, p_patient_id, 'mood_low', 'medium',
      v_name || ' has had a persistently low mood score (1-2 out of 5) for 3 consecutive days.');
  END IF;

  -- 5. Mood drop 3+ points vs 30-day average
  SELECT AVG(mood_score) INTO v_mood_avg_30d
  FROM   daily_care_records
  WHERE  patient_id = p_patient_id
    AND  date >= CURRENT_DATE - INTERVAL '30 days'
    AND  date <  CURRENT_DATE;

  SELECT mood_score INTO v_latest_mood
  FROM   daily_care_records
  WHERE  patient_id = p_patient_id
  ORDER  BY date DESC LIMIT 1;

  IF v_mood_avg_30d IS NOT NULL AND v_latest_mood IS NOT NULL
     AND (v_mood_avg_30d - v_latest_mood) >= 3 THEN
    PERFORM maybe_insert_alert(p_clinic_id, p_patient_id, 'mood_drop', 'medium',
      v_name || '''s mood score (' || v_latest_mood::text ||
      '/5) has dropped significantly below their 30-day average (' ||
      ROUND(v_mood_avg_30d, 1)::text || '/5).');
  END IF;

  -- 6. No activity for 5 consecutive days
  SELECT COUNT(*) INTO v_no_activity_days
  FROM (
    SELECT activity FROM daily_care_records
    WHERE  patient_id = p_patient_id
      AND  date >= CURRENT_DATE - INTERVAL '5 days'
    ORDER  BY date DESC LIMIT 5
  ) sub WHERE COALESCE(TRIM(activity), '') IN ('', 'none', 'None', 'NONE');

  IF v_no_activity_days >= 5 THEN
    PERFORM maybe_insert_alert(p_clinic_id, p_patient_id, 'activity_none', 'low',
      v_name || ' has had no activity recorded for 5 consecutive days.');
  END IF;

  -- 7. Medication refusals 3+ in rolling 7 days
  SELECT COUNT(*) INTO v_refusal_count
  FROM   medication_logs
  WHERE  patient_id = p_patient_id
    AND  refused    = TRUE
    AND  date       >= CURRENT_DATE - INTERVAL '7 days';

  IF v_refusal_count >= 3 THEN
    PERFORM maybe_insert_alert(p_clinic_id, p_patient_id, 'medication_refusals', 'high',
      v_name || ' has refused medication ' || v_refusal_count::text || ' times in the past 7 days.');
  END IF;

  -- 8. Care plan task overdue 5+ days
  IF EXISTS (
    SELECT 1
    FROM   care_plan_tasks cpt
    JOIN   care_plans cp ON cp.id = cpt.care_plan_id
    WHERE  cp.patient_id = p_patient_id
      AND  cp.status     = 'active'
      AND  cpt.status    IN ('pending', 'in_progress')
      AND  cpt.due_date  IS NOT NULL
      AND  cpt.due_date  <= CURRENT_DATE - INTERVAL '5 days'
  ) THEN
    PERFORM maybe_insert_alert(p_clinic_id, p_patient_id, 'care_plan_overdue', 'medium',
      v_name || ' has one or more care plan tasks that are 5 or more days overdue.');
  END IF;

END;
$$;

CREATE OR REPLACE FUNCTION trg_daily_care_record_alerts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM check_wellbeing_thresholds(NEW.patient_id, NEW.clinic_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_medication_log_alerts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.refused = TRUE THEN
    PERFORM check_wellbeing_thresholds(NEW.patient_id, NEW.clinic_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Only the triggers (which run as the function owner) call these.
-- Trigger firing does not check EXECUTE, so revoking is safe for them too.
REVOKE EXECUTE ON FUNCTION maybe_insert_alert(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION check_wellbeing_thresholds(UUID, UUID)           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION trg_daily_care_record_alerts()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION trg_medication_log_alerts()                       FROM PUBLIC, anon, authenticated;
