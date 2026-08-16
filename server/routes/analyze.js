import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { requireAuth } from './auth.js';

const router = Router();

const MEAL_ANALYSIS_PROMPT = `Analyze this meal (image or description) and return its nutritional breakdown.
Return ONLY raw JSON with no markdown formatting, no code fences, and no conversational text.

Required JSON Schema:
{
  "items": [{"name": "string", "portion": "string", "calories": "number", "protein": "number", "carbs": "number", "fat": "number", "fiber": "number"}],
  "total_calories": "number",
  "total_protein": "number",
  "total_carbs": "number",
  "total_fat": "number",
  "total_fiber": "number",
  "meal_type": "breakfast|lunch|dinner|snack",
  "confidence": "high|medium|low",
  "notes": "string"
}`;

// POST /api/analyze/meal
// Body: { imageBase64?: string, mimeType?: string, textQuery?: string }
router.post('/meal', requireAuth, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured on server.' });
  }

  const { imageBase64, mimeType = 'image/jpeg', textQuery } = req.body;
  if (!imageBase64 && !textQuery) {
    return res.status(400).json({ error: 'Must provide either an image or a text description.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const contentParts = [
      { type: 'text', text: MEAL_ANALYSIS_PROMPT }
    ];
    
    if (textQuery) {
      contentParts.push({ type: 'text', text: `User's description: ${textQuery}` });
    }

    if (imageBase64) {
      contentParts.push({
        type: 'image',
        mime_type: mimeType,
        data: imageBase64
      });
    }

    const interaction = await ai.interactions.create({
      model: 'gemini-3.6-flash',
      input: [
        {
          type: 'user_input',
          content: contentParts
        }
      ]
    });
    
    const text = interaction.output_text;

    // Strip markdown code fences if Gemini wraps the JSON
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.json(parsed);
  } catch (err) {
    console.error('Gemini error:', err.message);
    return res.status(500).json({ error: 'Failed to analyze image. ' + err.message });
  }
});

export default router;
