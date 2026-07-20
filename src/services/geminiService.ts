import { GoogleGenAI, Type } from "@google/genai";
import { MusicInfo } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeVideoForMusic(videoBase64: string, mimeType: string): Promise<MusicInfo[]> {
  const model = "gemini-3.1-pro-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: videoBase64,
              mimeType: mimeType,
            },
          },
          {
            text: "Analyze this video and extract a list of all songs played. For each song, identify the timestamp (start time), the name of the song, and the author/artist. Return the data as a JSON array of objects with keys: 'time', 'name', and 'author'.",
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            time: { type: Type.STRING, description: "Timestamp when the song starts (e.g., 0:45)" },
            name: { type: Type.STRING, description: "Name of the song" },
            author: { type: Type.STRING, description: "Author or artist of the song" },
          },
          required: ["time", "name", "author"],
        },
      },
    },
  });

  try {
    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    return [];
  }
}

export async function chatWithGemini(messages: { role: 'user' | 'model', parts: { text: string }[] }[]) {
  const model = "gemini-3.1-pro-preview";
  const chat = ai.chats.create({
    model,
    config: {
      systemInstruction: "Você é um assistente prestativo para o KEEP ECAD, uma ferramenta que extrai informações de músicas de vídeos para relatórios ECAD. Você ajuda os usuários a entender como usar a ferramenta, explica os resultados ou responde a perguntas gerais sobre música, direitos autorais (como ECAD no Brasil) e processamento de vídeo. Responda sempre em português.",
    },
  });

  // The chat.sendMessage only accepts a string message, but we can initialize history if needed.
  // However, for simplicity in this turn-based UI, we'll just send the last message or use a proper chat object.
  // Let's use the chat object properly.
  
  const lastMessage = messages[messages.length - 1].parts[0].text;
  const response = await chat.sendMessage({ message: lastMessage });
  return response.text;
}
