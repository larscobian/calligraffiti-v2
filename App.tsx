

import React, { useState, useEffect, useCallback } from 'react';
import ImageGallery from './components/ImageGallery';
import Modal from './components/Modal';
import ConfirmationModal from './components/ConfirmationModal';
import EditModal from './components/EditModal';
import ApiSettingsModal from './components/ApiSettingsModal';
import { SettingsIcon, GoogleIcon, EyeIcon, DownloadIcon } from './components/icons';
import { Category, Image } from './types';
import { CATEGORY_ORDER } from './constants';

declare global {
  interface Window {
    gapi: any;
    google: any;
    tokenClient: any;
  }
}

const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/drive";
const ROOT_FOLDER_NAME = "Calligraffiti Portafolio";

const sortCategories = (categories: Category[]): Category[] => {
  return [...categories].sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a.title);
    const indexB = CATEGORY_ORDER.indexOf(b.title);

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB; // Both in order list, sort by index
    }
    if (indexA !== -1) {
      return -1; // A is in list, B is not. A comes first.
    }
    if (indexB !== -1) {
      return 1; // B is in list, A is not. B comes first.
    }
    return a.title.localeCompare(b.title); // Neither is in list, sort alphabetically
  });
};


const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [apiConfig, setApiConfig] = useState<{apiKey: string, clientId: string} | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [gapiReady, setGapiReady] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Cargando catálogo...');
  const [isEditMode, setIsEditMode] = useState(() => new URLSearchParams(window.location.search).get('admin') === 'true');

  const [modalState, setModalState] = useState<{ image: Image; gallery: Image[] } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ categoryId: string; imageId: string; } | null>(null);
  const [editingImage, setEditingImage] = useState<{category: Category, image: Image} | null>(null);
  
  useEffect(() => {
    if (isEditMode) return;
    
    const loadStaticData = async () => {
      setIsLoading(true);
      setLoadingMessage('Cargando catálogo...');
      try {
        const response = await fetch('/portfolio.json');
        if (!response.ok) {
          throw new Error('Could not load portfolio data.');
        }
        const data: Category[] = await response.json();
        setCategories(sortCategories(data));
      } catch (error) {
        console.warn("Could not load portfolio.json.", error);
        setCategories([]);
      } finally {
        setIsLoading(false);
        setLoadingMessage('');
      }
    };
    loadStaticData();
  }, [isEditMode]);


  useEffect(() => {
    if (!isEditMode) {
      setIsInitializing(false);
      return;
    };
    
    const savedConfig = localStorage.getItem('googleApiConfig');
    if (savedConfig) {
      setApiConfig(JSON.parse(savedConfig));
    } else {
      setIsSettingsModalOpen(true);
      setIsInitializing(false);
      setIsLoading(false);
      setLoadingMessage('');
    }

    const handleGapiLoad = () => window.gapi.load('client:picker', () => setGapiReady(true));
    const handleGisLoad = () => setGisReady(true);

    const gapiScript = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
    const gisScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');

    if (window.gapi && window.gapi.load) handleGapiLoad();
    else gapiScript?.addEventListener('load', handleGapiLoad);

    if (window.google && window.google.accounts) handleGisLoad();
    else gisScript?.addEventListener('load', handleGisLoad);

    return () => {
        gapiScript?.removeEventListener('load', handleGapiLoad);
        gisScript?.removeEventListener('load', handleGisLoad);
    };
  }, [isEditMode]);

  const loadImagesFromDrive = useCallback(async () => {
    setIsLoading(true);
    try {
      setLoadingMessage(`Buscando la carpeta raíz "${ROOT_FOLDER_NAME}"...`);
      const folderRes = await window.gapi.client.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${ROOT_FOLDER_NAME}' and trashed=false`,
        fields: 'files(id, name)',
      });

      if (!folderRes.result.files || folderRes.result.files.length === 0) {
        throw new Error(`No se encontró la carpeta raíz "${ROOT_FOLDER_NAME}". Asegúrate de que exista.`);
      }
      const rootFolderId = folderRes.result.files[0].id;

      const categoriesResponse = await window.gapi.client.drive.files.list({
        q: `'${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        orderBy: 'name',
      });

      const categoryFolders = categoriesResponse.result.files || [];

      const updatedCategories = await Promise.all(
        categoryFolders.map(async (categoryFolder) => {
          setLoadingMessage(`Cargando imágenes para ${categoryFolder.name}...`);
          const imagesRes = await window.gapi.client.drive.files.list({
            q: `'${categoryFolder.id}' in parents and mimeType contains 'image/' and trashed=false`,
            fields: 'files(id, name, thumbnailLink)',
          });

          const images: Image[] = (imagesRes.result.files || []).map(file => ({
            id: file.id,
            src: file.thumbnailLink ? file.thumbnailLink.replace(/=s\d+/, '=s800') : '',
            alt: file.name,
            rotation: 0
          }));
          
          const cleanTitle = categoryFolder.name.replace(/^\d+\s*-\s*/, '');
          return { id: categoryFolder.id, title: cleanTitle, images };
        })
      );
      setCategories(sortCategories(updatedCategories));
    } catch (err: any) {
      console.error("Error loading from Drive:", err);
      const errorMessage = err.result?.error?.message || err.message || JSON.stringify(err);
      alert(`Error al cargar desde Google Drive: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, []);
  
const handlePublishChanges = () => {
    if (categories.length === 0) {
        alert("No hay nada que publicar. Añade algunas imágenes primero.");
        return;
    }

    setLoadingMessage('Generando datos para publicación...');
    setIsLoading(true);
    
    try {
        const publicData = categories.map(category => ({
            id: category.id,
            title: category.title,
            images: category.images.map(image => ({
                id: image.id,
                src: image.src, // This is the Google Drive thumbnailLink
                alt: image.alt,
                rotation: image.rotation,
                crop: image.crop,
            }))
        }));

        const blob = new Blob([JSON.stringify(publicData, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'portfolio.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

        alert("¡Datos generados! Sube el archivo 'portfolio.json' descargado a la carpeta 'public' de tu proyecto y despliega los cambios.");

    } catch (err: any) {
        console.error("Error durante la publicación:", err);
        alert(`Ocurrió un error: ${err.message}`);
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
};


  const updateAuthStatus = useCallback((signedIn: boolean) => {
    setIsSignedIn(signedIn);
    if (signedIn) {
      localStorage.setItem('isAdminLoggedIn', 'true');
      loadImagesFromDrive();
    } else {
      localStorage.removeItem('isAdminLoggedIn');
      setCategories([]);
    }
  }, [loadImagesFromDrive]);
  
  const handleAuthClick = useCallback(() => {
    if (window.tokenClient) {
        setLoadingMessage('Esperando autenticación de Google...');
        setIsLoading(true);
        window.tokenClient.requestAccessToken({});
    }
  }, []);

  useEffect(() => {
    const initGoogleClient = async () => {
      try {
        window.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: apiConfig!.clientId,
          scope: SCOPES,
          callback: (tokenResponse: any) => {
            if (tokenResponse.error) {
              console.warn("Auth failed:", tokenResponse.error);
              setIsInitializing(false);
              setIsLoading(false);
              setLoadingMessage('');
              updateAuthStatus(false);
              return;
            };
            window.gapi.client.setToken(tokenResponse);
            updateAuthStatus(true);
          },
        });

        await window.gapi.client.init({
          apiKey: apiConfig!.apiKey,
          discoveryDocs: DISCOVERY_DOCS,
        });

        handleAuthClick();

      } catch (error) {
        console.error("Error setting up Google services:", error);
        alert("Ocurrió un error al configurar los servicios de Google. Revisa tu Client ID o API Key.");
        setIsInitializing(false);
        setIsLoading(false);
        setLoadingMessage('');
      }
    };
    
    if (isEditMode && gapiReady && gisReady && apiConfig) {
      initGoogleClient();
    }
  }, [isEditMode, gapiReady, gisReady, apiConfig, updateAuthStatus, handleAuthClick]);
  

  const showImagePicker = async (categoryId: string) => {
    if (!apiConfig || isInitializing || !isSignedIn || !window.google?.picker) return;
    const picker = new window.google.picker.PickerBuilder()
      .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
      .setOAuthToken(window.gapi.client.token.access_token)
      .addView(new window.google.picker.View(window.google.picker.ViewId.PHOTOS).setMimeTypes("image/jpeg,image/png,image/gif,image/webp"))
      .addView(new window.google.picker.DocsUploadView().setParent(categoryId))
      .setDeveloperKey(apiConfig.apiKey)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED || data.action === window.google.picker.Action.UPLOADED) {
           loadImagesFromDrive(); 
        }
      })
      .build();
    picker.setVisible(true);
  };
  
  const handleSaveApiConfig = (config: {apiKey: string, clientId: string}) => {
    localStorage.setItem('googleApiConfig', JSON.stringify(config));
    setApiConfig(config);
    setIsSettingsModalOpen(false);
    // No need to reload, useEffect will pick up the new apiConfig
  };

  const handleImageClick = async (image: Image, gallery: Image[]) => {
    // In both modes, we use the thumbnail link which is already high-res enough for the modal
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
  
  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    try {
      await window.gapi.client.drive.files.delete({ fileId: deleteConfirmation.imageId });
      setCategories(prev => prev.map(cat => ({
        ...cat,
        images: cat.images.filter(img => img.id !== deleteConfirmation.imageId)
      })));
    } catch (err) {
      console.error("Failed to delete file from Drive:", err);
      alert("No se pudo eliminar la imagen de Google Drive.");
    }
    setDeleteConfirmation(null);
  };
  
  const cancelDelete = () => setDeleteConfirmation(null);
  const handleEditImage = (category: Category, image: Image) => setEditingImage({category, image});
  const handleCloseEditModal = () => setEditingImage(null);
  const handleSaveImageEdit = (updatedImage: Image) => {
    if (!editingImage) return;
    setCategories(prev => prev.map(cat => cat.id === editingImage.category.id ? {
      ...cat,
      images: cat.images.map(img => img.id === updatedImage.id ? updatedImage : img),
    } : cat));
    setEditingImage(null);
  };
  
  const handleEnterEditMode = () => {
    window.location.search = 'admin=true';
  };
  
  const handleExitEditMode = () => {
    localStorage.removeItem('isAdminLoggedIn');
    if (window.gapi && window.gapi.client) {
        window.gapi.client.setToken(null);
    }
    // Navigate to the base URL without query params to exit admin mode
    window.location.href = window.location.pathname;
  };

  const AdminControls = () => (
    <div className="fixed bottom-4 right-4 z-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-2 flex flex-col sm:flex-row items-center gap-3">
        <p className="text-sm text-purple-300 hidden sm:block">Modo Administrador</p>
        <button onClick={handleExitEditMode} className="flex items-center gap-2 text-sm bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-3 rounded-md transition-colors">
            <EyeIcon /> Ver Modo Público
        </button>
        <button onClick={handlePublishChanges} className="flex items-center gap-2 text-sm bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-3 rounded-md transition-colors">
            <DownloadIcon /> Publicar Cambios
        </button>
    </div>
  );

  const renderContent = () => {
    if (isLoading && !modalState) {
      return (
        <div className="w-full max-w-md p-8 bg-gray-800/50 rounded-lg shadow-xl border border-gray-700 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto"></div>
            <p className="mt-4 text-gray-300">{loadingMessage}</p>
        </div>
      );
    }
    
    if (isEditMode && !apiConfig) {
      return (
        <div className="w-full max-w-md p-8 bg-gray-800/50 rounded-lg shadow-xl border border-gray-700 text-center">
          <h2 className="text-2xl font-bold mb-4">Configuración Requerida</h2>
          <p className="text-gray-400 mb-6 max-w-md text-center">Para administrar tu portafolio, conecta la app a Google Drive proveyendo tu API Key y Client ID.</p>
          <button onClick={() => setIsSettingsModalOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 mx-auto">
            <SettingsIcon /> Configurar API
          </button>
        </div>
      );
    }
    
    if (categories.length === 0) {
      if (isEditMode && !isSignedIn) {
         if (!isInitializing && !isLoading) { // Show retry button only if auth was cancelled or failed
            return (
                <div className="w-full max-w-md p-8 bg-gray-800/50 rounded-lg shadow-xl border border-gray-700 text-center">
                    <h2 className="text-2xl font-bold mb-4">Conexión a Google Drive</h2>
                    <p className="text-gray-400 mb-6">Se necesita permiso para acceder a Google Drive. Si cerraste la ventana de autenticación, puedes reintentarlo.</p>
                    <button 
                        onClick={handleAuthClick}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 mx-auto"
                    >
                        <GoogleIcon /> Reintentar Conexión
                    </button>
                </div>
            );
        }
        return null; // Don't show anything while initializing
      }
      return (
          <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-400">Catálogo Vacío</h3>
              <p className="text-gray-500 mt-2">No se encontraron categorías o imágenes.</p>
              {isEditMode && <p className="text-gray-500 mt-1">Asegúrate de que la carpeta "{ROOT_FOLDER_NAME}" en tu Google Drive tenga subcarpetas con imágenes.</p>}
          </div>
      );
    }

    return (
       <div className="w-full">
          {categories.map(category => (
            <ImageGallery
              key={category.id}
              category={category}
              onAddImages={() => showImagePicker(category.id)}
              onImageClick={handleImageClick}
              onDeleteImage={(catId, imgId) => setDeleteConfirmation({ categoryId: catId, imageId: imgId })}
              onEditImage={handleEditImage}
              isEditMode={isEditMode && isSignedIn}
            />
          ))}
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col">
       <header className="py-4 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center relative">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-500 to-violet-600 bg-clip-text text-transparent">
            Calligraffiti Lars
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            Ideas y Referencias para tu decoración
          </p>
          {!isEditMode && (
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
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-grow w-full flex flex-col items-center justify-center">
        {renderContent()}
      </main>
      
      {isEditMode && isSignedIn && <AdminControls />}

      <ApiSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSaveApiConfig}
      />
      {modalState && (
        <Modal
          image={modalState.image}
          onClose={handleCloseModal}
          onNext={handleNextImage}
          onPrev={handlePrevImage}
        />
      )}
      {isLoading && modalState && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
             <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
         </div>
      )}
      <ConfirmationModal
        isOpen={!!deleteConfirmation}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Confirmar Eliminación"
        message="¿Estás seguro de que quieres eliminar esta imagen? Esta acción la eliminará permanentemente de tu Google Drive."
      />
      {editingImage && (
        <EditModal
          image={editingImage.image}
          onClose={handleCloseEditModal}
          onSave={handleSaveImageEdit}
        />
      )}
    </div>
  );
};

export default App;