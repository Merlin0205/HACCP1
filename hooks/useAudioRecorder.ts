
import { useState, useRef, useCallback } from 'react';
import { transcribeAudioWithAI } from '../services/geminiService';
import { AIResponse } from '../types';

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (reader.result) {
                const base64data = reader.result as string;
                resolve(base64data.split(',')[1]);
            } else {
                reject(new Error("Failed to read blob as base64."));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
    });
};

export const useAudioRecorder = (
  onTranscriptionComplete: (response: AIResponse<string>) => Promise<void>,
  log: (message: string) => void
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        log("Uživatel zastavil nahrávání.");
        mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    setIsRecording(false);
  }, [log]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    
    setError(null);
    try {
      log("Žádám o přístup k mikrofonu...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      log("Přístup k mikrofonu udělen.");
      streamRef.current = stream;
      const mimeType = 'audio/webm'; // Use a common, well-supported format.
      
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        log("Nahrávání dokončeno, zpracovávám...");
        if (audioChunksRef.current.length === 0) {
            log("Nebyly nahrány žádné audio data. Přepis se neprovádí.");
            setIsProcessing(false);
            return;
        }
        setIsProcessing(true);
        setError(null);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];
        
        try {
            log("Převádím audio na Base64...");
            const base64Audio = await blobToBase64(audioBlob);
            log(`Převod dokončen (${(audioBlob.size / 1024).toFixed(1)} kB). Odesílám k přepisu...`);
            const response = await transcribeAudioWithAI(base64Audio, mimeType);
            log("Přepis úspěšně přijat.");
            await onTranscriptionComplete(response);
        } catch (e) {
            console.error("Transcription process failed:", e);
            const errorMessage = e instanceof Error ? e.message : "Zpracování nahrávky se nezdařilo.";
            log(`CHYBA PŘI PŘEPISU: ${errorMessage}`);
            setError(errorMessage);
        } finally {
            setIsProcessing(false);
            log("Zpracování dokončeno.");
        }
      };

      recorder.start();
      setIsRecording(true);
      log("Nahrávání spuštěno...");

    } catch (e) {
      console.error("Failed to start recording:", e);
      const errMessage = e instanceof Error ? e.message : "Neznámá chyba";
      log(`Chyba při startu nahrávání: ${errMessage}`);
      setError("Nepodařilo se získat přístup k mikrofonu.");
      setIsRecording(false);
    }
  }, [isRecording, onTranscriptionComplete, log]);
  
  return { isRecording, isProcessing, startRecording, stopRecording, error };
};
