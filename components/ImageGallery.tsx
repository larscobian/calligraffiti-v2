import React, { useRef, useEffect, useCallback, useState, useMemo, useLayoutEffect } from 'react';
import { Category, Image } from '../types';
import { UploadIcon, TrashIcon, EditIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface ImageGalleryProps {
  category: Category;
  onAddImages: () => void;
  onImageClick: (image: Image, gallery: Image[]) => void;
  onDeleteImage: (categoryId: string, imageId: string) => void;
  onEditImage: (category: Category, image: Image) => void;
  onViewAllClick: () => void;
  isEditMode: boolean;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ category, onAddImages, onImageClick, onDeleteImage, onEditImage, onViewAllClick, isEditMode }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const galleryContainerRef = useRef<HTMLDivElement>(null);
  const isJumpingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const isNavigatingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };
    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);

  const isMobile = deviceType === 'mobile';
  const IS_INFINITE = category.images.length > 3;
  // Disable perspective on mobile for performance
  const IS_PERSPECTIVE = deviceType === 'desktop';
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
    if (isJumpingRef.current) return;
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

      // Calcular z-index basado en la distancia - más cerca = mayor z-index
      const zIndex = Math.round(150 - absDistance / 5);
      el.style.zIndex = String(zIndex);

      // Aplicar transformaciones según dispositivo con transiciones fluidas
      if (deviceType === 'desktop') {
        // Desktop: efectos 3D completos con transición de transparencia suave
        const scale = Math.max(0.75, 1 - absDistance / (containerWidth * 1.0));
        // Curva de opacidad más suave para mejor superposición
        const opacity = Math.max(0.3, Math.min(1, 1 - (absDistance / (containerWidth * 0.6))));
        const rotationY = (distanceFromCenter / (containerWidth / 2)) * -18;
        const translateX = distanceFromCenter / 4;
        const transform = `translateX(${translateX}px) rotateY(${rotationY}deg) scale(${scale})`;

        el.style.transform = transform;
        el.style.opacity = `${opacity}`;
      } else if (deviceType === 'tablet') {
        // Tablet: efectos intermedios con transición suave
        const scale = Math.max(0.8, 1 - absDistance / (containerWidth * 1.3));
        // Curva de opacidad más gradual
        const opacity = Math.max(0.4, Math.min(1, 1 - (absDistance / (containerWidth * 0.7))));
        const rotationZ = (distanceFromCenter / containerWidth) * 2.5;
        const translateY = absDistance / 25;
        const transform = `translateY(${translateY}px) rotate(${rotationZ}deg) scale(${scale})`;

        el.style.transform = transform;
        el.style.opacity = `${opacity}`;
      } else {
        // Móvil: efectos sutiles con transición gradual de opacidad
        const scale = Math.max(0.9, 1 - absDistance / (containerWidth * 2));
        // Transición más suave en móvil
        const opacity = Math.max(0.5, Math.min(1, 1 - (absDistance / (containerWidth * 0.8))));
        el.style.transform = `scale(${scale})`;
        el.style.opacity = `${opacity}`;
      }
    });

    if (closestIndex !== -1) {
      const centeredEl = items[closestIndex] as HTMLDivElement;
      if (centeredEl) {
        // Dar el z-index más alto a la imagen centrada
        centeredEl.style.zIndex = `200`;
        centeredEl.style.opacity = `1`;

        // Aplicar transformación según dispositivo
        if (deviceType === 'desktop') {
          centeredEl.style.transform = 'rotateY(0deg) scale(1.05)';
        } else if (deviceType === 'tablet') {
          centeredEl.style.transform = 'translateY(0) rotate(0) scale(1.02)';
        } else {
          centeredEl.style.transform = 'scale(1)';
        }
      }

      const realIndex = (closestIndex - CLONE_COUNT + category.images.length) % category.images.length;
      setActiveIndex(realIndex);
    }

  }, [getItems, IS_PERSPECTIVE, CLONE_COUNT, category.images.length, isMobile]);

  const handleInfiniteJump = useCallback(() => {
    if (!IS_INFINITE || isJumpingRef.current || isNavigatingRef.current) return;

    const container = scrollContainerRef.current;
    const items = getItems();
    if (!container || items.length < 2) return;

    const itemWidth = (items[0] as HTMLElement).offsetWidth;
    const itemMargin = Math.abs(parseInt(window.getComputedStyle(items[0]).marginRight) || 0);
    const totalItemWidth = itemWidth + itemMargin;

    // Umbrales más precisos para evitar saltos prematuros
    const leftThreshold = totalItemWidth * (CLONE_COUNT - 0.3);
    const rightThreshold = totalItemWidth * (category.images.length + CLONE_COUNT - 0.7);

    // Saltar cuando nos acercamos al borde izquierdo (clones iniciales)
    if (container.scrollLeft < leftThreshold) {
        isJumpingRef.current = true;
        container.style.scrollBehavior = 'auto';
        const jumpDistance = category.images.length * totalItemWidth;
        container.scrollLeft += jumpDistance;
        void container.offsetHeight; // Force reflow
        container.style.scrollBehavior = 'smooth';
        setTimeout(() => {
          isJumpingRef.current = false;
          handleScrollEffects();
        }, 50);
    }
    // Saltar cuando nos acercamos al borde derecho (clones finales)
    else if (container.scrollLeft > rightThreshold) {
        isJumpingRef.current = true;
        container.style.scrollBehavior = 'auto';
        const jumpDistance = category.images.length * totalItemWidth;
        container.scrollLeft -= jumpDistance;
        void container.offsetHeight; // Force reflow
        container.style.scrollBehavior = 'smooth';
        setTimeout(() => {
          isJumpingRef.current = false;
          handleScrollEffects();
        }, 50);
    }
  }, [IS_INFINITE, CLONE_COUNT, category.images.length, getItems, handleScrollEffects]);

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
    if (isJumpingRef.current || isNavigatingRef.current) return;

    // Cancelar el frame anterior si existe
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // Usar requestAnimationFrame para optimizar
    rafIdRef.current = requestAnimationFrame(() => {
      handleScrollEffects();
    });

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => {
        if (!isNavigatingRef.current) {
          handleInfiniteJump();
          // No usar snapToCenter automáticamente, causa conflictos con navegación
        }
    }, 150);
  }, [handleScrollEffects, handleInfiniteJump]);
  
  // Scroll effects para desktop y mobile
  useEffect(() => {
    const container = scrollContainerRef.current;
    container?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container?.removeEventListener('scroll', onScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [onScroll]);


  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const items = getItems();
    if (items.length === 0) return;

    const indexToCenter = IS_INFINITE ? CLONE_COUNT : 0;
    const targetElement = items[indexToCenter] as HTMLElement;

    if (targetElement) {
      const newScrollLeft = targetElement.offsetLeft - (container.offsetWidth - targetElement.offsetWidth) / 2;
      container.style.scrollBehavior = 'auto';
      container.scrollLeft = newScrollLeft;
      container.style.scrollBehavior = '';

      // Aplicar efectos inmediatamente tanto en móvil como en desktop
      requestAnimationFrame(() => handleScrollEffects());
    }
  }, [IS_INFINITE, CLONE_COUNT, getItems, handleScrollEffects, category.id, extendedImages.length]);

  useEffect(() => {
    let resizeTimer: number;

    const handleResize = () => {
      // Debounce del resize para evitar múltiples llamadas
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const container = scrollContainerRef.current;
        const items = getItems();
        if (!container || items.length === 0) return;

        const targetDomIndex = IS_INFINITE ? activeIndex + CLONE_COUNT : activeIndex;
        const targetElement = items[targetDomIndex] as HTMLElement;

        if (targetElement) {
          const newScrollLeft = targetElement.offsetLeft - (container.offsetWidth - targetElement.offsetWidth) / 2;
          container.style.scrollBehavior = 'auto';
          container.scrollLeft = newScrollLeft;

          // Forzar un reflow
          void container.offsetHeight;

          container.style.scrollBehavior = '';
          requestAnimationFrame(() => handleScrollEffects());
        }
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [activeIndex, IS_INFINITE, CLONE_COUNT, getItems, handleScrollEffects]);

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };
  
  const handleDotClick = (index: number) => {
    const container = scrollContainerRef.current;
    const items = getItems();
    if (!container || items.length === 0) return;

    // Prevenir clicks múltiples solo si ya hay uno en proceso
    if (isNavigatingRef.current) return;

    // Marcar que estamos navegando manualmente
    isNavigatingRef.current = true;

    const targetIndex = IS_INFINITE ? index + CLONE_COUNT : index;
    const targetElement = items[targetIndex] as HTMLElement;

    if(targetElement) {
        const newScrollLeft = targetElement.offsetLeft - (container.offsetWidth - targetElement.offsetWidth) / 2;

        // Actualizar el activeIndex inmediatamente
        setActiveIndex(index);

        // Scroll suave para ambas plataformas
        container.scrollTo({ left: newScrollLeft, behavior: 'smooth' });

        // Aplicar efectos inmediatamente
        setTimeout(() => {
          handleScrollEffects();
        }, 50);

        // Marcar como completado después de la animación
        setTimeout(() => {
          isNavigatingRef.current = false;
          handleScrollEffects();
        }, 400);
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
          <span 
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400 focus:rounded"
            onClick={onViewAllClick}
            onKeyPress={(e) => e.key === 'Enter' && onViewAllClick()}
            tabIndex={0}
            role="button"
            aria-label={`Ver todas las imágenes de ${category.title}`}
          >
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
                 'mr-[-80px] md:mr-[-90px]',
                 isMobile ? 'mobile-transform' : '',
                 isMobile && isActive ? 'is-active' : ''
             ].filter(Boolean).join(' ');

            return (
              <div
                key={`${image.id}-${index}`}
                data-index={index}
                className={classNames}
                style={{
                  scrollSnapAlign: 'center',
                  transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), z-index 0s',
                  willChange: 'transform, opacity, z-index'
                }}
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
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect fill="%23333" width="300" height="400"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="sans-serif" font-size="14"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
                    }}
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
            {/* Botones de navegación - Siempre visibles con z-index alto */}
            <button
              onClick={handlePrevClick}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 text-white bg-black/40 rounded-full hover:bg-black/70 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-lg backdrop-blur-sm"
              style={{ zIndex: 250 }}
              aria-label="Imagen anterior"
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={handleNextClick}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 text-white bg-black/40 rounded-full hover:bg-black/70 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-lg backdrop-blur-sm"
              style={{ zIndex: 250 }}
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