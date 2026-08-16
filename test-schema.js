import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const mealSchema = {
    type: "object",
    properties: {
      calories: { type: "integer" }
    }
  };

  try {
    const interaction = await ai.interactions.create({
      model: 'gemini-3.6-flash',
      input: [
        {
          type: 'user_input',
          content: [{ type: 'text', text: 'How many calories in an apple? Return JSON.' }]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: mealSchema
      }
    });
    console.log("SUCCESS:", interaction.output_text);
  } catch (err) {
    console.error("ERROR config:", err.message);
  }
}

test();
