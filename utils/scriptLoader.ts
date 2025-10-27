// A singleton promise to ensure the script is loaded only once.
let docxPromise: Promise<any> | null = null;

/**
 * Dynamically loads the docx library from a CDN.
 * This function ensures the library is loaded only once and is available
 * before it's used, preventing race conditions.
 * @returns A promise that resolves with the global `docx` object.
 */
export const getDocxLibrary = (): Promise<any> => {
    // If the library is already available, return it immediately.
    if ((window as any).docx) {
        return Promise.resolve((window as any).docx);
    }

    // If the library is already being loaded, return the existing promise.
    if (docxPromise) {
        return docxPromise;
    }

    // Otherwise, create a new promise to load the script.
    docxPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.js';
        script.async = true;

        script.onload = () => {
            if ((window as any).docx) {
                resolve((window as any).docx);
            } else {
                docxPromise = null; // Reset for retry
                reject(new Error('Knihovna DOCX byla načtena, ale objekt `window.docx` není dostupný.'));
            }
        };

        script.onerror = () => {
            docxPromise = null; // Reset for retry
            reject(new Error('Nepodařilo se načíst skript knihovny DOCX. Zkontrolujte připojení k internetu.'));
        };

        document.head.appendChild(script);
    });

    return docxPromise;
};
