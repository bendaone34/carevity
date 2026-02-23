import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  const body = await request.json();
  const {
    residentName, date, moodScore, moodLabel, moodNotes,
    breakfast, lunch, dinner, snacks, fluidsMl,
    bathing, grooming, dressing, oralCare, personalCareNotes,
    activity, incidents, generalNotes,
  } = body;

  const dateFormatted = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const mealsText = [
    `Breakfast: ${breakfast.eaten ? 'Eaten' + (breakfast.notes ? ' — ' + breakfast.notes : '') : 'Not eaten'}`,
    `Lunch: ${lunch.eaten ? 'Eaten' + (lunch.notes ? ' — ' + lunch.notes : '') : 'Not eaten'}`,
    `Dinner: ${dinner.eaten ? 'Eaten' + (dinner.notes ? ' — ' + dinner.notes : '') : 'Not eaten'}`,
    snacks ? `Snacks: ${snacks}` : null,
  ].filter(Boolean).join('. ');

  const personalCareItems = [
    bathing  && 'bathing/showering',
    grooming && 'hair and grooming',
    dressing && 'dressing',
    oralCare && 'oral care',
  ].filter(Boolean) as string[];
  const personalCareText = personalCareItems.length > 0
    ? personalCareItems.join(', ') + (personalCareNotes ? `. ${personalCareNotes}` : '')
    : 'No personal care tasks completed' + (personalCareNotes ? `. ${personalCareNotes}` : '');

  const prompt = `You are a professional care note writer for a UK care home. Write a detailed, professional daily care note suitable for CQC inspection based on the following information. Write in third person, past tense, using formal and empathetic language. The note should be 150-250 words. Do not include a heading or title — write the note body only. Do not use bullet points.

Resident: ${residentName}
Date: ${dateFormatted}
Mood: ${moodLabel} (${moodScore}/5)${moodNotes ? ' — ' + moodNotes : ''}
Meals: ${mealsText}
Fluid intake: ${fluidsMl ? fluidsMl + 'ml' : 'not recorded'}
Personal care: ${personalCareText}
Activities: ${activity || 'No activities recorded'}
Concerns/incidents: ${incidents || 'None reported'}
Additional observations: ${generalNotes || 'None'}

Write the care note now:`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const note = result.response.text().trim();
    return NextResponse.json({ note });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate note';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
