import { Router } from 'express';
import Groq from 'groq-sdk';
import { requireAuth } from './auth.js';

const router = Router();

// POST /api/suggest/meal
// Body: { todayMeals, historyMeals, userProfile, currentTime, fillingLevel }
router.post('/meal', requireAuth, async (req, res) => {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured on server.' });

  const { todayMeals = [], historyMeals = [], userProfile = {}, currentTime, fillingLevel = 'full' } = req.body;

  const FILLING_INSTRUCTIONS = {
    snack: {
      desc: 'The user wants a LIGHT SNACK - target 150-300 kcal. Suggest something small and quick (e.g. Greek yogurt, nuts, a small dakos, fruit). DO NOT suggest a full meal.',
      cal: 250, pro: 10, carbs: 20, fat: 10, type: 'snack'
    },
    light: {
      desc: 'The user wants a LIGHT MEAL - target 300-500 kcal. Suggest something satisfying but not heavy.',
      cal: 400, pro: 25, carbs: 35, fat: 15, type: 'lunch'
    },
    full:  {
      desc: 'The user wants a FULL, FILLING MEAL - target 500-800 kcal. Suggest something substantial that will keep them full for hours.',
      cal: 650, pro: 40, carbs: 60, fat: 20, type: 'dinner'
    },
  };
  const tier = FILLING_INSTRUCTIONS[fillingLevel] || FILLING_INSTRUCTIONS.full;

  const todaySummary = todayMeals.length === 0
    ? 'Nothing eaten yet today.'
    : todayMeals.map(m => {
        const items = Array.isArray(m.items) ? m.items.map(i => i.name).join(', ') : (m.notes || m.meal_type || 'meal');
        return `- ${m.meal_type || 'meal'}: ${items} (${m.total_calories || 0} kcal, P:${Math.round(m.total_protein||0)}g C:${Math.round(m.total_carbs||0)}g F:${Math.round(m.total_fat||0)}g)`;
      }).join('\n');

  const todayCalories = todayMeals.reduce((s, m) => s + (m.total_calories || 0), 0);
  const calorieGoal = userProfile.calorie_goal || userProfile.goal || 2000;
  const remainingCalories = calorieGoal - todayCalories;

  const byDate = {};
  for (const m of historyMeals) {
    const date = (m.meal_date || '').split('T')[0];
    if (!date) continue;
    if (!byDate[date]) byDate[date] = [];
    const items = Array.isArray(m.items) ? m.items.map(i => i.name).join(', ') : (m.notes || m.meal_type || 'meal');
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

WHAT THE USER ATE TODAY:
${todaySummary}

MEAL HISTORY (last 7 days):
${historySummary || 'No history available.'}

GREEK CUISINE CONTEXT:
- Common dishes: Souvlaki, Gyros, Moussaka, Pastitsio, Spanakopita, Tiropita, Fasolakia, Gemista, Briam, Gigantes, Tzatziki, Horiatiki salad, Feta, Greek Yogurt, Pita bread, Fakes (lentil soup), Kontosouvli, Dakos, etc.
- Account for generous use of olive oil and full-fat Greek dairy.
- Suggest something appropriate for the time of day.

FILLING LEVEL REQUIREMENT (CRITICAL - respect this above all):
${tier.desc}
WARNING: DO NOT exceed the target calories for this tier, even if the user's remaining daily calories are higher!

VARIETY REQUIREMENT:
- DO NOT suggest the exact same meals the user ate in the last 2 days.
- Ensure variety in protein sources (e.g. if they had chicken for lunch, suggest fish, beef, or vegetarian for dinner).
- Be creative and varied!

Respond ONLY with valid JSON, no markdown, no extra text.

JSON schema:
{
  "suggestion": "Specific meal name",
  "meal_type": "breakfast|lunch|dinner|snack",
  "reasoning": "2-3 sentence explanation",
  "estimated_calories": ${tier.cal},
  "estimated_protein": ${tier.pro},
  "estimated_carbs": ${tier.carbs},
  "estimated_fat": ${tier.fat},
  "alternatives": ["Alternative 1", "Alternative 2", "Alternative 3"]
}`;

  try {
    const isXai = groqKey.startsWith('xai-');
    const groq = new Groq({ 
      apiKey: groqKey,
      baseURL: isXai ? 'https://api.x.ai/v1' : undefined
    });
    const completion = await groq.chat.completions.create({
      model: isXai ? 'grok-2-latest' : 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return res.json(parsed);
  } catch (err) {
    console.error('Groq suggestion error:', err.message);
    return res.status(500).json({ error: 'Failed to generate suggestion. ' + err.message });
  }
});

export default router;
