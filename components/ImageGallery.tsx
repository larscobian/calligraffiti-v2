import React, { useRef, useEffect, useCallback } from 'react';
import { Category, Image } from '../types';
import { UploadIcon, TrashIcon, EditIcon } from './icons';

interface ImageGalleryProps {
  category: Category;
  onAddImages: () => void;
  onImageClick: (image: Image, gallery: Image[]) => void;
  onDeleteImage: (categoryId: string, imageId: string) => void;
  onEditImage: (category: Category, image: Image) => void;
  isEditMode: boolean;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ category, onAddImages, onImageClick, onDeleteImage, onEditImage, isEditMode }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const images = container.querySelectorAll('.gallery-image-item');
    const containerWidth = container.offsetWidth;
    const scrollCenter = container.scrollLeft + containerWidth / 2;

    images.forEach(imageEl => {
      const el = imageEl as HTMLDivElement;
      const imageCenter = el.offsetLeft + el.offsetWidth / 2;
      const distanceFromCenter = imageCenter - scrollCenter;
      
      const scale = Math.max(0.8, 1 - Math.abs(distanceFromCenter) / (containerWidth * 1.5));
      const rotationY = (distanceFromCenter / (containerWidth / 2)) * -10;
      const zIndex = Math.round(100 - Math.abs(distanceFromCenter / 10));

      el.style.transform = `rotateY(${rotationY}deg) scale(${scale})`;
      el.style.zIndex = String(zIndex);
      el.style.opacity = `${Math.max(0.4, 1 - Math.abs(distanceFromCenter) / containerWidth)}`;
    });
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll(); 
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll, category.images]);
  
  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <section aria-labelledby={`gallery-title-${category.id}`}>
      <div className="flex justify-between items-center mb-2">
        <h2 id={`gallery-title-${category.id}`} className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-400 bg-clip-text text-transparent tracking-wide">
          {category.title}
        </h2>
        {isEditMode && (
          <button
            onClick={onAddImages}
            className="flex items-center justify-center p-2 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-500 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500"
            aria-label={`Añadir fotos a ${category.title}`}
          >
            <UploadIcon />
          </button>
        )}
      </div>
      <div ref={scrollContainerRef} className="flex overflow-x-auto space-x-2 py-4 custom-scrollbar perspective-scroll" style={{ scrollSnapType: 'x mandatory' }}>
        {category.images.map((image) => (
          <div 
            key={image.id} 
            className="gallery-image-item relative flex-shrink-0 w-64 md:w-72 rounded-lg overflow-hidden shadow-lg shadow-black/50 cursor-pointer group" 
            style={{ scrollSnapAlign: 'center' }}
            onClick={() => onImageClick(image, category.images)}
            onKeyPress={(e) => e.key === 'Enter' && onImageClick(image, category.images)}
            tabIndex={0}
            role="button"
            aria-label={`Ver imagen ${image.alt} en grande`}
          >
            <div className="aspect-[3/4] bg-gray-800 overflow-hidden">
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover transition-transform duration-300 ease-in-out"
                style={{transform: `rotate(${image.rotation || 0}deg)`}}
                loading="lazy"
              />
            </div>
            {isEditMode && (
              <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={(e) => handleActionClick(e, () => onEditImage(category, image))}
                  className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Editar imagen ${image.alt}`}
                >
                  <EditIcon />
                </button>
                <button
                  onClick={(e) => handleActionClick(e, () => onDeleteImage(category.id, image.id))}
                  className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label={`Eliminar imagen ${image.alt}`}
                >
                  <TrashIcon />
                </button>
              </div>
            )}
          </div>
        ))}
        {/* Ghost element for better snapping at the end */}
        <div className="flex-shrink-0 w-1" style={{ scrollSnapAlign: 'end' }}></div>
      </div>
    </section>
  );
};

export default ImageGallery;
