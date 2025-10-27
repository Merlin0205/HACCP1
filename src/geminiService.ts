import { GoogleGenerativeAI, Part } from '@google/generative-ai';

// Načtení API klíče a názvů modelů z Vite environment proměnných
const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
const imageModelName = import.meta.env.VITE_MODEL_IMAGE_ANALYSIS as string;
const audioModelName = import.meta.env.VITE_MODEL_AUDIO_TRANSCRIPTION as string;

// Kontrola, zda jsou proměnné definovány
if (!apiKey || !imageModelName || !audioModelName) {
  throw new Error("Chybí konfigurace pro Gemini v souboru .env. Zkontrolujte proměnné VITE_GEMINI_API_KEY, VITE_MODEL_IMAGE_ANALYSIS a VITE_MODEL_AUDIO_TRANSCRIPTION.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Specifické modely pro jednotlivé úkoly
const imageModel = genAI.getGenerativeModel({ model: imageModelName });
const audioModel = genAI.getGenerativeModel({ model: audioModelName });

/**
 * Analyzes an image and returns a description.
 * @param imagePart The image data to analyze.
 * @returns A promise that resolves to the generated text description.
 */
export const analyzeImage = async (imagePart: Part): Promise<string> => {
  const prompt = "Popiš, co je na tomto obrázku. Identifikuj možné hygienické problémy v potravinářském provozu. Buď stručný a věcný.";
  const result = await imageModel.generateContent([prompt, imagePart]);
  const response = await result.response;
  return response.text();
};

/**
 * Transcribes an audio file.
 * @param audioPart The audio data to transcribe.
 * @returns A promise that resolves to the transcribed text.
 */
export const transcribeAudio = async (audioPart: Part): Promise<string> => {
  const prompt = "Převeď tento zvukový záznam na text. Jedná se o diktát z hygienického auditu, text přepiš jako souvislou větu nebo několik vět.";
  const result = await audioModel.generateContent([prompt, audioPart]);
  const response = await result.response;
  return response.text();
};
