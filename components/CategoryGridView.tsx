import React, { useState, useEffect, useCallback } from 'react';
import { Category, Image } from '../types';
import { ChevronLeftIcon } from './icons';

interface CategoryGridViewProps {
  category: Category;
  onBackToMain: () => void;
  onImageClick: (image: Image, gallery: Image[]) => void;
}

const CategoryGridView: React.FC<CategoryGridViewProps> = ({ 
  category, 
  onBackToMain, 
  onImageClick 
}) => {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop' | 'large'>('desktop');

  const updateScreenSize = useCallback(() => {
    const width = window.innerWidth;
    if (width < 640) {
      setScreenSize('mobile');
    } else if (width < 1024) {
      setScreenSize('tablet');
    } else if (width < 1280) {
      setScreenSize('desktop');
    } else {
      setScreenSize('large');
    }
  }, []);

  useEffect(() => {
    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, [updateScreenSize]);

  const getGridColumnClass = () => {
    switch (screenSize) {
      case 'mobile': return 'grid-cols-2';
      case 'tablet': return 'grid-cols-3';
      case 'desktop': return 'grid-cols-4';
      case 'large': return 'grid-cols-5';
      default: return 'grid-cols-4';
    }
  };

  return (
    <div className="w-full">
      <header className="mb-6">
        <button
          onClick={onBackToMain}
          className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-4"
          aria-label="Volver a la vista principal"
        >
          <ChevronLeftIcon />
          <span>Volver</span>
        </button>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 bg-clip-text text-transparent tracking-wide">
          {category.title}
        </h2>
        <p className="text-gray-400 mt-1">{category.images.length} imágenes</p>
      </header>

      <div className={`grid ${getGridColumnClass()} gap-4 sm:gap-6`}>
        {category.images.map((image) => (
          <div 
            key={image.id}
            className="group relative overflow-hidden rounded-lg shadow-lg shadow-black/50 cursor-pointer aspect-[3/4]"
            onClick={() => onImageClick(image, category.images)}
            onKeyPress={(e) => e.key === 'Enter' && onImageClick(image, category.images)}
            tabIndex={0}
            role="button"
            aria-label={`Ver imagen ${image.alt} en grande`}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              style={{transform: `rotate(${image.rotation || 0}deg)`}}
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryGridView;