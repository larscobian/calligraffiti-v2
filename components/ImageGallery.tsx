import React, { useRef, useEffect, useCallback, useState, useMemo, useLayoutEffect } from 'react';
import { Category, Image } from '../types';
import { UploadIcon, TrashIcon, EditIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

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
  const galleryContainerRef = useRef<HTMLDivElement>(null);
  const isJumpingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const IS_INFINITE = category.images.length > 3;
  // Disable perspective on mobile for performance
  const IS_PERSPECTIVE = !isMobile;
  const CLONE_COUNT = IS_INFINITE ? Math.min(3, category.images.length) : 0;

  const extendedImages = useMemo(() => {
    if (!IS_INFINITE) return category.images;
    return [
      ...category.images.slice(-CLONE_COUNT),
      ...category.images,
      ...category.images.slice(0, CLONE_COUNT),
    ];
  }, [category.images, IS_INFINITE, CLONE_COUNT]);

  const getItems = useCallback(() => {
    return Array.from(scrollContainerRef.current?.children || []).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.classList.contains('gallery-image-item')
    );
  }, []);
  
  const handleScrollEffects = useCallback(() => {
    if (isJumpingRef.current || isMobile) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const items = getItems();
    if (items.length === 0) return;
    
    const containerWidth = container.offsetWidth;
    const scrollCenter = container.scrollLeft + containerWidth / 2;

    let closestIndex = -1;
    let minDistance = Infinity;

    items.forEach((itemEl) => {
      const el = itemEl as HTMLDivElement;
      const imageCenter = el.offsetLeft + el.offsetWidth / 2;
      const distanceFromCenter = imageCenter - scrollCenter;
      
      const absDistance = Math.abs(distanceFromCenter);
      const itemIndex = parseInt(el.dataset.index || '0', 10);
      
      if (absDistance < minDistance) {
        minDistance = absDistance;
        closestIndex = itemIndex;
      }
      
      const scale = Math.max(0.8, 1 - absDistance / (containerWidth * 1.2));
      const opacity = Math.max(0.3, 1 - absDistance / containerWidth);
      const zIndex = Math.round(100 - absDistance / 10);
      let transform = `scale(${scale})`;

      if (IS_PERSPECTIVE) {
        const rotationY = (distanceFromCenter / (containerWidth / 2)) * -20;
        const translateX = distanceFromCenter / 3.5;
        transform = `translateX(${translateX}px) rotateY(${rotationY}deg) scale(${scale})`;
      } else {
        const rotationZ = (distanceFromCenter / containerWidth) * 4;
        const translateY = absDistance / 15;
        transform = `translateY(${translateY}px) rotate(${rotationZ}deg) scale(${scale})`;
      }
      
      el.style.transform = transform;
      el.style.zIndex = String(zIndex);
      el.style.opacity = `${opacity}`;
    });
    
    if (closestIndex !== -1) {
      const centeredEl = items[closestIndex] as HTMLDivElement;
      if (centeredEl) {
        let centeredTransform = 'scale(1.05)';
        if (IS_PERSPECTIVE) {
          centeredTransform = 'rotateY(0deg) scale(1.05)';
        } else {
           centeredTransform = 'translateY(0) rotate(0) scale(1.05)';
        }
        centeredEl.style.transform = centeredTransform;
        centeredEl.style.zIndex = `101`;
        centeredEl.style.opacity = `1`;
      }
      
      const realIndex = (closestIndex - CLONE_COUNT + category.images.length) % category.images.length;
      setActiveIndex(realIndex);
    }

  }, [getItems, IS_PERSPECTIVE, CLONE_COUNT, category.images.length, isMobile]);

  const handleInfiniteJump = useCallback(() => {
    if (!IS_INFINITE || isJumpingRef.current) return;

    const container = scrollContainerRef.current;
    const items = getItems();
    if (!container || items.length < 2) return;
    
    const itemWidth = (items[0] as HTMLElement).offsetWidth;
    const itemMargin = -parseInt(window.getComputedStyle(items[0]).marginRight);
    const totalItemWidth = itemWidth - itemMargin;
    
    if (container.scrollLeft < totalItemWidth * (CLONE_COUNT - 0.5)) {
        isJumpingRef.current = true;
        container.style.scrollBehavior = 'auto';
        container.scrollLeft += category.images.length * totalItemWidth;
        container.getBoundingClientRect(); // Force style recalculation
        container.style.scrollBehavior = 'smooth';
        setTimeout(() => { 
          isJumpingRef.current = false;
          if (!isMobile) handleScrollEffects();
        }, 50);
    } 
    else if (container.scrollLeft > totalItemWidth * (category.images.length + CLONE_COUNT - 1.5)) {
        isJumpingRef.current = true;
        container.style.scrollBehavior = 'auto';
        container.scrollLeft -= category.images.length * totalItemWidth;
        container.getBoundingClientRect(); // Force style recalculation
        container.style.scrollBehavior = 'smooth';
        setTimeout(() => { 
          isJumpingRef.current = false; 
          if (!isMobile) handleScrollEffects();
        }, 50);
    }
  }, [IS_INFINITE, CLONE_COUNT, category.images.length, getItems, handleScrollEffects, isMobile]);

  const snapToCenter = useCallback(() => {
    if (isJumpingRef.current || isMobile) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const items = getItems();
    if (items.length === 0) return;

    const scrollCenter = container.scrollLeft + container.offsetWidth / 2;

    let closestItem: HTMLElement | null = null;
    let minDistance = Infinity;

    items.forEach(itemEl => {
      const el = itemEl as HTMLDivElement;
      const imageCenter = el.offsetLeft + el.offsetWidth / 2;
      const distance = Math.abs(imageCenter - scrollCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestItem = el;
      }
    });

    if (closestItem) {
      const newScrollLeft = closestItem.offsetLeft - (container.offsetWidth - closestItem.offsetWidth) / 2;
      if (Math.abs(container.scrollLeft - newScrollLeft) > 1) {
        container.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
      }
    }
  }, [getItems, isMobile]);

  const onScroll = useCallback(() => {
    if (isJumpingRef.current || isMobile) return;
    handleScrollEffects();
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => {
        handleInfiniteJump();
        snapToCenter();
    }, 200);
  }, [handleScrollEffects, handleInfiniteJump, snapToCenter, isMobile]);
  
  // DESKTOP: Use JS-driven scroll effects
  useEffect(() => {
    if (isMobile) return;
    const container = scrollContainerRef.current;
    container?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container?.removeEventListener('scroll', onScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [isMobile, onScroll]);

  // MOBILE: Use IntersectionObserver for performance
  useEffect(() => {
    if (!isMobile) return;
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const items = getItems();
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersectingEntries = entries.filter(e => e.isIntersecting);
        if (intersectingEntries.length === 0) return;

        let mostCenteredEntry = intersectingEntries[0];
        let minDistance = Infinity;
        const scrollCenter = scrollContainer.scrollLeft + scrollContainer.offsetWidth / 2;

        intersectingEntries.forEach(entry => {
            const el = entry.target as HTMLElement;
            const imageCenter = el.offsetLeft + el.offsetWidth / 2;
            const distance = Math.abs(scrollCenter - imageCenter);
            if (distance < minDistance) {
                minDistance = distance;
                mostCenteredEntry = entry;
            }
        });

        const el = mostCenteredEntry.target as HTMLElement;
        const index = parseInt(el.dataset.index || '0', 10);
        const realIndex = (index - CLONE_COUNT + category.images.length) % category.images.length;
        setActiveIndex(realIndex);
      },
      { root: scrollContainer, threshold: 0.5 }
    );
    items.forEach(item => observer.observe(item));
    return () => items.forEach(item => observer.unobserve(item));
  }, [isMobile, getItems, CLONE_COUNT, category.images.length]);

  // MOBILE: Lightweight scroll listener for infinite jump
  useEffect(() => {
      if (!isMobile) return;
      const container = scrollContainerRef.current;
      if (!container) return;
      let scrollEndTimer: number;
      const handleMobileScrollEnd = () => {
          clearTimeout(scrollEndTimer);
          scrollEndTimer = window.setTimeout(() => {
              handleInfiniteJump();
          }, 150);
      };
      container.addEventListener('scroll', handleMobileScrollEnd);
      return () => container.removeEventListener('scroll', handleMobileScrollEnd);
  }, [isMobile, handleInfiniteJump]);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const timer = setTimeout(() => {
      const items = getItems();
      if (items.length === 0) return;

      const indexToCenter = IS_INFINITE ? CLONE_COUNT : 0;
      const targetElement = items[indexToCenter] as HTMLElement;

      if (targetElement) {
        const newScrollLeft = targetElement.offsetLeft - (container.offsetWidth - targetElement.offsetWidth) / 2;
        container.scrollLeft = newScrollLeft;
        if (!isMobile) handleScrollEffects();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [IS_INFINITE, CLONE_COUNT, getItems, handleScrollEffects, category.id, extendedImages.length, isMobile]);

  useEffect(() => {
    const handleResize = () => {
      const container = scrollContainerRef.current;
      const items = getItems();
      if (!container || items.length === 0) return;

      const targetDomIndex = IS_INFINITE ? activeIndex + CLONE_COUNT : activeIndex;
      const targetElement = items[targetDomIndex] as HTMLElement;

      if (targetElement) {
        const newScrollLeft = targetElement.offsetLeft - (container.offsetWidth - targetElement.offsetWidth) / 2;
        container.style.scrollBehavior = 'auto';
        container.scrollTo({ left: newScrollLeft, behavior: 'auto' });
        container.style.scrollBehavior = '';
        if (!isMobile) handleScrollEffects();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeIndex, IS_INFINITE, CLONE_COUNT, getItems, handleScrollEffects, isMobile]);

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };
  
  const handleDotClick = (index: number) => {
    const container = scrollContainerRef.current;
    const items = getItems();
    if (!container || items.length === 0) return;
    
    const targetIndex = IS_INFINITE ? index + CLONE_COUNT : index;
    const targetElement = items[targetIndex] as HTMLElement;
    if(targetElement) {
        const newScrollLeft = targetElement.offsetLeft - (container.offsetWidth - targetElement.offsetWidth) / 2;
        container.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  };

  const handlePrevClick = () => {
    const prevIndex = (activeIndex - 1 + category.images.length) % category.images.length;
    handleDotClick(prevIndex);
  };
  const handleNextClick = () => {
    const nextIndex = (activeIndex + 1) % category.images.length;
    handleDotClick(nextIndex);
  };

  return (
    <section aria-labelledby={`gallery-title-${category.id}`} className="w-full py-4">
      <div className="text-center mb-2">
        <h2 id={`gallery-title-${category.id}`} className="text-2xl font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 bg-clip-text text-transparent tracking-wide inline-block">
          {category.title}
        </h2>
        <div className="mt-1">
          <span className="text-xs text-gray-400 hover:text-gray-300 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400 focus:rounded">
            ver todo
          </span>
        </div>
        {isEditMode && (
          <button
            onClick={onAddImages}
            className="absolute top-1/2 -translate-y-1/2 right-0 mt-6 flex items-center justify-center p-2 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-500 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500"
            aria-label={`Añadir fotos a ${category.title}`}
          >
            <UploadIcon />
          </button>
        )}
      </div>
      <div 
        ref={galleryContainerRef} 
        className="relative group"
      >
        <div 
          ref={scrollContainerRef} 
          className={`flex overflow-x-auto py-8 px-4 custom-scrollbar items-center ${IS_PERSPECTIVE ? 'perspective-scroll' : ''}`}
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {extendedImages.map((image, index) => {
             const realIndex = (index - CLONE_COUNT + category.images.length) % category.images.length;
             const isActive = realIndex === activeIndex;
             const classNames = [
                 'gallery-image-item',
                 'relative flex-shrink-0 w-72 md:w-80 rounded-2xl overflow-hidden shadow-lg shadow-black/50 cursor-pointer group',
                 'mr-[-108px] md:mr-[-120px]',
                 isMobile ? 'mobile-transform' : '',
                 isMobile && isActive ? 'is-active' : ''
             ].filter(Boolean).join(' ');

            return (
              <div 
                key={`${image.id}-${index}`} 
                data-index={index}
                className={classNames}
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
                    className="w-full h-full object-cover"
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
            )
          })}
        </div>
        {IS_INFINITE && (
          <>
            <button
              onClick={handlePrevClick}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-[102] p-2 text-white bg-black bg-opacity-20 rounded-full hover:bg-opacity-50 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 opacity-0 group-hover:opacity-100 hidden md:flex"
              aria-label="Imagen anterior"
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={handleNextClick}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-[102] p-2 text-white bg-black bg-opacity-20 rounded-full hover:bg-opacity-50 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 opacity-0 group-hover:opacity-100 hidden md:flex"
              aria-label="Siguiente imagen"
            >
              <ChevronRightIcon />
            </button>
            {/* Mobile Navigation Buttons - Always visible on mobile */}
            <button
              onClick={handlePrevClick}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-[102] p-2 text-white bg-transparent rounded-full hover:bg-opacity-20 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 md:hidden opacity-70 hover:opacity-100"
              aria-label="Imagen anterior"
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={handleNextClick}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-[102] p-2 text-white bg-transparent rounded-full hover:bg-opacity-20 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 md:hidden opacity-70 hover:opacity-100"
              aria-label="Siguiente imagen"
            >
              <ChevronRightIcon />
            </button>
          </>
        )}
      </div>
      {IS_INFINITE && (
        <div className="flex justify-center items-center mt-2 space-x-3" aria-hidden="true">
            {category.images.map((_, index) => (
                <button
                    key={index}
                    onClick={() => handleDotClick(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${index === activeIndex ? 'bg-purple-400 scale-125' : 'bg-gray-600 hover:bg-gray-500'}`}
                    aria-label={`Ir a la imagen ${index + 1}`}
                />
            ))}
        </div>
      )}
    </section>
  );
};

export default ImageGallery;