import React, { useState, useRef, useEffect } from 'react';
import { Label, Textarea } from 'flowbite-react';

export interface VariableDefinition {
    key: string;
    label: string;
    description: string;
}

interface SmartPromptEditorProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    variables: VariableDefinition[];
    rows?: number;
    placeholder?: string;
    helperText?: React.ReactNode;
    className?: string;
}

export const SmartPromptEditor: React.FC<SmartPromptEditorProps> = ({
    label,
    value,
    onChange,
    variables,
    rows = 4,
    placeholder,
    helperText,
    className = '',
}) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number } | null>(null);
    const [filterText, setFilterText] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Helper to get caret coordinates
    const updateCursorPosition = () => {
        if (!textareaRef.current) return;

        const { selectionStart, value } = textareaRef.current;
        // Find the last slash before cursor
        const lastSlashIndex = value.lastIndexOf('/', selectionStart - 1);

        if (lastSlashIndex !== -1) {
            // Check if there are spaces between slash and cursor
            const textAfterSlash = value.slice(lastSlashIndex + 1, selectionStart);
            if (!textAfterSlash.includes(' ') && !textAfterSlash.includes('\n')) {
                setFilterText(textAfterSlash);
                setShowSuggestions(true);
                setSelectedIndex(0);

                const coordinates = getCaretCoordinates(textareaRef.current, selectionStart);
                // Adjust for scroll and container position
                // Using 240px width estimation for right edge check could be added
                setCursorPosition({
                    top: coordinates.top + 24, // Push below line
                    left: coordinates.left
                });
                return;
            }
        }
        setShowSuggestions(false);
    };

    const insertVariable = (variableKey: string) => {
        if (!textareaRef.current) return;
        const { selectionStart, value } = textareaRef.current;

        const lastSlashIndex = value.lastIndexOf('/', selectionStart - 1);
        if (lastSlashIndex === -1) return;

        const newValue =
            value.slice(0, lastSlashIndex) +
            `{{${variableKey}}}` +
            value.slice(selectionStart);

        onChange(newValue);
        setShowSuggestions(false);

        // Restore focus and move cursor
        setTimeout(() => {
            if (!textareaRef.current) return;
            const newCursorPos = lastSlashIndex + variableKey.length + 4; // {{}} is 4 chars
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showSuggestions) {
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredVariables.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredVariables.length) % filteredVariables.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (filteredVariables.length > 0) {
                insertVariable(filteredVariables[selectedIndex].key);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        updateCursorPosition();
    };

    const filteredVariables = variables.filter(v =>
        v.label.toLowerCase().includes(filterText.toLowerCase()) ||
        v.key.toLowerCase().includes(filterText.toLowerCase())
    );

    // Close suggestions if clicked outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`w-full relative ${className}`} ref={containerRef}>
            {label && (
                <Label className="mb-2 block text-sm font-medium text-gray-700">
                    {label}
                </Label>
            )}
            <div className="relative group">
                <Textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onKeyUp={updateCursorPosition}
                    onClick={updateCursorPosition}
                    rows={rows}
                    placeholder={placeholder}
                    className="font-mono text-sm leading-relaxed p-4 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl shadow-sm transition-all resize-y min-h-[120px]"
                />

                {/* Subtle indicator for variable suggestion */}
                <div className="absolute right-3 bottom-2 text-xs text-gray-400 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 px-2 py-1 rounded backdrop-blur-sm">
                    Napište <span className="font-bold text-gray-600">/</span> pro vložení proměnné
                </div>

                {showSuggestions && filteredVariables.length > 0 && (
                    <div
                        className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto w-72 animate-in fade-in zoom-in-95 duration-75 ring-1 ring-black/5"
                        style={{
                            top: cursorPosition?.top ?? 0,
                            left: cursorPosition?.left ?? 0
                        }}
                    >
                        <div className="px-3 py-2 text-[10px] font-bold text-gray-500 bg-gray-50 border-b border-gray-100 tracking-wider uppercase sticky top-0 z-10 backdrop-blur-sm bg-gray-50/90">
                            Dostupné proměnné
                        </div>
                        {filteredVariables.map((v, i) => (
                            <button
                                key={v.key}
                                className={`w-full text-left px-3 py-2 transition-colors border-l-4 group flex flex-col gap-0.5 ${i === selectedIndex
                                    ? 'bg-blue-50/50 border-blue-500'
                                    : 'hover:bg-gray-50 border-transparent'
                                    }`}
                                onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent blur
                                    insertVariable(v.key);
                                }}
                                onMouseEnter={() => setSelectedIndex(i)}
                            >
                                <div className="flex items-baseline justify-between w-full">
                                    <span className={`text-sm font-medium ${i === selectedIndex ? 'text-blue-700' : 'text-gray-700'}`}>
                                        {v.label}
                                    </span>
                                    <span className="text-[10px] font-mono text-gray-400">
                                        {`{{${v.key}}}`}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-500 line-clamp-1 group-hover:line-clamp-none">
                                    {v.description}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {helperText && (
                <div className="mt-2 text-xs text-gray-500">
                    {helperText}
                </div>
            )}
        </div>
    );
};

// Basic textarea mirror for caret coordinates (simplified version)
// This is a "good enough" approximation for a specific font/line-height
function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
    const div = document.createElement('div');
    const style = getComputedStyle(element);

    // Copy styles
    Array.from(style).forEach(prop => {
        div.style.setProperty(prop, style.getPropertyValue(prop));
    });

    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.top = '0';
    div.style.left = '0';

    // We only need the text before the cursor
    div.textContent = element.value.substring(0, position);

    // Append a span to mark the end
    const span = document.createElement('span');
    span.textContent = '.';
    div.appendChild(span);

    document.body.appendChild(div);

    const spanRect = span.getBoundingClientRect();
    // We need relative coordinates inside the textarea, but since textarea scrolls, we rely on offsetTop/Left
    // This is tricky. Let's use the offset of the span relative to the div + textarea scrollTop

    const coordinates = {
        top: span.offsetTop - element.scrollTop,
        left: span.offsetLeft - element.scrollLeft
    };

    document.body.removeChild(div);

    // Bound to textarea dimensions to prevent popup going way off
    // (Adding a slight offset for line height)
    return {
        top: Math.min(coordinates.top + 20, element.clientHeight),
        left: Math.min(coordinates.left, element.clientWidth - 20)
    };
}
