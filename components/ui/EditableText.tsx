import React, { useState, useRef, useEffect } from 'react';
import { RichTextToolbar } from './RichTextToolbar';

interface EditableTextProps {
    value: string;
    onChange?: (value: string) => void;
    className?: string;
    placeholder?: string;
    tagName?: keyof React.JSX.IntrinsicElements;
    readOnly?: boolean;
}

export const EditableText: React.FC<EditableTextProps> = ({
    value,
    onChange,
    className,
    placeholder,
    tagName = 'div',
    readOnly = false
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const editableRef = useRef<HTMLElement>(null);
    const lastSelectionRef = useRef<Range | null>(null);

    const normalizeHtml = (html: string): string => {
        // Převést legacy <font> tagy (z execCommand) na <span style="...">,
        // aby se formátování tisklo konzistentně.
        if (!html || !html.includes('<font')) return html;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;

        const FONT_SIZE_MAP: Record<string, string> = {
            '1': '10px',
            '2': '12px',
            '3': '14px',
            '4': '16px',
            '5': '18px',
            '6': '20px',
            '7': '24px',
        };

        const walk = (node: Node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                // Convert <font>
                if (el.tagName === 'FONT') {
                    const span = document.createElement('span');
                    const sizeAttr = el.getAttribute('size');
                    const colorAttr = el.getAttribute('color');
                    if (sizeAttr && FONT_SIZE_MAP[sizeAttr]) {
                        span.style.fontSize = FONT_SIZE_MAP[sizeAttr];
                    }
                    if (colorAttr) {
                        span.style.color = colorAttr;
                    }
                    // preserve children
                    while (el.firstChild) span.appendChild(el.firstChild);
                    el.replaceWith(span);
                    // continue walking inside new span
                    Array.from(span.childNodes).forEach(walk);
                    return;
                }
            }
            Array.from(node.childNodes).forEach(walk);
        };

        walk(wrapper);
        return wrapper.innerHTML;
    };

    // Synchronizuj value do editoru POUZE pokud není fokusovaný
    useEffect(() => {
        if (!isFocused && editableRef.current && editableRef.current.innerHTML !== value) {
            editableRef.current.innerHTML = value || '';
        }
    }, [value, isFocused]);

    const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
        setIsFocused(false);
        if (readOnly || !onChange) return;

        const rawValue = e.currentTarget.innerHTML;
        const newValue = normalizeHtml(rawValue);
        if (newValue !== rawValue && editableRef.current) {
            editableRef.current.innerHTML = newValue;
        }
        if (newValue !== value) {
            onChange(newValue);
        }
    };

    const handleInput = (e: React.FormEvent<HTMLElement>) => {
        if (readOnly || !onChange) return;

        const rawValue = e.currentTarget.innerHTML;
        const newValue = normalizeHtml(rawValue);
        if (newValue !== rawValue && editableRef.current) {
            // Nechat caret co nejstabilnější – minimal update; tohle běží jen při <font> konverzi
            editableRef.current.innerHTML = newValue;
        }
        if (newValue !== value) {
            onChange(newValue);
        }
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    const saveSelectionIfInside = () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        const root = editableRef.current;
        if (!root) return;
        const common = range.commonAncestorContainer;
        if (root === common || root.contains(common)) {
            lastSelectionRef.current = range.cloneRange();
        }
    };

    const ensureSelection = () => {
        const root = editableRef.current;
        const range = lastSelectionRef.current;
        if (!root || !range) return;
        // focus editor and restore selection
        root.focus();
        const sel = window.getSelection();
        if (!sel) return;
        sel.removeAllRanges();
        sel.addRange(range);
    };

    // Průběžně ukládat selection, dokud je editor fokusovaný (řeší „jednou jde, jednou nejde“ u toolbaru)
    useEffect(() => {
        if (!isFocused) return;
        const handler = () => saveSelectionIfInside();
        document.addEventListener('selectionchange', handler);
        return () => document.removeEventListener('selectionchange', handler);
    }, [isFocused]);

    const Tag = tagName as React.ElementType;

    if (readOnly) {
        return (
            <Tag
                className={`${className} whitespace-pre-wrap [&_ul]:list-disc [&_ul]:pl-8 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-8 [&_ol]:my-2 [&_li]:my-1`}
                dangerouslySetInnerHTML={{ __html: value }}
            />
        );
    }

    return (
        <div className="relative group/editable" ref={containerRef}>
            <RichTextToolbar
                visible={isFocused}
                onMouseDown={(e) => e.preventDefault()}
                ensureSelection={ensureSelection}
            />
            <Tag
                ref={editableRef as any}
                contentEditable
                suppressContentEditableWarning
                className={`outline-none hover:bg-yellow-50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-300 rounded px-1 transition-colors cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 whitespace-pre-wrap [&_ul]:list-disc [&_ul]:pl-8 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-8 [&_ol]:my-2 [&_li]:my-1 ${className}`}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onInput={handleInput}
                onMouseUp={saveSelectionIfInside}
                onKeyUp={saveSelectionIfInside}
                data-placeholder={placeholder}
            />
        </div>
    );
};
