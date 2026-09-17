import { getGeminiKey } from './storage';

const MEAL_ANALYSIS_PROMPT = `You are a professional nutritionist and food recognition AI.
Analyze this meal image and provide a detailed nutritional breakdown.

GREEK CUISINE & CULINARY CONTEXT:
- The user is based in Greece and consumes Greek cuisine, Mediterranean dishes, and local ingredients.
- Recognize traditional Greek dishes and ingredients (e.g. Souvlaki, Gyros, Moussaka, Pastitsio, Spanakopita, Tiropita, Ladera / Lathera like Fasolakia, Gemista, Briam, Gigantes, Tzatziki, Horiatiki Greek Salad, Feta, Graviera, Kefalotyri, Greek Yogurt, Pita bread, Dakos, Kontosouvli, etc.).
- ALWAYS assume generous use of Extra Virgin Olive Oil (EVOO) in Greek cooking, pan-frying, salad dressings, and vegetable casseroles (Ladera). 1 tablespoon of olive oil is ~120 kcal / 14g fat.
- Factor in full-fat Greek dairy (feta cheese, 10% Greek yogurt) and oil-brushed pitas/pastries.

CRITICAL CALORIE & MACRO ESTIMATION RULE (WORST-CASE / UPPER BOUND ESTIMATION):
- Always assume the WORST-CASE SCENARIO for calories and macros (upper boundary of range).
- If an item or meal calories could be in an estimated range (e.g. between 500 kcal and 700 kcal), ALWAYS select the HIGHER / UPPER estimate (e.g. 700 kcal).
- Account for hidden fats, generous olive oil pours, butter, rich sauces, dressings, and generous portion sizes.
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



export function imageFileToBase64(file, maxWidth = 1024, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to compressed base64 JPEG
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = compressedDataUrl.split(',')[1];
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
