import { getGeminiKey } from './storage';

const MEAL_ANALYSIS_PROMPT = `You are a professional nutritionist and food recognition AI.
Analyze this meal image and provide a detailed nutritional breakdown.

CRITICAL CALORIE & MACRO ESTIMATION RULE (WORST-CASE / UPPER BOUND ESTIMATION):
- Always assume the WORST-CASE SCENARIO for calories and macros (upper boundary of range).
- If an item or meal calories could be in an estimated range (e.g. between 500 kcal and 700 kcal), ALWAYS select the HIGHER / UPPER estimate (e.g. 700 kcal).
- Account for hidden fats, cooking oils, butter, rich sauces, dressings, and generous portion sizes.
- Do NOT underestimate calories; err on the side of caution for calorie tracking by providing upper-bound calculations for all items and totals.

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
