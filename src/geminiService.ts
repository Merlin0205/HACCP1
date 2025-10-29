import { GoogleGenerativeAI, Part } from "@google/generative-ai";

// Načtení API klíče z proměnných prostředí
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Modely se načítají z API místo .env
let imageModelName: string | null = null;
let textModelName: string | null = null;
let audioModelName: string | null = null;
let modelsLoaded = false;

// Inicializace hlavní třídy pro interakci s Gemini API
const genAI = new GoogleGenerativeAI(apiKey);

// Promise pro načítání modelů
const modelsPromise = (async () => {
  try {
    const response = await fetch('/api/ai-models-config');
    if (response.ok) {
      const config = await response.json();
      imageModelName = config.models['image-analysis'];
      textModelName = config.models['text-generation'];
      audioModelName = config.models['audio-transcription'];
      modelsLoaded = true;
      console.log('[GEMINI] Načtené modely:', { imageModelName, textModelName, audioModelName });
    }
  } catch (error) {
    console.error('[GEMINI] Chyba při načítání modelů:', error);
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
    
    // Zalogovat usage na server
    try {
      const usage = response.usageMetadata;
      if (usage && (usage.totalTokenCount || usage.promptTokenCount)) {
        await fetch('/api/log-ai-usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: audioModelName,
            operation: 'audio-transcription',
            promptTokens: usage.promptTokenCount || 0,
            completionTokens: usage.candidatesTokenCount || 0,
            totalTokens: usage.totalTokenCount || (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0)
          })
        });
      }
    } catch (logError) {
      console.error('Chyba při logování usage:', logError);
      // Pokračujeme i když se logování nezdaří
    }
    
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
    
    // Zalogovat usage na server
    try {
      const usage = result.response.usageMetadata;
      if (usage && (usage.totalTokenCount || usage.promptTokenCount)) {
        await fetch('/api/log-ai-usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: imageModelName,
            operation: 'image-analysis',
            promptTokens: usage.promptTokenCount || 0,
            completionTokens: usage.candidatesTokenCount || 0,
            totalTokens: usage.totalTokenCount || (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0)
          })
        });
      }
    } catch (logError) {
      console.error('Chyba při logování usage:', logError);
    }
    
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
