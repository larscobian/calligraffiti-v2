import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Image } from '../types';
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface ModalProps {
  image: Image;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  currentIndex?: number;
  totalImages?: number;
}

const Modal: React.FC<ModalProps> = ({ image, onClose, onNext, onPrev, currentIndex = 0, totalImages = 1 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [lastTap, setLastTap] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const prevButtonRef = useRef<HTMLButtonElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  // Animación de entrada
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  // Prevenir scroll del body
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Calcular ancho de scrollbar para evitar jump
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  // Soporte para navegación nativa (botón atrás)
  useEffect(() => {
    // Push state para que el botón atrás cierre el modal
    window.history.pushState({ modal: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.modal) {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Si el modal se cierra programáticamente, retroceder el history
      if (window.history.state?.modal) {
        window.history.back();
      }
    };
  }, [onClose]);

  // Resetear zoom
  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  }, []);

  // Cerrar con animación
  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200); // Duración de la animación
  }, [onClose]);

  // Focus trap
  useEffect(() => {
    const focusableElements = [
      closeButtonRef.current,
      prevButtonRef.current,
      nextButtonRef.current,
    ].filter(Boolean) as HTMLElement[];

    if (focusableElements.length === 0) return;

    // Enfocar el botón de cerrar al abrir
    closeButtonRef.current?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
      let nextIndex: number;

      if (e.shiftKey) {
        // Shift + Tab (hacia atrás)
        nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
      } else {
        // Tab (hacia adelante)
        nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
      }

      e.preventDefault();
      focusableElements[nextIndex]?.focus();
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, []);

  // Navegación con teclado
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'ArrowRight') {
      onNext();
      resetZoom();
    } else if (e.key === 'ArrowLeft') {
      onPrev();
      resetZoom();
    }
  }, [handleClose, onNext, onPrev, resetZoom]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Doble clic para zoom
  const handleImageDoubleClick = () => {
    if (scale === 1) {
      setScale(2);
    } else {
      resetZoom();
    }
  };

  // Touch handlers para swipe y pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });

      // Detectar doble tap
      const now = Date.now();
      if (now - lastTap < 300) {
        handleImageDoubleClick();
      }
      setLastTap(now);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || e.touches.length !== 1) return;

    const deltaX = e.touches[0].clientX - touchStart.x;
    const deltaY = e.touches[0].clientY - touchStart.y;

    // Si hay zoom, permitir pan
    if (scale > 1) {
      setTranslateX(translateX + deltaX / scale);
      setTranslateY(translateY + deltaY / scale);
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    // Solo si no hay zoom, permitir swipe para navegar
    if (scale === 1) {
      const minSwipeDistance = 50;
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

      if (isHorizontalSwipe && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          onPrev();
        } else {
          onNext();
        }
      }
    }

    setTouchStart(null);
  };

  // Manejo de error de carga de imagen
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23333" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="sans-serif" font-size="18"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
  };

  return (
    <div
      ref={modalRef}
      className={`fixed inset-0 bg-black flex items-center justify-center z-[200] p-4 transition-all duration-300 ${
        isVisible ? 'bg-opacity-90' : 'bg-opacity-0'
      }`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Vista de imagen ampliada"
      style={{ touchAction: scale > 1 ? 'none' : 'auto' }}
    >
      <div
        className={`relative w-full h-full flex items-center justify-center transition-all duration-300 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Indicador de posición estilo Instagram */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[210] bg-black/50 px-3 py-1 rounded-full text-white text-sm font-medium backdrop-blur-sm">
          {currentIndex + 1} / {totalImages}
        </div>

        {/* Previous Button */}
        <button
          ref={prevButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
            resetZoom();
          }}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-[210] p-2 sm:p-3 text-white bg-transparent sm:bg-black sm:bg-opacity-40 rounded-full hover:bg-opacity-20 sm:hover:bg-opacity-60 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 sm:backdrop-blur-sm"
          aria-label="Imagen anterior"
        >
          <ChevronLeftIcon />
        </button>

        {/* Image Container - Siempre formato 3:4 */}
        <div
          className="relative w-[min(90vw,calc(85vh*3/4))] h-[min(85vh,calc(90vw*4/3))] aspect-[3/4] rounded-2xl shadow-2xl overflow-hidden flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            backgroundColor: '#000',
          }}
        >
          {/* Fondo difuminado de la imagen */}
          <div
            className="absolute inset-0 opacity-30 blur-2xl scale-110"
            style={{
              backgroundImage: `url(${image.src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* Imagen principal centrada */}
          <img
            ref={imageRef}
            src={image.src}
            alt={image.alt}
            className="relative z-10 max-w-full max-h-full object-contain cursor-zoom-in select-none"
            style={{
              transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
              transition: touchStart ? 'none' : 'transform 0.3s ease-out',
              cursor: scale > 1 ? 'grab' : 'zoom-in',
            }}
            onDoubleClick={handleImageDoubleClick}
            onError={handleImageError}
            loading="eager"
            draggable={false}
          />
        </div>

        {/* Next Button */}
        <button
          ref={nextButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            onNext();
            resetZoom();
          }}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-[210] p-2 sm:p-3 text-white bg-transparent sm:bg-black sm:bg-opacity-40 rounded-full hover:bg-opacity-20 sm:hover:bg-opacity-60 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 sm:backdrop-blur-sm"
          aria-label="Siguiente imagen"
        >
          <ChevronRightIcon />
        </button>

        {/* Close Button */}
        <button
          ref={closeButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 z-[210] p-3 text-white bg-black bg-opacity-40 rounded-full hover:bg-opacity-60 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 backdrop-blur-sm"
          aria-label="Cerrar"
        >
          <CloseIcon />
        </button>

        {/* Hint text para zoom (solo desktop) */}
        {scale === 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[210] bg-black/50 px-4 py-2 rounded-full text-white text-xs backdrop-blur-sm hidden sm:block opacity-60">
            Doble clic para hacer zoom
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
