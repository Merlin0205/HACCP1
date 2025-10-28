import { GoogleGenerativeAI, Part } from "@google/generative-ai";

// Načtení API klíče a názvů modelů z proměnných prostředí
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const imageModelName = import.meta.env.VITE_MODEL_IMAGE_ANALYSIS;
const textModelName = import.meta.env.VITE_MODEL_TEXT_GENERATION;
const audioModelName = import.meta.env.VITE_MODEL_AUDIO_TRANSCRIPTION;

// Inicializace hlavní třídy pro interakci s Gemini API
const genAI = new GoogleGenerativeAI(apiKey);

// --- FUNKCE PRO PŘEPIS ZVUKU ---
/**
 * Převede zvuková data na text.
 * @param audioPart Zvuková data ve formátu, kterému Gemini rozumí.
 * @returns Přepsaný text.
 */
export const transcribeAudio = async (audioPart: Part): Promise<string> => {
  if (!audioModelName) {
    throw new Error("Název modelu pro přepis audia není nastaven v .env souboru.");
  }
  const model = genAI.getGenerativeModel({ model: audioModelName });

  const prompt = "Proveďte přímý přepis následujícího zvukového záznamu na text. Neodpovídejte celou větou, neformátujte text, neuvádějte žádný doprovodný text ani poznámky. Vraťte pouze samotný přepis.";

  try {
    const result = await model.generateContent([prompt, audioPart]);
    const response = result.response;
    const text = response.text();
    return text.trim();
  } catch (error) {
    console.error("Chyba při komunikaci s Gemini API:", error);
    throw new Error("Nepodařilo se přepsat audio.");
  }
};

// --- Ostatní funkce zůstávají beze změny ---

export const analyzeImageWithAI = async (photo: Part): Promise<string> => {
    if (!imageModelName) {
        throw new Error("VITE_MODEL_IMAGE_ANALYSIS is not defined in .env");
    }
    const model = genAI.getGenerativeModel({ model: imageModelName });
    const prompt = "Analyzuj tuto fotografii z potravinářského provozu. Popiš, co na ní je, a identifikuj případná hygienická rizika nebo neshody s HACCP. Buď stručný a věcný.";
    const result = await model.generateContent([prompt, photo]);
    return result.response.text();
};

export const generateReportConclusionWithAI = async (summary: string): Promise<string> => {
    if (!textModelName) {
        throw new Error("VITE_MODEL_TEXT_GENERATION is not defined in .env");
    }
    const model = genAI.getGenerativeModel({ model: textModelName });
    const prompt = `Na základě následujícího souhrnu neshod z HACCP auditu vygeneruj profesionální slovní hodnocení a závěr. Zdůrazni hlavní problematické oblasti a navrhni obecná doporučení. Celý text formuluj jako jeden odstavec. Souhrn neshod: ${summary}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
};
