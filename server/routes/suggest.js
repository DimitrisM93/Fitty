import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { requireAuth } from './auth.js';

const router = Router();

// POST /api/suggest/meal
// Body: { todayMeals, historyMeals, userProfile, currentTime }
router.post('/meal', requireAuth, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured on server.' });
  }

  const { todayMeals = [], historyMeals = [], userProfile = {}, currentTime, fillingLevel = 'full' } = req.body;

  const FILLING_INSTRUCTIONS = {
    snack:  'The user wants a LIGHT SNACK — target 150–300 kcal. Suggest something small and quick (e.g. Greek yogurt, a handful of nuts, a small dakos, fruit).',
    light:  'The user wants a LIGHT MEAL — target 300–500 kcal. Suggest something satisfying but not heavy.',
    full:   'The user wants a FULL, FILLING MEAL — target 500–800 kcal. Suggest something substantial that will keep them full for several hours.',
  };
  const fillingInstruction = FILLING_INSTRUCTIONS[fillingLevel] || FILLING_INSTRUCTIONS.full;

  // Build today summary
  const todaySummary = todayMeals.length === 0
    ? 'Nothing eaten yet today.'
    : todayMeals.map(m => {
        const items = Array.isArray(m.items)
          ? m.items.map(i => i.name).join(', ')
          : (m.notes || m.meal_type || 'meal');
        return `- ${m.meal_type || 'meal'}: ${items} (${m.total_calories || 0} kcal, P:${Math.round(m.total_protein||0)}g C:${Math.round(m.total_carbs||0)}g F:${Math.round(m.total_fat||0)}g)`;
      }).join('\n');

  const todayCalories = todayMeals.reduce((s, m) => s + (m.total_calories || 0), 0);
  const calorieGoal = userProfile.calorie_goal || userProfile.goal || 2000;
  const remainingCalories = calorieGoal - todayCalories;

  // Build history summary grouped by date
  const byDate = {};
  for (const m of historyMeals) {
    const date = (m.meal_date || '').split('T')[0];
    if (!date) continue;
    if (!byDate[date]) byDate[date] = [];
    const items = Array.isArray(m.items)
      ? m.items.map(i => i.name).join(', ')
      : (m.notes || m.meal_type || 'meal');
    byDate[date].push(`${m.meal_type || 'meal'}: ${items} (${m.total_calories || 0} kcal)`);
  }
  const historySummary = Object.entries(byDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7)
    .map(([date, entries]) => `${date}:\n${entries.map(e => '  - ' + e).join('\n')}`)
    .join('\n');

  const prompt = `You are a personal nutritionist AI for a user based in Greece who eats Greek / Mediterranean cuisine.

CONTEXT:
- Current time: ${currentTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
- User profile: age=${userProfile.age || 'unknown'}, gender=${userProfile.gender || 'male'}, weight=${userProfile.weight || 'unknown'}kg, height=${userProfile.height || 'unknown'}cm
- Daily calorie goal: ${calorieGoal} kcal
- Already consumed today: ${todayCalories} kcal
- Remaining calories: ${remainingCalories} kcal

WHAT THE USER ATE TODAY SO FAR:
${todaySummary}

MEAL HISTORY (last 7 days):
${historySummary || 'No history available.'}

GREEK CUISINE CONTEXT:
- The user eats traditional Greek cuisine, Mediterranean dishes, and local ingredients.
- Common dishes: Souvlaki, Gyros, Moussaka, Pastitsio, Spanakopita, Tiropita, Fasolakia, Gemista, Briam, Gigantes, Tzatziki, Horiatiki salad, Feta, Greek Yogurt, Pita bread, Fakes (lentil soup), Kontosouvli, Dakos, etc.
- Account for generous use of olive oil and full-fat Greek dairy.
- Suggest something appropriate for the time of day (breakfast before 11am, lunch 11am-3pm, snack 3pm-6pm, dinner after 6pm).

TASK:
Based on the current time, what was already eaten today, and historical patterns, suggest ONE specific meal. Be concrete (not generic). Reference Greek cuisine where appropriate.

FILLING LEVEL REQUIREMENT (CRITICAL — respect this above all else):
${fillingInstruction}

CRITICAL: Respond ONLY with valid JSON. No markdown, no extra text. Start with { end with }.

JSON schema:
{
  "suggestion": "Specific meal name",
  "meal_type": "breakfast|lunch|dinner|snack",
  "reasoning": "2-3 sentence explanation referencing time, history, and remaining calories",
  "estimated_calories": 500,
  "estimated_protein": 35,
  "estimated_carbs": 45,
  "estimated_fat": 18,
  "alternatives": ["Alternative 1", "Alternative 2", "Alternative 3"]
}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const interaction = await ai.interactions.create({
      model: 'gemini-2.0-flash',
      input: [{ type: 'user_input', content: [{ type: 'text', text: prompt }] }],
    });
    const text = (interaction.output_text || '{}').trim();
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return res.json(parsed);
  } catch (err) {
    console.error('Meal suggestion error:', err.message);
    return res.status(500).json({ error: 'Failed to generate suggestion. ' + err.message });
  }
});

export default router;
