import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
// Body: { imageBase64: string, mimeType: string }
router.post('/meal', requireAuth, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured on server.' });
  }

  const { imageBase64, mimeType = 'image/jpeg' } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: 'Missing imageBase64 in request body.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const imagePart = {
      inlineData: { data: imageBase64, mimeType },
    };

    const result = await model.generateContent([MEAL_ANALYSIS_PROMPT, imagePart]);
    const text = result.response.text();

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
