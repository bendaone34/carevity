-- ─────────────────────────────────────────────────────────────────────────────
-- wellbeing_alerts
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE wellbeing_alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  alert_type   TEXT NOT NULL CHECK (alert_type IN (
                 'nutrition_low',
                 'nutrition_none',
                 'fluids_low',
                 'mood_low',
                 'mood_drop',
                 'activity_none',
                 'medication_refusals',
                 'care_plan_overdue'
               )),
  severity     TEXT NOT NULL DEFAULT 'medium'
                 CHECK (severity IN ('low', 'medium', 'high')),
  status       TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'acknowledged', 'resolved')),
  message      TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- alert_acknowledgements
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE alert_acknowledgements (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id             UUID NOT NULL REFERENCES wellbeing_alerts(id) ON DELETE CASCADE,
  clinic_id            UUID NOT NULL REFERENCES clinics(id)          ON DELETE CASCADE,
  acknowledged_by      UUID NOT NULL REFERENCES auth.users(id),
  acknowledged_by_name TEXT NOT NULL DEFAULT '',
  notes                TEXT,
  action_taken         TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX idx_wellbeing_alerts_clinic_status  ON wellbeing_alerts (clinic_id, status);
CREATE INDEX idx_wellbeing_alerts_patient        ON wellbeing_alerts (patient_id, status, alert_type);
CREATE INDEX idx_alert_acks_alert                ON alert_acknowledgements (alert_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE wellbeing_alerts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins managers read wellbeing_alerts"
  ON wellbeing_alerts FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin','manager'));

CREATE POLICY "Admins managers update wellbeing_alerts"
  ON wellbeing_alerts FOR UPDATE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin','manager'));

CREATE POLICY "Admins delete wellbeing_alerts"
  ON wellbeing_alerts FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() = 'admin');

CREATE POLICY "Admins managers read alert_acks"
  ON alert_acknowledgements FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin','manager'));

CREATE POLICY "Admins managers insert alert_acks"
  ON alert_acknowledgements FOR INSERT TO authenticated
  WITH CHECK (clinic_id = get_my_clinic_id() AND get_my_role() IN ('admin','manager'));

-- ─────────────────────────────────────────────────────────────────────────────
-- maybe_insert_alert: idempotent insert — skips if an open alert of the same
-- type already exists for this patient
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION maybe_insert_alert(
  p_clinic_id  UUID,
  p_patient_id UUID,
  p_alert_type TEXT,
  p_severity   TEXT,
  p_message    TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
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

-- ─────────────────────────────────────────────────────────────────────────────
-- check_wellbeing_thresholds: runs all threshold checks for one patient
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_wellbeing_thresholds(
  p_patient_id UUID,
  p_clinic_id  UUID
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_name             TEXT;
  v_nutrition_days   INTEGER;
  v_none_days        INTEGER;
  v_fluid_days       INTEGER;
  v_mood_low_days    INTEGER;
  v_mood_avg_30d     NUMERIC;
  v_latest_mood      INTEGER;
  v_no_activity_days INTEGER;
  v_refusal_count    INTEGER;
BEGIN
  SELECT first_name || ' ' || last_name INTO v_name
  FROM   patients WHERE id = p_patient_id;

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

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger on daily_care_records
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_daily_care_record_alerts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM check_wellbeing_thresholds(NEW.patient_id, NEW.clinic_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_daily_care_record_upsert
  AFTER INSERT OR UPDATE ON daily_care_records
  FOR EACH ROW EXECUTE FUNCTION trg_daily_care_record_alerts();

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger on medication_logs (refusals only)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_medication_log_alerts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.refused = TRUE THEN
    PERFORM check_wellbeing_thresholds(NEW.patient_id, NEW.clinic_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_medication_log_insert
  AFTER INSERT ON medication_logs
  FOR EACH ROW EXECUTE FUNCTION trg_medication_log_alerts();
