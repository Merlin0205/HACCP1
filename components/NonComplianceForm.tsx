import React, { useState, useCallback, ChangeEvent, useRef } from 'react';
import { PhotoWithAnalysis, NonComplianceData, AIResponse } from '../types';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import ImagePreview from './ImagePreview';
import Spinner from './Spinner';
import MicrophoneIcon from './icons/MicrophoneIcon';
import StopIcon from './icons/StopIcon';
import { CameraIcon } from './icons/CameraIcon';
import TrashIcon from './icons/TrashIcon';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

interface NonComplianceFormProps {
    data: NonComplianceData;
    onChange: (field: keyof NonComplianceData, value: string | PhotoWithAnalysis[]) => void;
    onRemove: () => void;
    index: number;
}

const NonComplianceForm: React.FC<NonComplianceFormProps> = ({ data, onChange, onRemove, index }) => {
    const [activeDictationField, setActiveDictationField] = useState<'finding' | 'recommendation' | null>(null);

    const handleTranscriptionComplete = useCallback(async (response: AIResponse<string>) => {
        if (!activeDictationField) return;
        
        const { result: transcript } = response;
        if (transcript) {
            const existingText = data[activeDictationField] || '';
            const newText = existingText ? `${existingText} ${transcript}` : transcript;
            onChange(activeDictationField, newText);
        }
        setActiveDictationField(null);
    }, [activeDictationField, data, onChange]);
    
    const log = useCallback((message: string) => {
        // console.log(message); // Logging can be enabled for debugging
    }, []);

    const { isRecording, isProcessing: isProcessingAudio, startRecording, stopRecording } = useAudioRecorder(handleTranscriptionComplete, log);
    
    const handleDictationRequest = (field: 'finding' | 'recommendation') => {
        if (isRecording) {
            stopRecording();
            setActiveDictationField(null);
        } else {
            setActiveDictationField(field);
            startRecording();
        }
    };

    const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newPhotos: PhotoWithAnalysis[] = [...data.photos];
            for (const file of files) {
                try {
                    const base64 = await fileToBase64(file);
                    newPhotos.push({ file, base64 });
                } catch (error) {
                    console.error("Error converting file to base64:", error);
                }
            }
            onChange('photos', newPhotos);
        }
    };
    
    const removePhoto = (photoIndex: number) => {
        onChange('photos', data.photos.filter((_, i) => i !== photoIndex));
    };

    const handleAnalyzePhoto = async (photoIndex: number) => {
        const photos = [...data.photos];
        const photoToAnalyze = photos[photoIndex];
        if (!photoToAnalyze || photoToAnalyze.isAnalyzing || !photoToAnalyze.base64 || !photoToAnalyze.file) return;
    
        photos[photoIndex] = { ...photoToAnalyze, isAnalyzing: true };
        onChange('photos', photos);
    
        try {
            const mimeType = photoToAnalyze.file.type;
            const response = await fetch('http://localhost:9000/api/analyze-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: photoToAnalyze.base64,
                    mimeType: mimeType
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const analysisResponse: AIResponse<string> = await response.json();
            const analysisResult = analysisResponse.result;

            const currentPhotos = [...photos];
            currentPhotos[photoIndex] = { ...photoToAnalyze, analysis: analysisResult, isAnalyzing: false, base64: photoToAnalyze.base64 };
            onChange('photos', currentPhotos);
    
        } catch (error) {
            console.error("Image analysis failed:", error);
            const currentPhotos = [...photos];
            const errorMessage = error instanceof Error ? error.message : "Analýza se nezdařila.";
            currentPhotos[photoIndex] = { ...photoToAnalyze, analysis: `<p class="text-red-600 font-bold">${errorMessage}</p>`, isAnalyzing: false, base64: photoToAnalyze.base64 };
            onChange('photos', currentPhotos);
        }
    };
    
    const isThisDictating = (field: 'finding' | 'recommendation') => isRecording && activeDictationField === field;
    const isThisProcessing = (field: 'finding' | 'recommendation') => isProcessingAudio && activeDictationField === field;

    return (
        <div className="p-4 border bg-white rounded-md shadow-sm space-y-4 relative mt-2">
             <div className="flex justify-between items-center">
                <h4 className="font-semibold text-gray-700">Detail neshody #{index + 1}</h4>
                <button 
                    onClick={onRemove} 
                    className="p-1.5 text-gray-500 hover:bg-red-100 hover:text-red-600 rounded-full"
                    aria-label="Smazat neshodu"
                >
                    <TrashIcon />
                </button>
            </div>
            <div>
                <label htmlFor={`location-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Místo neshody</label>
                <input
                    id={`location-${index}`}
                    type="text"
                    value={data.location}
                    onChange={e => onChange('location', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md"
                    placeholder="např. kuchyň, sklad, WC"
                />
            </div>
             <div className="relative">
                <label htmlFor={`finding-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Popis zjištěné neshody</label>
                <textarea
                    id={`finding-${index}`}
                    rows={3}
                    value={data.finding}
                    onChange={e => onChange('finding', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md pr-12"
                    placeholder={isThisDictating('finding') ? "Nahrávám..." : (isThisProcessing('finding') ? "Zpracovávám..." : "")}
                    readOnly={isThisDictating('finding') || isThisProcessing('finding')}
                />
                <button onClick={() => handleDictationRequest('finding')} className={`absolute top-8 right-2 p-2 rounded-full ${isThisDictating('finding') ? 'bg-red-500' : 'bg-blue-500'} text-white`}>
                    {isThisProcessing('finding') ? <Spinner small/> : isThisDictating('finding') ? <StopIcon/> : <MicrophoneIcon/>}
                </button>
            </div>
             <div className="relative">
                <label htmlFor={`recommendation-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Doporučené nápravné opatření</label>
                <textarea
                    id={`recommendation-${index}`}
                    rows={3}
                    value={data.recommendation}
                    onChange={e => onChange('recommendation', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md pr-12"
                    placeholder={isThisDictating('recommendation') ? "Nahrávám..." : (isThisProcessing('recommendation') ? "Zpracovávám..." : "")}
                    readOnly={isThisDictating('recommendation') || isThisProcessing('recommendation')}
                />
                <button onClick={() => handleDictationRequest('recommendation')} className={`absolute top-8 right-2 p-2 rounded-full ${isThisDictating('recommendation') ? 'bg-red-500' : 'bg-blue-500'} text-white`}>
                    {isThisProcessing('recommendation') ? <Spinner small/> : isThisDictating('recommendation') ? <StopIcon/> : <MicrophoneIcon/>}
                </button>
            </div>
            <div>
                <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-colors">
                    <CameraIcon />
                    <span className="ml-3 font-medium text-gray-600">Přidat fotky</span>
                    <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
                </label>
                <ImagePreview photos={data.photos} onRemove={removePhoto} onAnalyze={handleAnalyzePhoto} />
            </div>
        </div>
    );
};

export default NonComplianceForm;
