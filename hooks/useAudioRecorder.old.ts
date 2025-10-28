import { useState, useRef, useCallback, useEffect } from 'react';
import { usePersistentState } from './usePersistentState';
import { transcribeAudio } from '../src/geminiService';
import { Part } from '@google/generative-ai';

// Helper funkce pro konverzi Blob na base64 Part
const blobToGenerativePart = async (blob: Blob): Promise<Part> => {
    const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
    return {
        inlineData: { mimeType: blob.type, data: base64Audio },
    };
};

export const useAudioRecorder = (onTranscriptionUpdate: (text: string) => void) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [log, setLog] = usePersistentState<string[]>('log', []);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // --- LOGOVÁNÍ ---
    const logMessage = useCallback((message: string) => {
        // Používáme funkci, abychom měli jistotu, že pracujeme s nejaktuálnějším stavem
        setLog(prevLog => {
            const now = new Date();
            const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
            const newMessage = `[${timestamp}] ${message}`;
            // Nový log se přidá na začátek pole
            return [newMessage, ...prevLog];
        });
    }, [setLog]);

    // --- UKLÍZECÍ FUNKCE ---
    const cleanup = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            logMessage("Stream a mikrofon byly uvolněny.");
        }
        if(recorderRef.current) {
            recorderRef.current = null;
             logMessage("Reference na rekordér byla vyčištěna.");
        }
        audioChunksRef.current = [];
    }, [logMessage]);

    // --- SPUŠTĚNÍ NAHRÁVÁNÍ ---
    const startRecording = useCallback(async () => {
        logMessage("Funkce startRecording zavolána.");
        if (isRecording || isTranscribing) {
            logMessage(`Nelze spustit: isRecording=${isRecording}, isTranscribing=${isTranscribing}.`);
            return;
        }
        
        setError(null);
        audioChunksRef.current = [];
        logMessage("Stav byl resetován pro nové nahrávání.");

        try {
            logMessage("Žádám o přístup k médiím (mikrofonu)...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            logMessage("Přístup k mikrofonu úspěšně udělen.");

            const mimeType = 'audio/webm';
            const recorder = new MediaRecorder(stream, { mimeType });
            recorderRef.current = recorder;
            logMessage(`MediaRecorder vytvořen s mimeType: ${mimeType}.`);

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    logMessage(`Přijat datový chunk o velikosti: ${event.data.size} bajtů.`);
                } else {
                    logMessage("Přijat prázdný datový chunk.");
                }
            };

            recorder.onstop = async () => {
                logMessage("MediaRecorder.onstop událost spuštěna.");
                setIsRecording(false);
                cleanup(); // Uvolníme mikrofon hned po zastavení

                if (audioChunksRef.current.length === 0) {
                    logMessage("Nebyly nahrány žádné audio data. Přepis se neprovádí.");
                    return;
                }
                
                setIsTranscribing(true);
                logMessage("Zahajuji proces přepisu...");
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                logMessage(`Vytvořen Blob o velikosti ${audioBlob.size} bajtů.`);

                try {
                    const audioPart = await blobToGenerativePart(audioBlob);
                    logMessage("Audio data byla převedena na base64 formát.");
                    const transcribedText = await transcribeAudio(audioPart);
                    logMessage(`PŘEPIS ÚSPĚŠNÝ: "${transcribedText}"`);
                    onTranscriptionUpdate(transcribedText);
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    logMessage(`CHYBA PŘI PŘEPISU: ${errorMessage}`);
                    setError('Chyba při komunikaci se službou pro přepis.');
                } finally {
                    setIsTranscribing(false);
                    logMessage("Proces přepisu dokončen.");
                }
            };

            recorder.onerror = (event) => {
                 const error = (event as any).error || new Error("Neznámá chyba MediaRecorder");
                 logMessage(`FATÁLNÍ CHYBA MediaRecorder: ${error.name} - ${error.message}`);
                 setError('Došlo k závažné chybě při nahrávání.');
                 cleanup();
                 setIsRecording(false);
                 setIsTranscribing(false);
            };

            recorder.start();
            setIsRecording(true);
            logMessage("Nahrávání bylo úspěšně spuštěno (recorder.start()).");

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            logMessage(`CHYBA PŘI STARTU NAHRÁVÁNÍ: ${errorMessage}`);
            setError('Nepodařilo se získat přístup k mikrofonu. Zkontrolujte oprávnění v prohlížeči.');
            cleanup();
            setIsRecording(false);
        }
    }, [logMessage, isRecording, isTranscribing, onTranscriptionUpdate, cleanup]);
    
    // --- ZASTAVENÍ NAHRÁVÁNÍ ---
    const stopRecording = useCallback(() => {
        logMessage("Funkce stopRecording zavolána.");
        if (recorderRef.current && recorderRef.current.state === "recording") {
            recorderRef.current.stop();
            logMessage("Příkaz k zastavení (recorder.stop()) byl odeslán.");
        } else {
             logMessage(`Nelze zastavit, stav rekordéru: ${recorderRef.current?.state ?? 'není inicializován'}.`);
        }
    }, [logMessage]);

    // --- PŘEPÍNAČ ---
    const toggleRecording = useCallback(() => {
        logMessage("toggleRecording zavoláno.");
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }, [isRecording, startRecording, stopRecording]);

    // --- ČIŠTĚNÍ PŘI ODMONTOVÁNÍ KOMPONENTY ---
    useEffect(() => {
        return () => {
             logMessage("Komponenta se odmontovává, provádím finální úklid.");
             cleanup();
        }
    }, [cleanup, logMessage]);

    return { isRecording, isTranscribing, error, log, toggleRecording, clearLog: () => setLog([]) };
};
