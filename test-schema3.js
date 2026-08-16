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
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'How many calories in an apple? Return JSON.',
      config: {
        responseMimeType: 'application/json',
        responseSchema: mealSchema
      }
    });
    console.log("SUCCESS:", response.text);
  } catch (err) {
    console.error("ERROR config:", err.message);
  }
}

test();
