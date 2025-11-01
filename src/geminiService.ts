import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { fetchAIModelsConfig } from "../services/firestore/settings";

// Načtení API klíče z proměnných prostředí
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Modely se načítají z Firestore místo API
let imageModelName: string | null = null;
let textModelName: string | null = null;
let audioModelName: string | null = null;
let modelsLoaded = false;

// Inicializace hlavní třídy pro interakci s Gemini API
const genAI = new GoogleGenerativeAI(apiKey);

// Promise pro načítání modelů
const modelsPromise = (async () => {
  try {
    const config = await fetchAIModelsConfig();
    imageModelName = config.models['image-analysis'] || null;
    textModelName = config.models['text-generation'] || null;
    audioModelName = config.models['audio-transcription'] || null;
    modelsLoaded = true;
    console.log('[GEMINI] Načtené modely:', { imageModelName, textModelName, audioModelName });
  } catch (error) {
    console.error('[GEMINI] Chyba při načítání modelů:', error);
    // Fallback na default modely
    audioModelName = 'gemini-2.0-flash-exp';
    modelsLoaded = true;
  }
})();

// Funkce která zajistí že modely jsou načtené
async function ensureModelsLoaded() {
  if (!modelsLoaded) {
    await modelsPromise;
  }
}

// --- FUNKCE PRO PŘEPIS ZVUKU ---
/**
 * Převede zvuková data na text.
 * @param audioPart Zvuková data ve formátu, kterému Gemini rozumí.
 * @returns Přepsaný text.
 */
export const transcribeAudio = async (audioPart: Part): Promise<string> => {
  // Počkat na načtení modelů
  await ensureModelsLoaded();
  
  if (!audioModelName) {
    throw new Error("Model pro přepis audia není nakonfigurován. Zkontrolujte aiModelsConfig.json");
  }
  const model = genAI.getGenerativeModel({ model: audioModelName });

  const prompt = "Proveďte přímý přepis následujícího zvukového záznamu na text. Neodpovídejte celou větou, neformátujte text, neuvádějte žádný doprovodný text ani poznámky. Vraťte pouze samotný přepis.";

  try {
    const result = await model.generateContent([prompt, audioPart]);
    const response = result.response;
    const text = response.text();
    
    // Poznámka: Logování usage se nyní dělá v Cloud Functions při použití transcribeAudio Cloud Function
    // Pokud používáte tuto frontend verzi, logování není dostupné
    
    return text.trim();
  } catch (error) {
    console.error("Chyba při komunikaci s Gemini API:", error);
    throw new Error("Nepodařilo se přepsat audio.");
  }
};

// --- Ostatní funkce zůstávají beze změny ---

export const analyzeImageWithAI = async (photo: Part): Promise<string> => {
    // Počkat na načtení modelů
    await ensureModelsLoaded();
    
    if (!imageModelName) {
        throw new Error("Model pro analýzu obrázků není nakonfigurován. Zkontrolujte aiModelsConfig.json");
    }
    const model = genAI.getGenerativeModel({ model: imageModelName });
    const prompt = "Analyzuj tuto fotografii z potravinářského provozu. Popiš, co na ní je, a identifikuj případná hygienická rizika nebo neshody s HACCP. Buď stručný a věcný.";
    const result = await model.generateContent([prompt, photo]);
    
    // Poznámka: Logování usage se nyní dělá v Cloud Functions
    // Pokud používáte tuto frontend verzi, logování není dostupné
    
    return result.response.text();
};

export const generateReportConclusionWithAI = async (summary: string): Promise<string> => {
    // Počkat na načtení modelů
    await ensureModelsLoaded();
    
    if (!textModelName) {
        throw new Error("Model pro generování textu není nakonfigurován. Zkontrolujte aiModelsConfig.json");
    }
    const model = genAI.getGenerativeModel({ model: textModelName });
    const prompt = `Na základě následujícího souhrnu neshod z HACCP auditu vygeneruj profesionální slovní hodnocení a závěr. Zdůrazni hlavní problematické oblasti a navrhni obecná doporučení. Celý text formuluj jako jeden odstavec. Souhrn neshod: ${summary}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
};
