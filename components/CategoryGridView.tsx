import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [isVisible, setIsVisible] = useState(false);

  // Función para volver con animación
  const handleBack = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onBackToMain();
    }, 200);
  }, [onBackToMain]);

  // Animación de entrada + scroll a inicio
  useEffect(() => {
    // Scroll al inicio SIEMPRE que se entra a CategoryGridView
    window.scrollTo({ top: 0, behavior: 'auto' });

    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  // Soporte para navegación nativa (botón atrás)
  useEffect(() => {
    // Push state para que el botón atrás vuelva a la vista principal
    window.history.pushState({ categoryView: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.categoryView) {
        handleBack();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Si se cierra programáticamente, retroceder el history
      if (window.history.state?.categoryView) {
        window.history.back();
      }
    };
  }, [handleBack]);

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

  // Manejo de error de carga de imagen
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect fill="%23333" width="300" height="400"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="sans-serif" font-size="14"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
  };

  return (
    <div
      className={`w-full transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm pb-4 mb-6 border-b border-gray-800">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-4 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:rounded px-2 py-1"
          aria-label="Volver a la vista principal"
        >
          <ChevronLeftIcon />
          <span className="font-medium">Volver</span>
        </button>
        <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 bg-clip-text text-transparent tracking-wide">
          {category.title}
        </h2>
        <p className="text-gray-400 mt-2 text-sm md:text-base">
          {category.images.length} {category.images.length === 1 ? 'imagen' : 'imágenes'}
        </p>
      </header>

      {/* Grid de imágenes */}
      <div className={`grid ${getGridColumnClass()} gap-4 sm:gap-6`}>
        {category.images.map((image) => (
          <div
            key={image.id}
            className="group relative overflow-hidden rounded-lg shadow-lg shadow-black/50 cursor-pointer aspect-[3/4] bg-gray-800 transition-transform duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-900/30 focus-within:ring-2 focus-within:ring-purple-400"
            onClick={() => onImageClick(image, category.images)}
            onKeyPress={(e) => e.key === 'Enter' && onImageClick(image, category.images)}
            tabIndex={0}
            role="button"
            aria-label={`Ver imagen ${image.alt} en grande`}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-cover"
              style={{transform: `rotate(${image.rotation || 0}deg)`}}
              loading="lazy"
              onError={handleImageError}
            />
            {/* Overlay sutil al hacer hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </div>
        ))}
      </div>

      {/* Espaciado al final */}
      <div className="h-8" />
    </div>
  );
};

export default CategoryGridView;
