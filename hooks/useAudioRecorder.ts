import { useState, useRef, useCallback, useEffect } from 'react';
import { usePersistentState } from './usePersistentState';

export const useAudioRecorder = (onTranscriptionUpdate: (text: string) => void) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [log, setLog] = usePersistentState<string[]>('log', []);
    
    const socketRef = useRef<WebSocket | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    
    const logMessage = useCallback((message: string) => {
        const now = new Date();
        const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        setLog(prev => [`[${timestamp}] ${message}`, ...prev]);
    }, [setLog]);
    
    
    const stopRecording = useCallback(() => {
        logMessage('Příkaz k zastavení nahrávání.');
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.close();
        }
    }, [logMessage]);
    
    const startRecording = useCallback(async () => {
        logMessage('Spouštím nahrávání a navazuji WebSocket spojení...');
        setIsRecording(true);
        setError(null);
        
        try {
            logMessage('Žádám o přístup k mikrofonu...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            logMessage('Přístup k mikrofonu udělen.');
            
            socketRef.current = new WebSocket('ws://localhost:3001');
            
            socketRef.current.onopen = () => {
                logMessage('WebSocket spojení navázáno.');
                recorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                
                recorderRef.current.ondataavailable = event => {
                    if (event.data.size > 0 && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                        socketRef.current.send(event.data);
                    }
                };
                
                recorderRef.current.onstop = () => {
                    logMessage('Nahrávání fyzicky zastaveno. Ukončuji stream.');
                    setIsRecording(false);
                    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                        socketRef.current.close();
                    }
                };
                
                recorderRef.current.start(500); // Posíláme data každých 500ms
                logMessage('Nahrávání spuštěno, posílám data...');
            };
            
            socketRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'final') {
                    onTranscriptionUpdate(data.text);
                    setIsTranscribing(false);
                } else if (data.type === 'interim') {
                    // Můžete zpracovat i průběžné výsledky
                }
            };
            
            socketRef.current.onclose = () => {
                logMessage('WebSocket spojení uzavřeno.');
                if (isRecording) {
                    stopRecording();
                }
            };
            
            socketRef.current.onerror = (event) => {
                logMessage(`CHYBA WebSocketu: ${JSON.stringify(event)}`);
                setError('Chyba WebSocket spojení.');
                if (isRecording) {
                    stopRecording();
                }
            };
            
        } catch (err) {
            logMessage(`CHYBA při startu nahrávání: ${err}`);
            setError('Nepodařilo se získat přístup k mikrofonu.');
            if (socketRef.current) socketRef.current.close();
        }
    }, [logMessage, onTranscriptionUpdate, isRecording, stopRecording]);
    
    const toggleRecording = useCallback(() => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }, [isRecording, startRecording, stopRecording]);
    
    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (isRecording) {
                stopRecording();
            }
        };
    }, [isRecording, stopRecording]);
    
    return { isRecording, isTranscribing, error, log, toggleRecording, clearLog: () => setLog([]) };
};