import { getGeminiKey } from './storage';

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



export function imageFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      // Strip the data URL prefix to get raw base64
      const base64 = e.target.result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
