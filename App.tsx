import React, { useState, useEffect, useCallback } from 'react';
import ImageGallery from './components/ImageGallery';
import Modal from './components/Modal';
import ConfirmationModal from './components/ConfirmationModal';
import EditModal from './components/EditModal';
import ApiSettingsModal from './components/ApiSettingsModal';
import { SettingsIcon, GoogleIcon } from './components/icons';
import { INITIAL_CATEGORIES } from './constants';
import { Category, Image } from './types';

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

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(
    INITIAL_CATEGORIES.map(c => ({ ...c, images: [] }))
  );
  const [apiConfig, setApiConfig] = useState<{apiKey: string, clientId: string} | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [gapiReady, setGapiReady] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [isGapiInitialized, setIsGapiInitialized] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const [modalState, setModalState] = useState<{ image: Image; gallery: Image[] } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ categoryId: string; imageId: string; } | null>(null);
  const [editingImage, setEditingImage] = useState<{category: Category, image: Image} | null>(null);

  useEffect(() => {
    const savedConfig = localStorage.getItem('googleApiConfig');
    if (savedConfig) {
      setApiConfig(JSON.parse(savedConfig));
    } else {
      setIsSettingsModalOpen(true);
    }

    // Robust script loading to prevent race conditions
    const handleGapiLoad = () => {
      window.gapi.load('client:picker', () => setGapiReady(true));
    };
    const handleGisLoad = () => {
      setGisReady(true);
    };

    const gapiScript = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
    const gisScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');

    // Check if scripts are already loaded
    if (window.gapi?.client) {
      handleGapiLoad();
    } else {
      gapiScript?.addEventListener('load', handleGapiLoad);
    }

    if (window.google?.accounts) {
      handleGisLoad();
    } else {
      gisScript?.addEventListener('load', handleGisLoad);
    }

    return () => {
        gapiScript?.removeEventListener('load', handleGapiLoad);
        gisScript?.removeEventListener('load', handleGisLoad);
    };
  }, []);

  const loadImagesFromDrive = useCallback(async () => {
    setIsLoading(true);
    try {
      setLoadingMessage(`Buscando la carpeta raíz "${ROOT_FOLDER_NAME}"...`);
      const folderRes = await window.gapi.client.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${ROOT_FOLDER_NAME}' and trashed=false`,
        fields: 'files(id, name)',
      });

      if (!folderRes.result.files || folderRes.result.files.length === 0) {
        throw new Error(`No se encontró la carpeta raíz "${ROOT_FOLDER_NAME}". Asegúrate de que exista en tu Google Drive.`);
      }
      const rootFolderId = folderRes.result.files[0].id;

      const updatedCategories = await Promise.all(
        INITIAL_CATEGORIES.map(async (category) => {
          setLoadingMessage(`Buscando categoría: ${category.title}...`);
          const subfolderRes = await window.gapi.client.drive.files.list({
            q: `'${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${category.title}' and trashed=false`,
            fields: 'files(id)',
          });

          if (!subfolderRes.result.files || subfolderRes.result.files.length === 0) {
            console.warn(`No se encontró la carpeta para la categoría: ${category.title}`);
            return { ...category, images: [] };
          }
          const categoryFolderId = subfolderRes.result.files[0].id;

          setLoadingMessage(`Cargando imágenes para ${category.title}...`);
          const imagesRes = await window.gapi.client.drive.files.list({
            q: `'${categoryFolderId}' in parents and mimeType contains 'image/' and trashed=false`,
            fields: 'files(id, name)',
          });

          const imageFiles = imagesRes.result.files || [];
          const images: Image[] = [];

          for (let i = 0; i < imageFiles.length; i++) {
              const file = imageFiles[i];
              setLoadingMessage(`Procesando imagen ${i + 1} de ${imageFiles.length} en ${category.title}...`);
              try {
                  const imageContent = await window.gapi.client.drive.files.get({
                      fileId: file.id,
                      alt: 'media'
                  });
                  const blob = new Blob([imageContent.body], { type: imageContent.headers['Content-Type'] });
                  const objectURL = URL.createObjectURL(blob);
                  
                  images.push({
                      id: file.id,
                      src: objectURL,
                      alt: file.name,
                      rotation: 0
                  });
              } catch (imgErr) {
                  console.error(`Error al cargar la imagen ${file.name} (${file.id}):`, imgErr);
              }
          }

          return { ...category, id: categoryFolderId, images };
        })
      );
      setCategories(updatedCategories);
    } catch (err: any) {
      console.error("Error loading from Drive:", err);
      const errorMessage = err.result?.error?.message || err.message || JSON.stringify(err);
      alert(`Error al cargar desde Google Drive: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, []);

  const updateAuthStatus = useCallback((signedIn: boolean) => {
    setIsSignedIn(signedIn);
    if (signedIn) {
      loadImagesFromDrive();
    }
  }, [loadImagesFromDrive]);

  useEffect(() => {
    if (gapiReady && gisReady && apiConfig) {
      window.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: apiConfig.clientId,
        scope: SCOPES,
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            throw tokenResponse.error;
          }
          window.gapi.client.setToken(tokenResponse);
          updateAuthStatus(true);
        },
      });

      window.gapi.client.init({
        apiKey: apiConfig.apiKey,
        discoveryDocs: DISCOVERY_DOCS,
      }).then(() => {
        setIsGapiInitialized(true);
      }).catch((err: any) => {
        console.error("Error initializing gapi client:", err);
        alert("Error al inicializar el cliente de Google. Revisa tu API Key.");
      });
    }
  }, [gapiReady, gisReady, apiConfig, updateAuthStatus]);
  
  useEffect(() => {
    // Cleanup object URLs on unmount to prevent memory leaks
    return () => {
        categories.forEach(category => {
            category.images.forEach(image => {
                if (image.src.startsWith('blob:')) {
                    URL.revokeObjectURL(image.src);
                }
            });
        });
    };
  }, [categories]);

  const handleAuthClick = () => {
    if (window.tokenClient) {
      window.tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  };

  const showImagePicker = async (categoryId: string) => {
    if (!apiConfig || !isGapiInitialized) return;

    const devKey = apiConfig.apiKey;
    const token = window.gapi.client.token;
    if (!token) {
      handleAuthClick();
      return;
    }
    const accessToken = token.access_token;
    
    const view = new window.google.picker.View(window.google.picker.ViewId.PHOTOS);
    view.setMimeTypes("image/jpeg,image/png,image/gif");
    const picker = new window.google.picker.PickerBuilder()
      .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
      .setAppId(apiConfig.clientId.split('-')[0]) 
      .setOAuthToken(accessToken)
      .addView(view)
      .addView(new window.google.picker.DocsUploadView().setParent(categoryId))
      .setDeveloperKey(devKey)
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
    window.location.reload(); 
  };

  const handleImageClick = (image: Image, gallery: Image[]) => setModalState({ image, gallery });
  const handleCloseModal = () => setModalState(null);

  const handleNextImage = () => {
    if (!modalState) return;
    const { image, gallery } = modalState;
    const currentIndex = gallery.findIndex(img => img.id === image.id);
    const nextIndex = (currentIndex + 1) % gallery.length;
    setModalState({ image: gallery[nextIndex], gallery });
  };

  const handlePrevImage = () => {
    if (!modalState) return;
    const { image, gallery } = modalState;
    const currentIndex = gallery.findIndex(img => img.id === image.id);
    const prevIndex = (currentIndex - 1 + gallery.length) % gallery.length;
    setModalState({ image: gallery[prevIndex], gallery });
  };
  
  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    const { imageId } = deleteConfirmation;
    try {
      await window.gapi.client.drive.files.delete({ fileId: imageId });
      const newCategories = categories.map(cat => ({
        ...cat,
        images: cat.images.filter(img => {
            if (img.id === imageId) {
                if (img.src.startsWith('blob:')) {
                    URL.revokeObjectURL(img.src);
                }
                return false;
            }
            return true;
        })
      }));
      setCategories(newCategories);
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

  const renderContent = () => {
    if (!apiConfig) {
      return (
        <div className="w-full max-w-md p-8 bg-gray-800/50 rounded-lg shadow-xl border border-gray-700 text-center">
          <h2 className="text-2xl font-bold mb-4">Configuración Requerida</h2>
          <p className="text-gray-400 mb-6 max-w-md text-center">Para conectar con Google Drive, por favor provee tu API Key y Client ID.</p>
          <button onClick={() => setIsSettingsModalOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 mx-auto">
            <SettingsIcon /> Configurar API de Google Drive
          </button>
        </div>
      );
    }

    if (!isSignedIn) {
      return (
        <div className="w-full max-w-md p-8 bg-gray-800/50 rounded-lg shadow-xl border border-gray-700 text-center">
          <h2 className="text-2xl font-bold mb-4">Conectar a Google Drive</h2>
          <p className="text-gray-400 mb-6">Accede a tus imágenes de forma segura.</p>
          <button 
            onClick={handleAuthClick}
            disabled={!isGapiInitialized} 
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 mx-auto disabled:bg-gray-500 disabled:cursor-wait"
          >
            <GoogleIcon /> Conectar con Google Drive
          </button>
          {!isGapiInitialized && <p className="mt-2 text-sm text-gray-400">Inicializando servicios de Google...</p>}
        </div>
      );
    }
    
    if (isLoading) {
      return (
        <div className="w-full max-w-md p-8 bg-gray-800/50 rounded-lg shadow-xl border border-gray-700 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto"></div>
            <p className="mt-4 text-gray-300">{loadingMessage || 'Cargando...'}</p>
        </div>
      );
    }

    return (
       <div className="space-y-4 w-full">
          {categories.map(category => (
            <ImageGallery
              key={category.id}
              category={category}
              onAddImages={() => showImagePicker(category.id)}
              onImageClick={handleImageClick}
              onDeleteImage={(catId, imgId) => setDeleteConfirmation({ categoryId: catId, imageId: imgId })}
              onEditImage={handleEditImage}
            />
          ))}
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col">
       <header className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-purple-500 to-amber-400 bg-clip-text text-transparent">
            Calligraffiti Studio Catalog
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            Ideas y referencias para tu próximo mural, cuadro o detalle.
          </p>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full flex flex-col items-center">
        {renderContent()}
      </main>
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