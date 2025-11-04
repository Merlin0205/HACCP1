/**
 * Gemini Service - wrapper pro Cloud Functions
 * Všechna AI volání jdou přes Cloud Functions, kde jsou bezpečně uložené API klíče
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';
import { Part } from "@google/generative-ai";

// Cloud Function references
const transcribeAudioFunction = httpsCallable(functions, 'transcribeAudio');
const analyzeImageFunction = httpsCallable(functions, 'analyzeImage');
const generateTextFunction = httpsCallable(functions, 'generateText');

/**
 * Převod Part na base64 string pro Cloud Functions
 */
function partToBase64(part: Part): { data: string; mimeType: string } {
  if (part.inlineData) {
    return {
      data: part.inlineData.data,
      mimeType: part.inlineData.mimeType || 'application/octet-stream'
    };
  }
  throw new Error('Unsupported part format - only inlineData is supported');
}

// --- FUNKCE PRO PŘEPIS ZVUKU ---
/**
 * Převede zvuková data na text přes Cloud Functions.
 * @param audioPart Zvuková data ve formátu, kterému Gemini rozumí.
 * @returns Přepsaný text.
 */
export const transcribeAudio = async (audioPart: Part): Promise<string> => {
  try {
    const { data, mimeType } = partToBase64(audioPart);
    
    const result = await transcribeAudioFunction({
      audioData: data,
      mimeType: mimeType || 'audio/webm'
    });
    
    const response = result.data as any;
    return response.transcription || '';
  } catch (error: any) {
    console.error("[transcribeAudio] Chyba při komunikaci s Cloud Functions:", error);
    throw new Error(error.message || "Nepodařilo se přepsat audio.");
  }
};

// --- FUNKCE PRO ANALÝZU OBRAZKŮ ---
export const analyzeImageWithAI = async (photo: Part): Promise<string> => {
  try {
    const { data, mimeType } = partToBase64(photo);
    
    const result = await analyzeImageFunction({
      imageData: data,
      mimeType: mimeType || 'image/jpeg'
    });
    
    const response = result.data as any;
    return response.analysis || '';
  } catch (error: any) {
    console.error("[analyzeImageWithAI] Chyba při komunikaci s Cloud Functions:", error);
    throw new Error(error.message || "Nepodařilo se analyzovat obrázek.");
  }
};

// --- FUNKCE PRO GENEROVÁNÍ TEXTU ---
export const generateReportConclusionWithAI = async (summary: string): Promise<string> => {
  try {
    const prompt = `Na základě následujícího souhrnu neshod z HACCP auditu vygeneruj profesionální slovní hodnocení a závěr. Zdůrazni hlavní problematické oblasti a navrhni obecná doporučení. Celý text formuluj jako jeden odstavec. Souhrn neshod: ${summary}`;
    
    const result = await generateTextFunction({
      prompt,
      operation: 'text-generation'
    });
    
    const response = result.data as any;
    return response.text || '';
  } catch (error: any) {
    console.error("[generateReportConclusionWithAI] Chyba při komunikaci s Cloud Functions:", error);
    throw new Error(error.message || "Nepodařilo se vygenerovat závěr.");
  }
};
