
import React, { useState } from 'react';
import { PhotoWithAnalysis } from '../types';
import { XIcon } from './icons/XIcon';
import Spinner from './Spinner';
import { ImageModal } from './ui/ImageModal';

interface ImagePreviewProps {
  photos: PhotoWithAnalysis[];
  onRemove: (index: number) => void;
  onAnalyze: (index: number) => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ photos, onRemove, onAnalyze }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const getImageSrc = (photo: PhotoWithAnalysis): string => {
    // Priorita: url (Storage) > base64 > file
    if (photo.url) {
      return photo.url;
    }
    if (photo.base64) {
      return `data:image/jpeg;base64,${photo.base64}`;
    }
    if (photo.file instanceof File) {
      return URL.createObjectURL(photo.file);
    }
    return '';
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedImageIndex(null);
  };

  const handlePrevious = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedImageIndex !== null && selectedImageIndex < photos.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  const selectedPhoto = selectedImageIndex !== null ? photos[selectedImageIndex] : null;
  const selectedImageSrc = selectedPhoto ? getImageSrc(selectedPhoto) : '';

  return (
    <>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((photo, index) => {
          const src = getImageSrc(photo);
          if (!src && !photo.isUploading) return null;

          return (
            <div key={index} className="flex flex-col gap-2 p-2 border rounded-lg bg-gray-50">
              <div className="relative group">
                {photo.isUploading ? (
                  <div className="w-full h-28 flex items-center justify-center bg-gray-200 rounded-md">
                    <Spinner small />
                  </div>
                ) : (
                  <img
                    src={src}
                    alt={`preview ${index}`}
                    className="w-full h-28 object-cover rounded-md shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleImageClick(index)}
                  />
                )}
                {!photo.isUploading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(index);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 z-10"
                    aria-label="Remove image"
                  >
                    <XIcon />
                  </button>
                )}
              </div>
              
              {photo.analysis ? (
                <div 
                  className="text-xs p-2 bg-white rounded-md prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1" 
                  dangerouslySetInnerHTML={{ __html: photo.analysis }} 
                />
              ) : !photo.isUploading ? (
                <button
                  onClick={() => onAnalyze(index)}
                  disabled={photo.isAnalyzing}
                  className="w-full text-sm px-2 py-1.5 bg-blue-100 text-blue-800 font-semibold rounded-md hover:bg-blue-200 disabled:bg-gray-200 disabled:text-gray-500 flex items-center justify-center transition-colors"
                >
                  {photo.isAnalyzing ? <Spinner small /> : 'Analyzovat fotku'}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Image Modal */}
      {selectedImageIndex !== null && selectedImageSrc && (
        <ImageModal
          isOpen={true}
          onClose={handleCloseModal}
          imageSrc={selectedImageSrc}
          imageAlt={`Fotografie ${selectedImageIndex + 1}`}
          onPrevious={selectedImageIndex > 0 ? handlePrevious : undefined}
          onNext={selectedImageIndex < photos.length - 1 ? handleNext : undefined}
          hasPrevious={selectedImageIndex > 0}
          hasNext={selectedImageIndex < photos.length - 1}
        />
      )}
    </>
  );
};

export default ImagePreview;
