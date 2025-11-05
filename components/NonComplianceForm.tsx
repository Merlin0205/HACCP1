import React, { useState, useCallback, ChangeEvent, useEffect } from 'react';
import { PhotoWithAnalysis, NonComplianceData } from '../types';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import ImagePreview from './ImagePreview';
import Spinner from './Spinner';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { StopIcon } from './icons/StopIcon';
import { CameraIcon } from './icons/CameraIcon';
import { TrashIcon } from './icons/TrashIcon';
import { EditIcon, PlusIcon } from './icons';
import { getNonComplianceLocations, addNonComplianceLocation, findBestMatchLocation } from '../services/firestore';
import { toast } from '../utils/toast';
import { rewriteFinding, generateRecommendation } from '../services/nonComplianceAI';


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
    onLocationSave?: (location: string) => Promise<void>; // Callback pro uložení nového místa
    itemTitle?: string;
    itemDescription?: string;
    sectionTitle?: string;
}

/**
 * Formátuje název místa: první písmeno velké, zbytek malé, odstraní tečku na konci
 */
const formatLocationName = (name: string): string => {
    if (!name) return '';
    // Odstranit tečku na konci a mezery
    let formatted = name.trim().replace(/\.+$/, '');
    if (!formatted) return '';
    // První písmeno velké, zbytek malé
    return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
};

// Komponenta pro dropdown s mikrofonem pro místo neshody
const LocationDropdownWithMic: React.FC<{
    value: string;
    onChange: (value: string) => void;
    label: string;
    id: string;
    log: (message: string) => void;
    isOtherFieldRecording: boolean;
    onRecordingStateChange: (isRecording: boolean) => void;
    onLocationSave?: (location: string) => Promise<void>; // Callback pro uložení nového místa
    getPendingLocation?: () => string | null; // Funkce pro získání nového místa k uložení
}> = ({ value, onChange, label, id, log, isOtherFieldRecording, onRecordingStateChange, onLocationSave, getPendingLocation }) => {
    const [locations, setLocations] = useState<string[]>([]);
    const [isLoadingLocations, setIsLoadingLocations] = useState(true);
    const [showDropdown, setShowDropdown] = useState(false);
    const [filterText, setFilterText] = useState(''); // Text pro filtrování při psaní
    const [isNewLocation, setIsNewLocation] = useState(false); // Flag pro nové místo (transkribované)

    // Načíst existující místa při mount
    useEffect(() => {
        const loadLocations = async () => {
            try {
                const result = await getNonComplianceLocations();
                setLocations(result.available);
            } catch (error) {
                console.error('[LocationDropdownWithMic] Error loading locations:', error);
                toast.error('Nepodařilo se načíst existující místa');
            } finally {
                setIsLoadingLocations(false);
            }
        };
        loadLocations();
    }, []);

    const handleTranscription = useCallback(async (transcribedText: string) => {
        // Odstranit tečku na konci a formátovat
        const formatted = formatLocationName(transcribedText);
        if (!formatted) return;

        // Najít nejbližší shodu v existujících místech
        const bestMatch = findBestMatchLocation(formatted, locations);
        
        if (bestMatch) {
            // Pokud najdeme shodu, použít existující místo
            onChange(bestMatch);
            setIsNewLocation(false);
            setShowDropdown(false);
            log(`Nalezena shoda: "${transcribedText}" → "${bestMatch}"`);
        } else {
            // Pokud nenajdeme shodu, ZAPSAT do inputu, skrýt dropdown a označit jako nové
            onChange(formatted);
            setIsNewLocation(true);
            setShowDropdown(false); // Skrýt dropdown
            log(`Nenalezena shoda pro "${formatted}". Nové místo bude uloženo při uložení neshody.`);
        }
    }, [locations, onChange, log]);

    const { isRecording, isTranscribing, error, toggleRecording } = useAudioRecorder(handleTranscription, log);

    // Informujeme rodiče o změně stavu nahrávání
    useEffect(() => {
        onRecordingStateChange(isRecording || isTranscribing);
    }, [isRecording, isTranscribing, onRecordingStateChange]);

    const isLoading = isRecording || isTranscribing;
    const buttonIcon = isLoading ? (isRecording ? <StopIcon/> : <Spinner small/>) : <MicrophoneIcon/>;
    const buttonClass = isRecording ? 'bg-red-500' : 'bg-blue-500';

    // Resetovat flag nového místa, pokud se hodnota změní ručně nebo se vybere z dropdownu
    useEffect(() => {
        if (value && locations.some(loc => loc.toLowerCase() === value.toLowerCase())) {
            setIsNewLocation(false);
        }
    }, [value, locations]);

    // Filtrovat místa pouze když uživatel píše (filterText), ne když je hodnota vyplněná
    const filteredLocations = filterText && showDropdown
        ? locations.filter(loc => loc.toLowerCase().includes(filterText.toLowerCase()))
        : locations;

    return (
        <div className="relative">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="relative">
                <div className="relative">
                    <input
                        type="text"
                        id={id}
                        value={value}
                        onChange={e => {
                            const formatted = formatLocationName(e.target.value);
                            onChange(formatted);
                            setFilterText(formatted); // Uložit text pro filtrování
                            setShowDropdown(true); // Vždy zobrazit dropdown při změně
                            setIsNewLocation(false); // Resetovat flag nového místa při ručním psaní
                        }}
                        onFocus={() => {
                            setShowDropdown(true);
                            setFilterText(''); // Resetovat filtr při kliknutí - zobrazit všechny možnosti
                        }}
                        onBlur={(e) => {
                            // Nezavřít dropdown pokud klikne na dropdown nebo jeho obsah
                            const relatedTarget = e.relatedTarget as HTMLElement;
                            if (!relatedTarget || !e.currentTarget.parentElement?.contains(relatedTarget)) {
                                setTimeout(() => {
                                    setShowDropdown(false);
                                    setFilterText(''); // Resetovat filtr při zavření
                                }, 200);
                            }
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md pr-12"
                        placeholder="-- Vyberte místo --"
                        disabled={isLoading || isOtherFieldRecording}
                    />
                    <button 
                        onClick={toggleRecording}
                        disabled={isOtherFieldRecording || (isTranscribing && !isRecording)}
                        className={`absolute top-1/2 -translate-y-1/2 right-2 p-1.5 sm:p-2 rounded-full text-white ${buttonClass} disabled:bg-gray-400 disabled:cursor-not-allowed z-10`}
                        title="Přepisovat hlasem"
                    >
                        {buttonIcon}
                    </button>
                </div>
                
                {/* Zobrazit "nové" malým písmem pod dropdownem, pokud je nové místo */}
                {isNewLocation && value && (
                    <p className="text-xs text-gray-400 mt-1 italic">
                        nové
                    </p>
                )}
                
                {showDropdown && (
                    <div 
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                        onMouseDown={(e) => {
                            // Zabránit onBlur na inputu
                            e.preventDefault();
                        }}
                    >
                        {filteredLocations.length > 0 ? (
                            filteredLocations.map(loc => (
                                <div
                                    key={loc}
                                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        onChange(loc);
                                        setShowDropdown(false);
                                        setFilterText(''); // Resetovat filtr po výběru
                                        setIsNewLocation(false); // Resetovat flag nového místa
                                    }}
                                >
                                    <span className={value === loc ? 'font-semibold text-blue-600' : ''}>{loc}</span>
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-gray-500 text-sm">Žádná místa</div>
                        )}
                    </div>
                )}
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
};

// Komponenta pro textové pole s mikrofonem a AI ikonami
const TextAreaWithMic: React.FC<{
    value: string;
    onChange: (value: string) => void;
    label: string;
    id: string;
    log: (message: string) => void;
    isOtherFieldRecording: boolean;
    onRecordingStateChange: (isRecording: boolean) => void;
    showAIIcons?: boolean;
    onRewrite?: () => Promise<void>;
    onGenerate?: () => Promise<void>;
    isAIRewriting?: boolean;
    isAIGenerating?: boolean;
}> = ({ value, onChange, label, id, log, isOtherFieldRecording, onRecordingStateChange, showAIIcons, onRewrite, onGenerate, isAIRewriting, isAIGenerating }) => {
    
    const handleTranscription = useCallback((transcribedText: string) => {
        // Odstranit tečku na konci
        const cleaned = transcribedText.trim().replace(/\.+$/, '');
        const newText = value ? `${value} ${cleaned}`.trim() : cleaned;
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

    // Počet ikon: mikrofon (1) + AI ikony (2 pokud jsou zobrazeny)
    const iconCount = showAIIcons ? 3 : 1;
    const rightPadding = iconCount * 48 + 8; // 48px pro každou ikonu + 8px padding

    return (
        <div className="relative">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <textarea
                id={id}
                rows={3}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md"
                style={{ paddingRight: `${rightPadding}px` }}
                placeholder={isRecording ? "Nahrávám..." : (isTranscribing ? "Přepisuji..." : "")}
                readOnly={isLoading || isAIRewriting || isAIGenerating}
            />
            <div className="absolute top-8 right-2 flex items-center gap-1 z-10">
                <button 
                    onClick={toggleRecording}
                    disabled={isOtherFieldRecording || isAIRewriting || isAIGenerating}
                    className={`p-1.5 sm:p-2 rounded-full text-white ${buttonClass} disabled:bg-gray-400 disabled:cursor-not-allowed`}
                    title="Přepisovat hlasem"
                >
                    {buttonIcon}
                </button>
                {showAIIcons && onRewrite && (
                    <button
                        onClick={onRewrite}
                        disabled={isOtherFieldRecording || isAIRewriting || isAIGenerating || !value}
                        className={`p-1.5 sm:p-2 rounded-full text-white bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors`}
                        title="Přepiš text pomocí AI"
                    >
                        {isAIRewriting ? <Spinner small /> : <EditIcon className="h-3 w-3 sm:h-4 sm:w-4" />}
                    </button>
                )}
                {showAIIcons && onGenerate && (
                    <button
                        onClick={onGenerate}
                        disabled={isOtherFieldRecording || isAIRewriting || isAIGenerating || !value}
                        className={`p-1.5 sm:p-2 rounded-full text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors`}
                        title="Vygeneruj doporučení pomocí AI"
                    >
                        {isAIGenerating ? <Spinner small /> : <PlusIcon className="h-3 w-3 sm:h-4 sm:w-4" />}
                    </button>
                )}
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
};

const NonComplianceForm: React.FC<NonComplianceFormProps> = ({ 
    data, 
    onChange, 
    onRemove, 
    index, 
    log, 
    onLocationSave,
    itemTitle,
    itemDescription,
    sectionTitle
}) => {
    const [isLocationRecording, setIsLocationRecording] = useState(false);
    const [isFindingRecording, setIsFindingRecording] = useState(false);
    const [isRecommendationRecording, setIsRecommendationRecording] = useState(false);
    const [pendingLocation, setPendingLocation] = useState<string | null>(null); // Nové místo čekající na uložení
    const [isAIRewriting, setIsAIRewriting] = useState(false);
    const [isAIGenerating, setIsAIGenerating] = useState(false);

    const handleRewriteFinding = async () => {
        if (!data.finding || !itemTitle || !sectionTitle) {
            toast.error('Pro použití AI je potřeba vyplnit popis neshody');
            return;
        }

        setIsAIRewriting(true);
        try {
            const rewritten = await rewriteFinding(data.finding, {
                itemTitle,
                itemDescription: itemDescription || '',
                sectionTitle
            });
            onChange('finding', rewritten);
            log('Text přepsán pomocí AI');
            toast.success('Text byl úspěšně přepsán');
        } catch (error: any) {
            console.error('[NonComplianceForm] Error rewriting finding:', error);
            toast.error(error.message || 'Chyba při přepisování textu');
            log(`Chyba při přepisování: ${error.message}`);
        } finally {
            setIsAIRewriting(false);
        }
    };

    const handleGenerateRecommendation = async () => {
        if (!data.finding || !itemTitle || !sectionTitle) {
            toast.error('Pro generování doporučení je potřeba vyplnit popis neshody');
            return;
        }

        setIsAIGenerating(true);
        try {
            const recommendation = await generateRecommendation(data.finding, {
                itemTitle,
                itemDescription: itemDescription || '',
                sectionTitle
            });
            onChange('recommendation', recommendation);
            log('Doporučení vygenerováno pomocí AI');
            toast.success('Doporučení bylo úspěšně vygenerováno');
        } catch (error: any) {
            console.error('[NonComplianceForm] Error generating recommendation:', error);
            toast.error(error.message || 'Chyba při generování doporučení');
            log(`Chyba při generování: ${error.message}`);
        } finally {
            setIsAIGenerating(false);
        }
    };

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
        <div className="w-full p-4 border bg-white rounded-md shadow-sm space-y-4 relative mt-2">
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
            <LocationDropdownWithMic
                id={`location-${index}`}
                label="Místo neshody"
                value={data.location}
                onChange={(value) => onChange('location', value)}
                log={log}
                isOtherFieldRecording={isFindingRecording || isRecommendationRecording}
                onRecordingStateChange={setIsLocationRecording}
            />
            
            <TextAreaWithMic
                id={`finding-${index}`}
                label="Popis zjištěné neshody"
                value={data.finding}
                onChange={(value) => onChange('finding', value)}
                log={log}
                isOtherFieldRecording={isLocationRecording || isRecommendationRecording}
                onRecordingStateChange={setIsFindingRecording}
                showAIIcons={true}
                onRewrite={handleRewriteFinding}
                onGenerate={handleGenerateRecommendation}
                isAIRewriting={isAIRewriting}
                isAIGenerating={isAIGenerating}
            />
            
            <TextAreaWithMic
                id={`recommendation-${index}`}
                label="Doporučené nápravné opatření"
                value={data.recommendation}
                onChange={(value) => onChange('recommendation', value)}
                log={log}
                isOtherFieldRecording={isLocationRecording || isFindingRecording}
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
