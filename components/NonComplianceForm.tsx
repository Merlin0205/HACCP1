import React, { useState, useCallback, ChangeEvent, useRef } from 'react';
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

const NonComplianceForm: React.FC<NonComplianceFormProps> = ({ data, onChange, onRemove, index, log }) => {
    const [activeDictationField, setActiveDictationField] = useState<'finding' | 'recommendation' | null>(null);
    const baseTextRef = useRef<string>(""); 
    const finalTranscriptRef = useRef<string>("");

    const handleTranscriptionUpdate = useCallback((transcript: string, isFinal: boolean) => {
        if (!activeDictationField) return;
        
        const newText = baseTextRef.current ? `${baseTextRef.current} ${transcript}`.trim() : transcript;
        onChange(activeDictationField, newText);

        if (isFinal) {
            finalTranscriptRef.current = newText;
        }
    }, [activeDictationField, onChange]);

    const { isRecording, isTranscribing, toggleRecording } = useAudioRecorder(handleTranscriptionUpdate, log);
    
    const handleDictationRequest = (field: 'finding' | 'recommendation') => {
        if (isTranscribing && !isRecording) return;

        if (isRecording) {
            toggleRecording();
        } 
        else {
            setActiveDictationField(field);
            baseTextRef.current = data[field]; 
            finalTranscriptRef.current = data[field];
            toggleRecording();
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
        // ... kód pro analýzu fotek ...
    };
    
    const getButtonState = (field: 'finding' | 'recommendation') => {
        const isThisActive = activeDictationField === field;

        if (isThisActive && isTranscribing) {
            return { disabled: true, icon: <Spinner small/>, text: "Přepisuji...", className: 'bg-gray-400' };
        }
        if (isThisActive && isRecording) {
            return { disabled: false, icon: <StopIcon/>, text: "Nahrávám...", className: 'bg-red-500' };
        }
        const isOtherFieldActive = (isRecording || isTranscribing) && !isThisActive;
        return { disabled: isOtherFieldActive, icon: <MicrophoneIcon/>, text: "", className: 'bg-blue-500' };
    };

    const renderTextareaAndButton = (field: 'finding' | 'recommendation', label: string) => {
        const state = getButtonState(field);
        return (
             <div className="relative">
                <label htmlFor={`${field}-${index}`} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <textarea
                    id={`${field}-${index}`}
                    rows={3}
                    value={data[field]}
                    onChange={e => onChange(field, e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md pr-12"
                    placeholder={state.text}
                    readOnly={state.disabled || state.text === "Nahrávám..."}
                />
                <button 
                    onClick={() => handleDictationRequest(field)}
                    disabled={state.disabled}
                    className={`absolute top-8 right-2 p-2 rounded-full text-white ${state.className} disabled:bg-gray-400`}
                >
                    {state.icon}
                </button>
            </div>
        );
    }

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
            
            {renderTextareaAndButton('finding', 'Popis zjištěné neshody')}
            {renderTextareaAndButton('recommendation', 'Doporučené nápravné opatření')}

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
