import React, { useState, useCallback, ChangeEvent, useEffect } from 'react';
import { PhotoWithAnalysis, NonComplianceData } from '../types';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import ImagePreview from './ImagePreview';
import Spinner from './Spinner';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { StopIcon } from './icons/StopIcon';
import { CameraIcon } from './icons/CameraIcon';
import { TrashIcon } from './icons/TrashIcon';

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
    log: (message: string) => void;
}

// Komponenta pro textové pole s mikrofonem
const TextAreaWithMic: React.FC<{
    value: string;
    onChange: (value: string) => void;
    label: string;
    id: string;
    log: (message: string) => void;
    isOtherFieldRecording: boolean;
    onRecordingStateChange: (isRecording: boolean) => void;
}> = ({ value, onChange, label, id, log, isOtherFieldRecording, onRecordingStateChange }) => {
    
    const handleTranscription = useCallback((transcribedText: string) => {
        const newText = value ? `${value} ${transcribedText}`.trim() : transcribedText;
        onChange(newText);
    }, [value, onChange]);

    const { isRecording, isTranscribing, error, toggleRecording } = useAudioRecorder(handleTranscription, log);

    // Informujeme rodiče o změně stavu nahrávání
    useEffect(() => {
        onRecordingStateChange(isRecording || isTranscribing);
    }, [isRecording, isTranscribing, onRecordingStateChange]);

    const isLoading = isRecording || isTranscribing;
    const buttonIcon = isLoading ? (isRecording ? <StopIcon/> : <Spinner small/>) : <MicrophoneIcon/>;
    const buttonClass = isRecording ? 'bg-red-500' : 'bg-blue-500';

    return (
        <div className="relative">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <textarea
                id={id}
                rows={3}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md pr-12"
                placeholder={isRecording ? "Nahrávám..." : (isTranscribing ? "Přepisuji..." : "")}
                readOnly={isLoading}
            />
            <button 
                onClick={toggleRecording}
                disabled={isOtherFieldRecording}
                className={`absolute top-8 right-2 p-2 rounded-full text-white ${buttonClass} disabled:bg-gray-400`}
            >
                {buttonIcon}
            </button>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
};

const NonComplianceForm: React.FC<NonComplianceFormProps> = ({ data, onChange, onRemove, index, log }) => {
    const [isFindingRecording, setIsFindingRecording] = useState(false);
    const [isRecommendationRecording, setIsRecommendationRecording] = useState(false);

    const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
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
        // ... (kód pro analýzu fotek)
    };
    
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
            
            <TextAreaWithMic
                id={`finding-${index}`}
                label="Popis zjištěné neshody"
                value={data.finding}
                onChange={(value) => onChange('finding', value)}
                log={log}
                isOtherFieldRecording={isRecommendationRecording}
                onRecordingStateChange={setIsFindingRecording}
            />
            
            <TextAreaWithMic
                id={`recommendation-${index}`}
                label="Doporučené nápravné opatření"
                value={data.recommendation}
                onChange={(value) => onChange('recommendation', value)}
                log={log}
                isOtherFieldRecording={isFindingRecording}
                onRecordingStateChange={setIsRecommendationRecording}
            />

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
