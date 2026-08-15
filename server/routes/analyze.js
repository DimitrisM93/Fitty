import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { requireAuth } from './auth.js';

const router = Router();

const MEAL_ANALYSIS_PROMPT = `You are a professional nutritionist and food recognition AI.
Analyze this meal image and provide a detailed nutritional breakdown.

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "items": [
    {
      "name": "Food item name",
      "portion": "estimated portion size (e.g. 150g, 1 cup, 1 slice)",
      "calories": 250,
      "protein": 12,
      "carbs": 30,
      "fat": 8,
      "fiber": 2
    }
  ],
  "total_calories": 250,
  "total_protein": 12,
  "total_carbs": 30,
  "total_fat": 8,
  "total_fiber": 2,
  "meal_type": "breakfast|lunch|dinner|snack",
  "confidence": "high|medium|low",
  "notes": "Any important notes about the meal or estimation accuracy"
}

Be as accurate as possible. If you cannot identify a food item clearly, provide your best estimate.
All macros should be in grams. Calories in kcal.`;

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
        type: 'inlineData',
        inlineData: { mimeType, data: imageBase64 }
      });
    }

    const interaction = await ai.interactions.create({
      model: 'gemini-2.5-flash',
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
