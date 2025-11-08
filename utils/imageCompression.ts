/**
 * Komprese a změna velikosti obrázků před uploadem na Storage
 * 
 * Používá HTML5 Canvas API pro resize a kompresi
 * Cíl: cca 1MB, rozlišení dostatečné pro tisk (2048x1536)
 */

export interface CompressionOptions {
  maxSizeMB?: number;      // Maximální velikost souboru v MB (default: 1)
  maxWidth?: number;       // Maximální šířka v px (default: 2048)
  maxHeight?: number;      // Maximální výška v px (default: 1536)
  quality?: number;        // Kvalita JPEG 0-1 (default: 0.85)
  outputFormat?: string;   // Výstupní formát (default: 'image/jpeg')
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxSizeMB: 1,
  maxWidth: 2048,
  maxHeight: 1536,
  quality: 0.85,
  outputFormat: 'image/jpeg'
};

/**
 * Vypočítá nové rozměry při zachování poměru stran
 */
function calculateDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let newWidth = width;
  let newHeight = height;

  // Pokud je obrázek větší než max rozměry, zmenšit ho
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    newWidth = Math.round(width * ratio);
    newHeight = Math.round(height * ratio);
  }

  return { width: newWidth, height: newHeight };
}

/**
 * Komprimuje obrázek pomocí Canvas API
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    // Vytvořit Image objekt pro načtení souboru
    const img = new Image();
    img.onload = () => {
      try {
        // Vypočítat nové rozměry
        const { width, height } = calculateDimensions(
          img.width,
          img.height,
          opts.maxWidth,
          opts.maxHeight
        );

        // Vytvořit Canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        // Vykreslit obrázek na Canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context není dostupný'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Komprimovat pomocí toBlob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Nepodařilo se vytvořit komprimovaný obrázek'));
              return;
            }

            // Zkontrolovat velikost
            const sizeMB = blob.size / (1024 * 1024);
            if (sizeMB > opts.maxSizeMB) {
              // Pokud je stále příliš velký, snížit kvalitu
              const reducedQuality = Math.max(0.1, opts.quality - 0.1);
              canvas.toBlob(
                (reducedBlob) => {
                  if (!reducedBlob) {
                    reject(new Error('Nepodařilo se vytvořit komprimovaný obrázek'));
                    return;
                  }
                  const compressedFile = new File(
                    [reducedBlob],
                    file.name.replace(/\.[^/.]+$/, '.jpg'),
                    { type: opts.outputFormat }
                  );
                  resolve(compressedFile);
                },
                opts.outputFormat,
                reducedQuality
              );
            } else {
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '.jpg'),
                { type: opts.outputFormat }
              );
              resolve(compressedFile);
            }
          },
          opts.outputFormat,
          opts.quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Nepodařilo se načíst obrázek'));
    };

    // Načíst soubor jako data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => {
      reject(new Error('Nepodařilo se přečíst soubor'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Zkontroluje, zda je soubor obrázek
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Získá velikost souboru v MB
 */
export function getFileSizeMB(file: File): number {
  return file.size / (1024 * 1024);
}

