import { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeAudio } from '../src/geminiService';
import { Part } from '@google/generative-ai';

// --- Pomocná funkce pro převod audia na base64 ---
const blobToGenerativePart = async (blob: Blob): Promise<Part> => {
    const reader = new FileReader();
    const promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
    reader.readAsDataURL(blob);
    return { inlineData: { mimeType: blob.type, data: await promise } };
};

/**
 * Hook pro nahrávání zvuku, PŘEPRACOVANÝ pro použití externí logovací funkce.
 */
export const useAudioRecorder = (
    onTranscriptionComplete: (text: string) => void,
    // Přijímáme funkci pro logování zvenčí
    logMessage: (message: string) => void
) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const cleanup = useCallback(() => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
            logMessage("PROSTŘEDKY: Mikrofon uvolněn.");
        }
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
    }, [logMessage]);

    const stopRecording = useCallback(() => {
        logMessage("AKCE: Požadavek na zastavení nahrávání.");
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        } else {
            logMessage("VAROVÁNÍ: Nelze zastavit, nahrávání neběží.");
        }
    }, [logMessage]);
    
    const startRecording = useCallback(async () => {
        logMessage("AKCE: Požadavek na spuštění nahrávání.");
        setError(null);
        audioChunksRef.current = [];

        try {
            logMessage("INFO: Žádám o přístup k mikrofonu...");
            if (!navigator?.mediaDevices?.getUserMedia) {
                throw new Error('Tento prohlížeč nepodporuje nahrávání zvuku.');
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            logMessage("ÚSPĚCH: Přístup k mikrofonu udělen.");

            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            recorder.onstop = async () => {
                logMessage("STAV: Nahrávání fyzicky zastaveno.");
                setIsRecording(false);

                if (audioChunksRef.current.length === 0) {
                    logMessage("VAROVÁNÍ: Nebyla nahrána žádná data.");
                    cleanup();
                    return;
                }

                setIsTranscribing(true);
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                try {
                    logMessage("PŘEPIS: Odesílám data na server...");
                    const audioPart = await blobToGenerativePart(audioBlob);
                    const transcribedText = await transcribeAudio(audioPart);
                    logMessage(`ÚSPĚCH: Přepis dokončen: "${transcribedText}"`);
                    onTranscriptionComplete(transcribedText);
                } catch (e) {
                    const errorMsg = e instanceof Error ? e.message : String(e);
                    logMessage(`CHYBA: Přepis selhal - ${errorMsg}`);
                    // Zobrazit uživateli konkrétní důvod (např. 429 přetížení z AI SDK),
                    // jinak fallback na obecnou hlášku
                    setError(errorMsg || "Přepis selhal.");
                } finally {
                    setIsTranscribing(false);
                    cleanup();
                }
            };

            recorder.start();
            setIsRecording(true);
            logMessage("STAV: Nahrávání běží.");

        } catch (e) {
            const errAny = e as any;
            const errorMsg = e instanceof Error ? e.message : String(e);
            logMessage(`CHYBA: Start nahrávání selhal - ${errorMsg}`);

            // Přátelštější hlášky pro běžné případy
            if (errAny?.name === 'NotAllowedError' || errAny?.name === 'PermissionDeniedError') {
                setError('Přístup k mikrofonu byl zamítnut. Povolte mikrofon v nastavení prohlížeče.');
            } else if (errAny?.name === 'NotFoundError' || errAny?.name === 'DevicesNotFoundError') {
                setError('Nebyl nalezen žádný mikrofon.');
            } else if (errAny?.name === 'NotReadableError') {
                setError('Mikrofon je právě používán jinou aplikací.');
            } else {
                setError(errorMsg || "Nepodařilo se spustit nahrávání.");
            }
            cleanup();
        }
    }, [logMessage, onTranscriptionComplete, cleanup]);

    const toggleRecording = useCallback(() => {
        if (isRecording) stopRecording();
        else if (!isTranscribing) startRecording();
    }, [isRecording, isTranscribing, startRecording, stopRecording]);

    useEffect(() => cleanup, [cleanup]);

    // Vracíme pouze stavy, logování je řízeno zvenčí
    return { isRecording, isTranscribing, error, toggleRecording };
};
