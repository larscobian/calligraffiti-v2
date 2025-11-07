import React, { useState, useEffect, useCallback } from 'react';
import ImageGallery from './components/ImageGallery';
import CategoryGridView from './components/CategoryGridView';
import Modal from './components/Modal';
import { SettingsIcon, EyeIcon, DownloadIcon } from './components/icons';
import { Category, Image } from './types';
import { CATEGORY_ORDER } from './constants';

// For File System Access API
interface FileSystemFileHandle {
  kind: 'file';
  name: string;
}
interface FileSystemDirectoryHandle {
  kind: 'directory';
  name: string;
  values(): AsyncIterable<FileSystemFileHandle | FileSystemDirectoryHandle>;
}

declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  }
}

const sortCategories = (categories: Category[]): Category[] => {
  return [...categories].sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a.title);
    const indexB = CATEGORY_ORDER.indexOf(b.title);

    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.title.localeCompare(b.title);
  });
};

const sanitizeForUrl = (name: string) => {
  const withoutExt = name.split('.').slice(0, -1).join('.');
  const extension = name.split('.').pop() || '';
  const sanitized = withoutExt.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  return extension ? `${sanitized}.${extension}` : sanitized;
};


const AdminPanel: React.FC = () => {
    const [foundData, setFoundData] = useState<Category[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    const handleSelectFolder = async () => {
      if (!window.showDirectoryPicker) {
        alert('Tu navegador no es compatible con esta función. Por favor, usa una versión reciente de Chrome, Edge u Opera.');
        return;
      }
      
      setIsLoading(true);
      setLoadingMessage('Procesando carpetas...');
      setFoundData(null);

      try {
        const rootHandle = await window.showDirectoryPicker();
        const categories: Category[] = [];

        for await (const entry of rootHandle.values()) {
          if (entry.kind === 'directory') {
            setLoadingMessage(`Leyendo categoría: ${entry.name}...`);
            const categoryHandle = entry;
            const cleanTitle = categoryHandle.name.replace(/^\d+\s*-\s*/, '');
            const category: Category = {
              id: sanitizeForUrl(cleanTitle),
              title: cleanTitle,
              images: [],
            };

            for await (const fileEntry of categoryHandle.values()) {
                if (fileEntry.kind === 'file' && fileEntry.name.match(/\.(jpe?g|png|gif|webp)$/i)) {
                    category.images.push({
                        id: fileEntry.name,
                        src: `/images/${categoryHandle.name}/${fileEntry.name}`,
                        alt: fileEntry.name,
                        rotation: 0,
                    });
                }
            }
            if (category.images.length > 0) {
                 categories.push(category);
            }
          }
        }
        setFoundData(sortCategories(categories));
      } catch (error: any) {
        // Handle user cancellation gracefully
        if (error.name !== 'AbortError') {
            console.error('Error al procesar el directorio:', error);
            alert(`Ocurrió un error: ${error.message}`);
        }
      } finally {
        setIsLoading(false);
        setLoadingMessage('');
      }
    };
    
    const handleDownloadJson = () => {
        if (!foundData) return;
        const jsonString = JSON.stringify(foundData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'portfolio.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full max-w-2xl p-8 bg-gray-800/50 rounded-lg shadow-xl border border-gray-700 text-center">
            <h2 className="text-2xl font-bold mb-4 text-purple-300">Generador de Portafolio Local</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">Esta herramienta te ayuda a crear el archivo `portfolio.json` basado en tu estructura de carpetas local.</p>
            
            <div className="text-left bg-gray-900/50 p-4 rounded-md border border-gray-600 mb-6">
                <h3 className="font-semibold text-lg mb-2">Instrucciones:</h3>
                <ol className="list-decimal list-inside text-gray-300 space-y-2 text-sm">
                    <li>Organiza tus imágenes en carpetas locales. Cada carpeta será una categoría en el catálogo.</li>
                    <li>Haz clic en el botón de abajo y selecciona la **carpeta principal** que contiene todas tus carpetas de categorías.</li>
                    <li>La herramienta generará una vista previa y un botón para descargar el archivo `portfolio.json`.</li>
                    <li>Coloca el `portfolio.json` descargado en la carpeta `public/` de tu proyecto.</li>
                    <li>Copia tus carpetas de imágenes a una nueva carpeta `public/images/` en tu proyecto.</li>
                    <li>¡Sube los cambios a GitHub para desplegar!</li>
                </ol>
            </div>

            <button
                onClick={handleSelectFolder}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 mx-auto text-lg transition-transform hover:scale-105"
            >
                Seleccionar Carpeta del Portafolio
            </button>
            
            {isLoading && (
                 <div className="mt-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
                    <p className="mt-2 text-gray-300">{loadingMessage}</p>
                </div>
            )}
            
            {foundData && (
                <div className="mt-8 text-left">
                    <h3 className="font-semibold text-lg mb-2">Resultado del Escaneo:</h3>
                    {foundData.length > 0 ? (
                        <>
                            <ul className="bg-gray-900/50 p-4 rounded-md border border-gray-600 max-h-48 overflow-y-auto">
                                {foundData.map(cat => (
                                    <li key={cat.id} className="text-sm">
                                        <span className="font-bold text-purple-300">{cat.title}</span>
                                        <span className="text-gray-400"> - {cat.images.length} imágenes encontradas</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={handleDownloadJson}
                                className="w-full mt-4 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 text-lg transition-transform hover:scale-105"
                            >
                                <DownloadIcon /> Descargar portfolio.json
                            </button>
                        </>
                    ) : (
                        <p className="text-yellow-400 text-center">No se encontraron carpetas con imágenes válidas dentro del directorio seleccionado.</p>
                    )}
                </div>
            )}

        </div>
    );
};

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Cargando catálogo...');
  const [isEditMode] = useState(() => new URLSearchParams(window.location.search).get('admin') === 'true');
  const [modalState, setModalState] = useState<{ image: Image; gallery: Image[] } | null>(null);
  const [currentView, setCurrentView] = useState<'main' | 'category'>('main');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  useEffect(() => {
    if (isEditMode) {
        setIsLoading(false);
        setLoadingMessage('');
        return;
    };
    
    const loadStaticData = async () => {
      setIsLoading(true);
      setLoadingMessage('Cargando catálogo...');
      try {
        // The portfolio.json must be in the public folder to be accessible like this.
        const response = await fetch('/portfolio.json');
        if (!response.ok) {
          throw new Error('Could not load portfolio.json. Make sure the file exists in the /public folder.');
        }
        const data: Category[] = await response.json();
        setCategories(sortCategories(data));
      } catch (error) {
        console.error("Error loading portfolio.json:", error);
        setCategories([]);
        setLoadingMessage(`Error: No se pudo cargar el portafolio. Asegúrate de que el archivo 'portfolio.json' exista en la carpeta 'public'.`);
      } finally {
        setIsLoading(false);
      }
    };
    loadStaticData();
  }, [isEditMode]);

  const handleImageClick = async (image: Image, gallery: Image[]) => {
    setModalState({ image, gallery });
  };
  
  const handleCloseModal = () => {
    setModalState(null);
  };

  const handleNextImage = () => {
    if (!modalState) return;
    const { gallery } = modalState;
    const currentIndex = gallery.findIndex(img => img.id === modalState.image.id);
    const nextIndex = (currentIndex + 1) % gallery.length;
    handleImageClick(gallery[nextIndex], gallery);
  };

  const handlePrevImage = () => {
    if (!modalState) return;
    const { gallery } = modalState;
    const currentIndex = gallery.findIndex(img => img.id === modalState.image.id);
    const prevIndex = (currentIndex - 1 + gallery.length) % gallery.length;
    handleImageClick(gallery[prevIndex], gallery);
  };

  const handleViewAllClick = (category: Category) => {
    setSelectedCategory(category);
    setCurrentView('category');
  };

  const handleBackToMain = () => {
    setCurrentView('main');
    setSelectedCategory(null);
  };
  
  const handleEnterEditMode = () => {
    window.location.search = 'admin=true';
  };
  
  const handleExitEditMode = () => {
    window.location.href = window.location.pathname;
  };
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="w-full max-w-md p-8 bg-gray-800/50 rounded-lg shadow-xl border border-gray-700 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto"></div>
            <p className="mt-4 text-gray-300">{loadingMessage}</p>
        </div>
      );
    }
    
    if (isEditMode) {
      return <AdminPanel />;
    }
    
    if (categories.length === 0) {
      return (
          <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-400">Catálogo Vacío</h3>
              <p className="text-gray-500 mt-2">No se encontraron categorías o imágenes.</p>
          </div>
      );
    }

    if (currentView === 'category' && selectedCategory) {
      return (
        <CategoryGridView
          category={selectedCategory}
          onBackToMain={handleBackToMain}
          onImageClick={handleImageClick}
        />
      );
    }

    return (
       <div className="w-full">
          {categories.map(category => (
            <ImageGallery
              key={category.id}
              category={category}
              onImageClick={handleImageClick}
              onViewAllClick={() => handleViewAllClick(category)}
              // Admin-related props are no longer needed for public view
              isEditMode={false}
              onAddImages={() => {}}
              onDeleteImage={() => {}}
              onEditImage={() => {}}
            />
          ))}
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col">
       <header className="pt-6 pb-2 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center relative">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-500 to-violet-600 bg-clip-text text-transparent">
            Ideas Calligraffiti
          </h1>
          { isEditMode ? (
             <button 
                onClick={handleExitEditMode}
                className="absolute top-0 right-0 mt-2 mr-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-3 rounded-lg text-sm flex items-center gap-2"
                title="Ver Modo Público"
            >
                <EyeIcon /> <span className="hidden md:inline">Ver Modo Público</span>
            </button>
          ) : (
            <button 
                onClick={handleEnterEditMode}
                className="absolute top-0 right-0 mt-2 mr-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-3 rounded-lg text-sm flex items-center gap-2"
                title="Administrar Contenido"
            >
                <SettingsIcon /> <span className="hidden md:inline">Administrar</span>
            </button>
          )}
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pb-4 flex-grow w-full flex flex-col items-center justify-center">
        {renderContent()}
      </main>
      
      {modalState && (
        <Modal
          image={modalState.image}
          onClose={handleCloseModal}
          onNext={handleNextImage}
          onPrev={handlePrevImage}
        />
      )}
    </div>
  );
};

export default App;