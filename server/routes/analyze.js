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

    const responseSchema = {
      type: "OBJECT",
      properties: {
        items: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              portion: { type: "STRING" },
              calories: { type: "NUMBER" },
              protein: { type: "NUMBER" },
              carbs: { type: "NUMBER" },
              fat: { type: "NUMBER" },
              fiber: { type: "NUMBER" }
            },
            required: ["name", "portion", "calories", "protein", "carbs", "fat", "fiber"]
          }
        },
        total_calories: { type: "NUMBER" },
        total_protein: { type: "NUMBER" },
        total_carbs: { type: "NUMBER" },
        total_fat: { type: "NUMBER" },
        total_fiber: { type: "NUMBER" },
        meal_type: { type: "STRING" },
        confidence: { type: "STRING" },
        notes: { type: "STRING" }
      },
      required: ["items", "total_calories", "total_protein", "total_carbs", "total_fat", "total_fiber", "meal_type", "confidence", "notes"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contentParts,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema
      }
    });
    
    let text = "";
    if (typeof response.text === 'function') {
      text = response.text();
    } else if (typeof response.text === 'string') {
      text = response.text;
    } else {
      text = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    }
    
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.json(parsed);
  } catch (err) {
    console.error('Gemini error:', err.message);
    return res.status(500).json({ error: 'Failed to analyze meal. ' + err.message });
  }
});

export default router;
