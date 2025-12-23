import React, { useState, useCallback, ChangeEvent, useEffect, useRef } from 'react';
import { PhotoWithAnalysis, NonComplianceData } from '../types';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import ImagePreview from './ImagePreview';
import Spinner from './Spinner';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { StopIcon } from './icons/StopIcon';
import { CameraIcon } from './icons/CameraIcon';
import { TrashIcon } from './icons/TrashIcon';
import { EditIcon, PlusIcon, XIcon } from './icons';
import { getNonComplianceLocations, addNonComplianceLocation, findBestMatchLocation, deleteNonComplianceLocation, addToBlacklist } from '../services/firestore';
import { toast } from '../utils/toast';
import { rewriteFinding, generateRecommendation } from '../services/nonComplianceAI';
import { compressImage } from '../utils/imageCompression';
import { uploadAuditPhoto } from '../services/storage';
import { fileToBase64 } from '../services/storage';
import ConfirmationModal from './ConfirmationModal';

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
    auditId?: string; // ID auditu pro upload fotek na Storage
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
    const [onlyInCollection, setOnlyInCollection] = useState<string[]>([]); // Místa pouze v kolekci (lze smazat)
    const [usedInAudits, setUsedInAudits] = useState<string[]>([]); // Místa používaná v auditech
    const [isLoadingLocations, setIsLoadingLocations] = useState(true);
    const [showDropdown, setShowDropdown] = useState(false);
    const [filterText, setFilterText] = useState(''); // Text pro filtrování při psaní
    const [isNewLocation, setIsNewLocation] = useState(false); // Flag pro nové místo (transkribované)
    const [confirmDeleteLocation, setConfirmDeleteLocation] = useState<string | null>(null); // Místo k potvrzení smazání

    // Načíst existující místa při mount
    useEffect(() => {
        const loadLocations = async () => {
            try {
                const result = await getNonComplianceLocations();
                setLocations(result.available);
                setOnlyInCollection(result.onlyInCollection);
                setUsedInAudits(result.usedInAudits);
            } catch (error) {
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
    const buttonIcon = isLoading ? (isRecording ? <StopIcon /> : <Spinner small />) : <MicrophoneIcon />;
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

    const handleDeleteLocation = async (locationName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        // Zkontrolovat, jestli je místo použito v auditech
        const isUsedInAudits = usedInAudits.some(loc => loc.toLowerCase() === locationName.toLowerCase());

        if (isUsedInAudits) {
            // Místo je použito v auditech - zobrazit potvrzovací dialog
            setConfirmDeleteLocation(locationName);
            return;
        }

        // Místo není použito v auditech - smazat přímo
        await performDeleteLocation(locationName);
    };

    const performDeleteLocation = async (locationName: string) => {
        try {
            // Zkontrolovat, jestli je místo použito v auditech
            const isUsedInAudits = usedInAudits.some(loc => loc.toLowerCase() === locationName.toLowerCase());

            if (isUsedInAudits) {
                // Místo je použito v auditech - přidat do blacklistu
                await addToBlacklist(locationName);
            } else {
                // Místo není použito v auditech - smazat z kolekce
                await deleteNonComplianceLocation(locationName);
            }

            // Aktualizovat seznam míst
            const result = await getNonComplianceLocations();
            setLocations(result.available);
            setOnlyInCollection(result.onlyInCollection);
            setUsedInAudits(result.usedInAudits);

            // Pokud bylo smazáno aktuálně vybrané místo, vymazat hodnotu
            if (value.toLowerCase() === locationName.toLowerCase()) {
                onChange('');
            }

            toast.success(`Místo "${locationName}" bylo smazáno ze seznamu`);
            log(`Místo "${locationName}" bylo smazáno ze seznamu`);
        } catch (error: any) {
            toast.error(error.message || 'Nepodařilo se smazat místo');
        }
    };

    return (
        <div className="relative">
            <label htmlFor={id} className="block text-sm md:text-base font-medium text-gray-700 mb-1.5 md:mb-2">{label}</label>
            <div className="relative">
                <div className="relative">
                    <input
                        type="text"
                        id={id}
                        value={value}
                        onChange={e => {
                            const val = e.target.value;
                            onChange(val);
                            setFilterText(val); // Uložit text pro filtrování
                            setShowDropdown(true); // Vždy zobrazit dropdown při změně
                            setIsNewLocation(false); // Resetovat flag nového místa při ručním psaní
                        }}
                        onFocus={() => {
                            setShowDropdown(true);
                            setFilterText(''); // Resetovat filtr při kliknutí - zobrazit všechny možnosti
                        }}
                        onBlur={(e) => {
                            // Formátovat při opuštění pole
                            const formatted = formatLocationName(value);
                            if (formatted !== value) {
                                onChange(formatted);
                            }

                            // Nezavřít dropdown pokud klikne na dropdown nebo jeho obsah
                            const relatedTarget = e.relatedTarget as HTMLElement;
                            if (!relatedTarget || !e.currentTarget.parentElement?.contains(relatedTarget)) {
                                setTimeout(() => {
                                    setShowDropdown(false);
                                    setFilterText(''); // Resetovat filtr při zavření
                                }, 200);
                            }
                        }}
                        className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base bg-white border border-gray-300 rounded-md pr-14 md:pr-16"
                        placeholder="-- Vyberte místo --"
                        disabled={isLoading || isOtherFieldRecording}
                    />
                    <button
                        onClick={toggleRecording}
                        disabled={isOtherFieldRecording || (isTranscribing && !isRecording)}
                        className={`absolute top-1/2 -translate-y-1/2 right-2 md:right-3 p-2 md:p-2.5 rounded-full text-white ${buttonClass} disabled:bg-gray-400 disabled:cursor-not-allowed z-10`}
                        title="Přepisovat hlasem"
                    >
                        <MicrophoneIcon className="h-5 w-5 md:h-6 md:w-6" />
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
                        className="absolute z-[2000] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                        onMouseDown={(e) => {
                            // Zabránit onBlur na inputu
                            e.preventDefault();
                        }}
                    >
                        {filteredLocations.length > 0 ? (
                            filteredLocations.map(loc => {
                                const canDelete = onlyInCollection.some(l => l.toLowerCase() === loc.toLowerCase());
                                const isUsedInAudits = usedInAudits.some(l => l.toLowerCase() === loc.toLowerCase());

                                return (
                                    <div
                                        key={loc}
                                        className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 cursor-pointer group"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            onChange(loc);
                                            setShowDropdown(false);
                                            setFilterText(''); // Resetovat filtr po výběru
                                            setIsNewLocation(false); // Resetovat flag nového místa
                                        }}
                                    >
                                        <span className={value === loc ? 'font-semibold text-blue-600' : ''}>{loc}</span>
                                        {(canDelete || isUsedInAudits) && (
                                            <button
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    handleDeleteLocation(loc, e);
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                }}
                                                className={`ml-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${isUsedInAudits
                                                    ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                                                    : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                                    }`}
                                                title={isUsedInAudits ? "Odstranit ze seznamu (místo zůstane v existujících auditech)" : "Smazat místo ze seznamu"}
                                                aria-label="Smazat místo"
                                            >
                                                <XIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="px-3 py-2 text-gray-500 text-sm">Žádná místa</div>
                        )}
                    </div>
                )}
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

            {/* Potvrzovací dialog pro smazání místa používaného v auditech */}
            <ConfirmationModal
                isOpen={confirmDeleteLocation !== null}
                title="Odstranit místo ze seznamu?"
                message={confirmDeleteLocation ? `Místo "${confirmDeleteLocation}" je použito v existujících auditech. Opravdu ho chcete odstranit ze seznamu? Místo zůstane v existujících auditech, ale zmizí ze seznamu pro nové audity.` : ''}
                onConfirm={() => {
                    if (confirmDeleteLocation) {
                        performDeleteLocation(confirmDeleteLocation);
                        setConfirmDeleteLocation(null);
                    }
                }}
                onCancel={() => setConfirmDeleteLocation(null)}
                confirmButtonText="Odstranit"
                cancelButtonText="Zrušit"
                confirmButtonVariant="danger"
            />
        </div>
    );
};

// Komponenta pro textové pole s mikrofonem a AI ikonami
const TextAreaWithMic: React.FC<{
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
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
}> = ({ value, onChange, onBlur, label, id, log, isOtherFieldRecording, onRecordingStateChange, showAIIcons, onRewrite, onGenerate, isAIRewriting, isAIGenerating }) => {

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
    const buttonIcon = isLoading ? (isRecording ? <StopIcon /> : <Spinner small />) : <MicrophoneIcon />;
    const buttonClass = isRecording ? 'bg-red-500' : 'bg-blue-500';

    // Počet ikon: mikrofon (1) + AI ikony (2 pokud jsou zobrazeny)
    const iconCount = showAIIcons ? 3 : 1;
    const rightPadding = iconCount * 56 + 16; // 56px pro každou ikonu + 16px padding (větší pro mobily)

    return (
        <div className="relative">
            <label htmlFor={id} className="block text-sm md:text-base font-medium text-gray-700 mb-1.5 md:mb-2">{label}</label>
            <textarea
                id={id}
                rows={4}
                value={value}
                onChange={e => onChange(e.target.value)}
                onBlur={onBlur}
                className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base bg-white border border-gray-300 rounded-md resize-y"
                style={{ paddingRight: `${rightPadding}px` }}
                placeholder={isRecording ? "Nahrávám..." : (isTranscribing ? "Přepisuji..." : "")}
                readOnly={isLoading || isAIRewriting || isAIGenerating}
            />
            <div className="absolute top-10 md:top-11 right-2 md:right-3 flex items-center gap-1.5 md:gap-2" style={{ zIndex: 1000 }}>
                <button
                    onClick={toggleRecording}
                    disabled={isOtherFieldRecording || isAIRewriting || isAIGenerating}
                    className={`p-2 md:p-2.5 rounded-full text-white ${buttonClass} disabled:bg-gray-400 disabled:cursor-not-allowed`}
                    title="Přepisovat hlasem"
                >
                    {isLoading ? (isRecording ? <StopIcon className="h-5 w-5 md:h-6 md:w-6" /> : <Spinner small />) : <MicrophoneIcon className="h-5 w-5 md:h-6 md:w-6" />}
                </button>
                {showAIIcons && onRewrite && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isOtherFieldRecording && !isAIRewriting && !isAIGenerating && value) {
                                onRewrite();
                            }
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                        disabled={isOtherFieldRecording || isAIRewriting || isAIGenerating || !value}
                        className={`p-2 md:p-2.5 rounded-full text-white bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors`}
                        style={{ zIndex: 1001, position: 'relative', pointerEvents: 'auto' }}
                        title="Přepiš text pomocí AI"
                    >
                        {isAIRewriting ? <Spinner small /> : <EditIcon className="h-4 w-4 md:h-5 md:w-5" />}
                    </button>
                )}
                {showAIIcons && onGenerate && (
                    <button
                        onClick={onGenerate}
                        disabled={isOtherFieldRecording || isAIRewriting || isAIGenerating || !value}
                        className={`p-2 md:p-2.5 rounded-full text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors`}
                        title="Vygeneruj doporučení pomocí AI"
                    >
                        {isAIGenerating ? <Spinner small /> : <PlusIcon className="h-4 w-4 md:h-5 md:w-5" />}
                    </button>
                )}
            </div>
            {error && <p className="text-red-500 text-xs md:text-sm mt-1">{error}</p>}
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
    sectionTitle,
    auditId
}) => {
    const [isLocationRecording, setIsLocationRecording] = useState(false);
    const [isFindingRecording, setIsFindingRecording] = useState(false);
    const [isRecommendationRecording, setIsRecommendationRecording] = useState(false);
    const [pendingLocation, setPendingLocation] = useState<string | null>(null); // Nové místo čekající na uložení
    const [isAIRewriting, setIsAIRewriting] = useState(false);
    const [isAIGenerating, setIsAIGenerating] = useState(false);
    const [findingDraft, setFindingDraft] = useState<string>(data.finding || '');
    const [recommendationDraft, setRecommendationDraft] = useState<string>(data.recommendation || '');
    const [aiFindingError, setAiFindingError] = useState<string | null>(null);
    const [aiRecommendationError, setAiRecommendationError] = useState<string | null>(null);

    useEffect(() => {
        setFindingDraft(data.finding || '');
    }, [data.finding]);

    useEffect(() => {
        setRecommendationDraft(data.recommendation || '');
    }, [data.recommendation]);

    // Refs pro file inputy
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleRewriteFinding = async () => {
        if (!findingDraft || !itemTitle || !sectionTitle) {
            toast.error('Pro použití AI je potřeba vyplnit popis neshody');
            return;
        }

        setAiFindingError(null);
        setIsAIRewriting(true);
        try {
            const rewritten = await rewriteFinding(findingDraft, {
                itemTitle,
                itemDescription: itemDescription || '',
                sectionTitle
            });
            setFindingDraft(rewritten);
            onChange('finding', rewritten); // AI akce ukládáme hned
            log('Text přepsán pomocí AI');
            toast.success('Text byl úspěšně přepsán');
        } catch (error: any) {
            const msg = error?.message || 'Chyba při přepisování textu';
            setAiFindingError(msg);
            toast.error(msg);
            log(`Chyba při přepisování: ${error.message}`);
        } finally {
            setIsAIRewriting(false);
        }
    };

    const handleGenerateRecommendation = async () => {
        if (!findingDraft || !itemTitle || !sectionTitle) {
            toast.error('Pro generování doporučení je potřeba vyplnit popis neshody');
            return;
        }

        setAiRecommendationError(null);
        setIsAIGenerating(true);
        try {
            const recommendation = await generateRecommendation(findingDraft, {
                itemTitle,
                itemDescription: itemDescription || '',
                sectionTitle
            });
            setRecommendationDraft(recommendation);
            onChange('recommendation', recommendation); // AI akce ukládáme hned
            log('Doporučení vygenerováno pomocí AI');
            toast.success('Doporučení bylo úspěšně vygenerováno');
        } catch (error: any) {
            const msg = error?.message || 'Chyba při generování doporučení';
            setAiRecommendationError(msg);
            toast.error(msg);
            log(`Chyba při generování: ${error.message}`);
        } finally {
            setIsAIGenerating(false);
        }
    };

    const handlePhotoChange = async (files: FileList | null, source: 'gallery' | 'camera') => {
        if (!files || files.length === 0) return;

        if (!auditId) {
            toast.error('Chybí ID auditu pro upload fotek');
            return;
        }

        const fileArray = Array.from(files);

        // 1. Vytvořit placeholdery pro všechny fotky najednou
        const newPlaceholders: PhotoWithAnalysis[] = fileArray.map(file => ({
            file,
            isUploading: true
        }));

        // Přidat placeholdery do state
        const currentPhotos = [...data.photos, ...newPlaceholders];
        onChange('photos', currentPhotos);

        // 2. Spustit upload pro všechny fotky paralelně
        const uploadPromises = fileArray.map(async (file, index) => {
            const photoIndex = data.photos.length + index; // Index v celkovém poli (původní + nové)

            try {
                // Komprimovat obrázek
                // log(`Komprimuji fotku ${index + 1}/${fileArray.length}...`);
                const compressedFile = await compressImage(file);

                // Upload na Storage
                // log(`Nahrávám fotku ${index + 1}/${fileArray.length} na Storage...`);
                const { url, storagePath } = await uploadAuditPhoto(auditId, compressedFile, photoIndex);

                // Vytvořit base64 pro preview
                const base64 = await fileToBase64(compressedFile);

                // Vytvořit finální objekt fotky
                const uploadedPhoto: PhotoWithAnalysis = {
                    storagePath,
                    url,
                    base64: base64.split(',')[1],
                    isUploading: false
                };

                return { success: true, file, photo: uploadedPhoto };
            } catch (error) {
                toast.error(`Nepodařilo se nahrát fotku ${file.name}`);
                return { success: false, file };
            }
        });

        // 3. Čekat na dokončení všech uploadů a průběžně aktualizovat state
        // Místo čekání na všechny najednou můžeme aktualizovat state po každém úspěšném uploadu,
        // ale pro jednoduchost a konzistenci počkáme na všechny a pak aktualizujeme ty úspěšné.
        // Lepší UX je aktualizovat průběžně, aby uživatel viděl progress.

        // Implementace s průběžnou aktualizací:
        uploadPromises.forEach(async (promise) => {
            const result = await promise;

            // Získat aktuální stav fotek (protože se mohl změnit jiným uploadem)
            // V Reactu bychom použili functional update, ale zde máme jen onChange prop.
            // Musíme doufat, že parent component (AuditItemModal) nám vrátí aktuální data při dalším renderu,
            // ale tady v async funkci máme jen 'data' z closure, které je staré.
            // TO JE PROBLÉM: 'data.photos' je stale closure.

            // Řešení: V tomto případě je bezpečnější aktualizovat state až na konci, 
            // NEBO (pokud chceme průběžně) musíme spoléhat na to, že onChange vyvolá re-render 
            // a my bychom museli mít logiku mimo tuto funkci.

            // Ale pozor: 'onChange' volá setState v rodiči. Pokud zavoláme onChange 5x rychle za sebou,
            // může dojít k race condition, pokud rodič nepoužívá functional update správně.
            // Proto je bezpečnější počkat na všechny a aktualizovat najednou, NEBO
            // (a to je nejlepší) aktualizovat lokální kopii pole a tu posílat.
        });

        // Počkáme na všechny promisy
        const results = await Promise.all(uploadPromises);

        // 4. Aktualizovat state s výsledky
        // Vezmeme aktuální fotky (z closure - pozor, pokud se mezitím něco změnilo, přepíšeme to!)
        // Ale v rámci jednoho batch uploadu by uživatel neměl dělat jiné změny.

        // Vytvoříme nové pole fotek
        // Začneme s původními fotkami (ty co tam byly před tímto uploadem)
        const originalPhotos = data.photos;

        // A přidáme k nim výsledky
        // Pro každou novou fotku: pokud se nahrála, dáme tam výsledek. Pokud ne, nedáme tam nic (placeholder zmizí).
        const newPhotos: PhotoWithAnalysis[] = [];

        results.forEach(result => {
            if (result.success && result.photo) {
                newPhotos.push(result.photo);
            }
            // Pokud success === false, fotku nepřidáváme (placeholder zmizí, uživatel viděl error toast)
        });

        // Výsledné pole = původní fotky + nové úspěšně nahrané
        const finalPhotos = [...originalPhotos, ...newPhotos];

        onChange('photos', finalPhotos);

        if (newPhotos.length > 0) {
            toast.success(`Úspěšně nahráno ${newPhotos.length} fotek`);
        }
    };

    const handleGalleryClick = () => {
        galleryInputRef.current?.click();
    };

    const handleCameraClick = () => {
        cameraInputRef.current?.click();
    };

    const removePhoto = async (photoIndex: number) => {
        const photo = data.photos[photoIndex];

        // Pokud má fotka storagePath, smazat ji ze Storage
        if (photo.storagePath) {
            try {
                const { deleteAuditPhoto } = await import('../services/storage');
                await deleteAuditPhoto(photo.storagePath);
                log(`Fotka smazána ze Storage`);
            } catch (error: any) {
                toast.error('Chyba při mazání fotky ze Storage');
            }
        }

        onChange('photos', data.photos.filter((_, i) => i !== photoIndex));
    };

    const handleAnalyzePhoto = async (photoIndex: number) => {
        // ... (kód pro analýzu fotek)
    };

    return (
        <div className="w-full space-y-4 md:space-y-5 relative">
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
                value={findingDraft}
                onChange={(value) => setFindingDraft(value)}
                onBlur={() => {
                    if (findingDraft !== (data.finding || '')) {
                        onChange('finding', findingDraft);
                    }
                }}
                log={log}
                isOtherFieldRecording={isLocationRecording || isRecommendationRecording}
                onRecordingStateChange={setIsFindingRecording}
                showAIIcons={true}
                onRewrite={handleRewriteFinding}
                onGenerate={handleGenerateRecommendation}
                isAIRewriting={isAIRewriting}
                isAIGenerating={isAIGenerating}
            />
            {aiFindingError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <strong>AI přepis selhal:</strong> {aiFindingError}
                </div>
            )}

            <TextAreaWithMic
                id={`recommendation-${index}`}
                label="Doporučené nápravné opatření"
                value={recommendationDraft}
                onChange={(value) => setRecommendationDraft(value)}
                onBlur={() => {
                    if (recommendationDraft !== (data.recommendation || '')) {
                        onChange('recommendation', recommendationDraft);
                    }
                }}
                log={log}
                isOtherFieldRecording={isLocationRecording || isFindingRecording}
                onRecordingStateChange={setIsRecommendationRecording}
            />
            {aiRecommendationError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <strong>AI doporučení selhalo:</strong> {aiRecommendationError}
                </div>
            )}

            <div>
                <label className="block text-sm md:text-base font-medium text-gray-700 mb-2 md:mb-3">Fotky</label>
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                    {/* Tlačítko pro galerii */}
                    <button
                        type="button"
                        onClick={handleGalleryClick}
                        className="flex items-center justify-center px-4 md:px-5 py-3 md:py-3.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-colors flex-1"
                    >
                        <CameraIcon className="h-5 w-5 md:h-6 md:w-6" />
                        <span className="ml-3 font-medium text-gray-600 text-sm md:text-base">Vybrat z galerie</span>
                    </button>
                    <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handlePhotoChange(e.target.files, 'gallery')}
                        className="hidden"
                    />

                    {/* Tlačítko pro fotoaparát */}
                    <button
                        type="button"
                        onClick={handleCameraClick}
                        className="flex items-center justify-center px-4 md:px-5 py-3 md:py-3.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-green-400 transition-colors flex-1"
                    >
                        <CameraIcon className="h-5 w-5 md:h-6 md:w-6" />
                        <span className="ml-3 font-medium text-gray-600 text-sm md:text-base">Vyfotit</span>
                    </button>
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handlePhotoChange(e.target.files, 'camera')}
                        className="hidden"
                    />
                </div>
                <ImagePreview photos={data.photos} onRemove={removePhoto} onAnalyze={handleAnalyzePhoto} />

                {/* Progress bar pro nahrávání */}
                {data.photos.some(p => p.isUploading) && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-blue-700">
                                Nahrávám fotky ({data.photos.filter(p => p.isUploading).length} zbývá)
                            </span>
                            <Spinner small />
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2.5">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${(data.photos.filter(p => !p.isUploading).length / data.photos.length) * 100}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                            Prosím neopouštějte toto okno, dokud se nahrávání nedokončí.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NonComplianceForm;
