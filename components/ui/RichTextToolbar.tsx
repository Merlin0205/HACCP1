import React, { useState, useRef, useEffect } from 'react';
import {
    BoldIcon,
    ItalicIcon,
    UnderlineIcon,
    LinkIcon,
    NoSymbolIcon,
    StrikethroughIcon,
    ListBulletIcon,
    NumberedListIcon,
    Bars3BottomLeftIcon, // Align Left
    Bars3Icon, // Align Center (using Bars3 as proxy for center align visual if specific icon missing, or use standard text align icons)
    Bars3BottomRightIcon, // Align Right
    ChevronDownIcon
} from '@heroicons/react/24/outline';

// Note: Heroicons might not have exact text-align icons in outline set, checking available icons.
// Using generic icons that resemble alignment if exact ones aren't available, or standard SVG paths.
// Let's use standard SVG paths for alignment to be precise if needed, or stick to Heroicons if they exist.
// Heroicons v2 has `Bars3BottomLeft` (left), `Bars3` (justify/center-ish), `Bars3BottomRight` (right).

interface RichTextToolbarProps {
    visible: boolean;
    onMouseDown: (e: React.MouseEvent) => void; // Prevent focus loss
    ensureSelection?: () => void; // Restore last selection inside editor (prevents intermittent formatting failures)
}

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ visible, onMouseDown, ensureSelection }) => {
    const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
    const fontSizeDropdownRef = useRef<HTMLDivElement>(null);
    const [showLineHeightDropdown, setShowLineHeightDropdown] = useState(false);
    const lineHeightDropdownRef = useRef<HTMLDivElement>(null);
    const [showFontFamilyDropdown, setShowFontFamilyDropdown] = useState(false);
    const fontFamilyDropdownRef = useRef<HTMLDivElement>(null);
    const [showTextColor, setShowTextColor] = useState(false);
    const [showBgColor, setShowBgColor] = useState(false);
    const textColorRef = useRef<HTMLDivElement>(null);
    const bgColorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fontSizeDropdownRef.current && !fontSizeDropdownRef.current.contains(event.target as Node)) {
                setShowFontSizeDropdown(false);
            }
            if (lineHeightDropdownRef.current && !lineHeightDropdownRef.current.contains(event.target as Node)) {
                setShowLineHeightDropdown(false);
            }
            if (fontFamilyDropdownRef.current && !fontFamilyDropdownRef.current.contains(event.target as Node)) {
                setShowFontFamilyDropdown(false);
            }
            if (textColorRef.current && !textColorRef.current.contains(event.target as Node)) {
                setShowTextColor(false);
            }
            if (bgColorRef.current && !bgColorRef.current.contains(event.target as Node)) {
                setShowBgColor(false);
            }
        };

        if (showFontSizeDropdown || showLineHeightDropdown || showFontFamilyDropdown || showTextColor || showBgColor) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showFontSizeDropdown, showLineHeightDropdown, showFontFamilyDropdown, showTextColor, showBgColor]);

    if (!visible) return null;

    const executeCommand = (command: string, value?: string) => {
        ensureSelection?.();
        document.execCommand(command, false, value);
    };

    const wrapSelectionWithSpanStyle = (style: Record<string, string>) => {
        ensureSelection?.();
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        if (range.collapsed) return;

        const span = document.createElement('span');
        Object.entries(style).forEach(([k, v]) => {
            (span.style as any)[k] = v;
        });
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);

        // Normalizace legacy <font> uvnitř výběru (může vzniknout historicky nebo jinými akcemi)
        // Bez toho může <font size=...> přebít obalový span a část zůstane menší.
        const FONT_SIZE_MAP: Record<string, string> = {
            '1': '10px',
            '2': '12px',
            '3': '14px',
            '4': '16px',
            '5': '18px',
            '6': '20px',
            '7': '24px',
        };
        const appliedKeys = Object.keys(style);
        span.querySelectorAll('font').forEach((fontEl) => {
            const repl = document.createElement('span');
            const sizeAttr = fontEl.getAttribute('size');
            const colorAttr = fontEl.getAttribute('color');
            // Zachovat původní styl jen pokud ho právě nepřebíjíme
            if (colorAttr && !appliedKeys.includes('color')) {
                repl.style.color = colorAttr;
            }
            if (sizeAttr && FONT_SIZE_MAP[sizeAttr] && !appliedKeys.includes('fontSize')) {
                repl.style.fontSize = FONT_SIZE_MAP[sizeAttr];
            }
            while (fontEl.firstChild) repl.appendChild(fontEl.firstChild);
            fontEl.replaceWith(repl);
        });

        // Pokud uvnitř výběru už existují inline styly pro stejnou vlastnost (např. font-size),
        // vnořené hodnoty přebijí obalový span a část textu zůstane jiná.
        // Proto odstraníme konfliktní inline styly pro právě aplikované klíče.
        const styleKeys = Object.keys(style) as (keyof CSSStyleDeclaration)[];
        span.querySelectorAll<HTMLElement>('*').forEach((el) => {
            styleKeys.forEach((k) => {
                try {
                    (el.style as any)[k] = '';
                } catch {
                    // ignore
                }
            });
        });

        // Word-like chování: necháme text stále označený (nekolabovat caret na konec)
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        sel.addRange(newRange);
    };

    const ToolbarButton = ({ command, value, icon: Icon, title }: { command: string, value?: string, icon: React.ElementType, title: string }) => (
        <button
            onMouseDown={(e) => {
                e.preventDefault(); // Prevent focus loss from editor
                ensureSelection?.();
                executeCommand(command, value);
            }}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600 transition-colors"
            title={title}
        >
            <Icon className="w-4 h-4" />
        </button>
    );

    const handleFontSizePt = (pt: number) => {
        ensureSelection?.();
        wrapSelectionWithSpanStyle({ fontSize: `${pt}pt` });
        setShowFontSizeDropdown(false);
    };

    const handleLineHeight = (value: string) => {
        ensureSelection?.();
        wrapSelectionWithSpanStyle({ lineHeight: value });
        setShowLineHeightDropdown(false);
    };

    const handleFontFamily = (family: 'sans-serif' | 'serif' | 'monospace') => {
        ensureSelection?.();
        wrapSelectionWithSpanStyle({ fontFamily: family });
        setShowFontFamilyDropdown(false);
    };

    const handleTextColor = (hex: string) => {
        ensureSelection?.();
        wrapSelectionWithSpanStyle({ color: hex });
        setShowTextColor(false);
    };

    const handleBgColor = (hex: string) => {
        ensureSelection?.();
        wrapSelectionWithSpanStyle({ backgroundColor: hex });
        setShowBgColor(false);
    };

    const handleCreateLink = () => {
        const url = prompt('Vložte odkaz (URL):');
        if (!url) return;
        ensureSelection?.();
        executeCommand('createLink', url);
    };

    return (
        <div
            className="absolute -top-12 left-0 z-50 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1 animate-in fade-in slide-in-from-bottom-2 duration-200"
            onMouseDown={onMouseDown}
        >
            <ToolbarButton command="bold" icon={BoldIcon} title="Tučně" />
            <ToolbarButton command="italic" icon={ItalicIcon} title="Kurzíva" />
            <ToolbarButton command="underline" icon={UnderlineIcon} title="Podtržené" />
            <ToolbarButton command="strikeThrough" icon={StrikethroughIcon} title="Přeškrtnuté" />

            <div className="w-px h-4 bg-gray-200 mx-1" />

            {/* Font Size Dropdown */}
            <div className="relative" ref={fontSizeDropdownRef}>
                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setShowFontSizeDropdown(!showFontSizeDropdown);
                        setShowLineHeightDropdown(false);
                        setShowFontFamilyDropdown(false);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1"
                    title="Velikost písma (pt)"
                >
                    <span className="text-xs font-bold">pt</span>
                    <ChevronDownIcon className="w-3 h-3" />
                </button>
                {showFontSizeDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px]">
                        {[8,9,10,11,12,14,16,18,20,22,24,26,28,36,48,72].map((pt) => (
                            <button
                                key={pt}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleFontSizePt(pt);
                                }}
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-gray-700"
                            >
                                <span style={{ fontSize: `${Math.max(10, Math.min(24, pt))}px` }}>{pt}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Line height / spacing */}
            <div className="relative" ref={lineHeightDropdownRef}>
                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setShowLineHeightDropdown(!showLineHeightDropdown);
                        setShowFontSizeDropdown(false);
                        setShowFontFamilyDropdown(false);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1"
                    title="Řádkování"
                >
                    <span className="text-xs font-bold">↕</span>
                    <ChevronDownIcon className="w-3 h-3" />
                </button>
                {showLineHeightDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]">
                        {[
                            { label: '1.0 (jednoduché)', value: '1.0' },
                            { label: '1.15', value: '1.15' },
                            { label: '1.5', value: '1.5' },
                            { label: '2.0', value: '2.0' },
                        ].map((opt) => (
                            <button
                                key={opt.value}
                                onMouseDown={(e) => { e.preventDefault(); handleLineHeight(opt.value); }}
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-gray-700"
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Font family (bez instalací – jen bezpečné generické rodiny) */}
            <div className="relative" ref={fontFamilyDropdownRef}>
                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setShowFontFamilyDropdown(!showFontFamilyDropdown);
                        setShowFontSizeDropdown(false);
                        setShowLineHeightDropdown(false);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1"
                    title="Font (bez instalace)"
                >
                    <span className="text-xs font-bold">F</span>
                    <ChevronDownIcon className="w-3 h-3" />
                </button>
                {showFontFamilyDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]">
                        <button
                            onMouseDown={(e) => { e.preventDefault(); handleFontFamily('sans-serif'); }}
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-gray-700"
                            style={{ fontFamily: 'sans-serif' }}
                        >
                            Sans (default)
                        </button>
                        <button
                            onMouseDown={(e) => { e.preventDefault(); handleFontFamily('serif'); }}
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-gray-700"
                            style={{ fontFamily: 'serif' }}
                        >
                            Serif
                        </button>
                        <button
                            onMouseDown={(e) => { e.preventDefault(); handleFontFamily('monospace'); }}
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-gray-700"
                            style={{ fontFamily: 'monospace' }}
                        >
                            Monospace
                        </button>
                    </div>
                )}
            </div>

            <div className="w-px h-4 bg-gray-200 mx-1" />

            <ToolbarButton command="justifyLeft" icon={Bars3BottomLeftIcon} title="Zarovnat vlevo" />
            <ToolbarButton command="justifyCenter" icon={Bars3Icon} title="Zarovnat na střed" />
            <ToolbarButton command="justifyRight" icon={Bars3BottomRightIcon} title="Zarovnat vpravo" />
            <button
                onMouseDown={(e) => {
                    e.preventDefault();
                    ensureSelection?.();
                    executeCommand('justifyFull');
                }}
                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600 transition-colors"
                title="Zarovnat do bloku"
            >
                <span className="text-[10px] font-bold">J</span>
            </button>

            <div className="w-px h-4 bg-gray-200 mx-1" />

            <ToolbarButton command="insertUnorderedList" icon={ListBulletIcon} title="Seznam s odrážkami" />
            <ToolbarButton command="insertOrderedList" icon={NumberedListIcon} title="Číslovaný seznam" />

            <div className="w-px h-4 bg-gray-200 mx-1" />

            {/* Text Color */}
            <div className="relative" ref={textColorRef}>
                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setShowTextColor(!showTextColor);
                        setShowBgColor(false);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1"
                    title="Barva textu"
                >
                    <span className="text-xs font-bold">A</span>
                    <span className="w-3 h-3 rounded border border-gray-300" style={{ backgroundColor: '#111827' }} />
                </button>
                {showTextColor && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[160px]">
                        <input
                            type="color"
                            className="w-full h-8 cursor-pointer"
                            onChange={(e) => handleTextColor(e.target.value)}
                        />
                        <div className="mt-2 grid grid-cols-8 gap-1">
                            {['#111827','#374151','#6B7280','#DC2626','#F59E0B','#059669','#2563EB','#7C3AED'].map(c => (
                                <button
                                    key={c}
                                    onMouseDown={(e) => { e.preventDefault(); handleTextColor(c); }}
                                    className="w-4 h-4 rounded border border-gray-200"
                                    style={{ backgroundColor: c }}
                                    title={c}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Background/Highlight Color */}
            <div className="relative" ref={bgColorRef}>
                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setShowBgColor(!showBgColor);
                        setShowTextColor(false);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1"
                    title="Zvýraznění pozadím"
                >
                    <span className="text-xs font-bold">▇</span>
                </button>
                {showBgColor && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[160px]">
                        <input
                            type="color"
                            className="w-full h-8 cursor-pointer"
                            onChange={(e) => handleBgColor(e.target.value)}
                        />
                        <div className="mt-2 grid grid-cols-8 gap-1">
                            {['#FFFFFF','#FEF3C7','#DCFCE7','#DBEAFE','#EDE9FE','#FCE7F3','#FEE2E2','#F3F4F6'].map(c => (
                                <button
                                    key={c}
                                    onMouseDown={(e) => { e.preventDefault(); handleBgColor(c); }}
                                    className="w-4 h-4 rounded border border-gray-200"
                                    style={{ backgroundColor: c }}
                                    title={c}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="w-px h-4 bg-gray-200 mx-1" />

            {/* Links / Clear */}
            <button
                onMouseDown={(e) => {
                    e.preventDefault();
                    handleCreateLink();
                }}
                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600 transition-colors"
                title="Vložit odkaz"
            >
                <LinkIcon className="w-4 h-4" />
            </button>
            <button
                onMouseDown={(e) => {
                    e.preventDefault();
                    executeCommand('unlink');
                }}
                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600 transition-colors"
                title="Odebrat odkaz"
            >
                <NoSymbolIcon className="w-4 h-4" />
            </button>
            <button
                onMouseDown={(e) => {
                    e.preventDefault();
                    executeCommand('removeFormat');
                }}
                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600 transition-colors"
                title="Vyčistit formátování"
            >
                <span className="text-[10px] font-bold">Tx</span>
            </button>
        </div>
    );
};
