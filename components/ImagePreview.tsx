
import React from 'react';
import { PhotoWithAnalysis } from '../types';
import { XIcon } from './icons/XIcon';
import Spinner from './Spinner';

interface ImagePreviewProps {
  photos: PhotoWithAnalysis[];
  onRemove: (index: number) => void;
  onAnalyze: (index: number) => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ photos, onRemove, onAnalyze }) => {
  if (photos.length === 0) return null;

  return (
    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {photos.map((photo, index) => (
        <div key={index} className="flex flex-col gap-2 p-2 border rounded-lg bg-gray-50">
          <div className="relative group">
            <img
              src={URL.createObjectURL(photo.file)}
              alt={`preview ${index}`}
              className="w-full h-28 object-cover rounded-md shadow-sm"
            />
            <button
              onClick={() => onRemove(index)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
              aria-label="Remove image"
            >
              <XIcon />
            </button>
          </div>
          
          {photo.analysis ? (
            <div 
              className="text-xs p-2 bg-white rounded-md prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1" 
              dangerouslySetInnerHTML={{ __html: photo.analysis }} 
            />
          ) : (
            <button
              onClick={() => onAnalyze(index)}
              disabled={photo.isAnalyzing}
              className="w-full text-sm px-2 py-1.5 bg-blue-100 text-blue-800 font-semibold rounded-md hover:bg-blue-200 disabled:bg-gray-200 disabled:text-gray-500 flex items-center justify-center transition-colors"
            >
              {photo.isAnalyzing ? <Spinner small /> : 'Analyzovat fotku'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default ImagePreview;