
import { GoogleGenAI, Type } from "@google/genai";

export const analyzeImage = async (base64Image: string, fileName: string) => {
  // Obtain API key exclusively from environment variable as per guidelines
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key not found. Please select an API key.");
  }

  // Create a new instance right before making an API call for up-to-date key information
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      // Using gemini-3-flash-preview for efficient multimodal analysis
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1],
            },
          },
          {
            text: `Analyze this image named "${fileName}". Provide a JSON response with:
            1. "title": A concise, descriptive title.
            2. "tags": An array of 5 relevant keywords.
            3. "description": A 1-sentence summary of the image content.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            description: { type: Type.STRING },
          },
          required: ["title", "tags", "description"],
        },
      },
    });

    // Directly access the text property from the response (not a method call)
    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("AI Analysis failed:", error);
    // Re-throw the error to be handled by the UI (e.g., for key re-selection logic)
    throw error;
  }
};
