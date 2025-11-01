import React, { useState, useEffect, useCallback } from 'react';
import ImageGallery from './components/ImageGallery';
import Modal from './components/Modal';
import ConfirmationModal from './components/ConfirmationModal';
import EditModal from './components/EditModal';
import ApiSettingsModal from './components/ApiSettingsModal';
import { SettingsIcon, GoogleIcon, EyeIcon, DownloadIcon } from './components/icons';
import { Category, Image } from './types';

declare global {
  interface Window {
    gapi: any;
    google: any;
    tokenClient: any;
    JSZip: any;
  }
}

const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/drive"; // Full scope to allow reading and uploading
const ROOT_FOLDER_NAME = "Calligraffiti Portafolio";

async function applyTransformations(
    imageBlob: Blob, 
    rotation: number = 0, 
    crop: { x: number; y: number; width: number; height: number; } | undefined,
    mimeType: string = 'image/jpeg'
): Promise<Blob> {
    const img = await createImageBitmap(imageBlob);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Could not get canvas context');

    const rads = rotation * Math.PI / 180;
    const cos = Math.cos(rads);
    const sin = Math.sin(rads);

    const cropRect = crop ? {
        x: img.width * (crop.x / 100),
        y: img.height * (crop.y / 100),
        width: img.width * (crop.width / 100),
        height: img.height * (crop.height / 100),
    } : { x: 0, y: 0, width: img.width, height: img.height };

    const rotatedCropWidth = Math.abs(cropRect.width * cos) + Math.abs(cropRect.height * sin);
    const rotatedCropHeight = Math.abs(cropRect.width * sin) + Math.abs(cropRect.height * cos);

    canvas.width = rotatedCropWidth;
    canvas.height = rotatedCropHeight;

    ctx.translate(rotatedCropWidth / 2, rotatedCropHeight / 2);
    ctx.rotate(rads);
    
    ctx.drawImage(
        img,
        cropRect.x,
        cropRect.y,
        cropRect.width,
        cropRect.height,
        -cropRect.width / 2,
        -cropRect.height / 2,
        cropRect.width,
        cropRect.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Canvas to Blob conversion failed'));
            }
        }, mimeType, 0.95);
    });
}

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
  const [isEditMode, setIsEditMode] = useState(() => localStorage.getItem('editMode') === 'true');

  const [modalState, setModalState] = useState<{ image: Image; gallery: Image[] } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ categoryId: string; imageId: string; } | null>(null);
  const [editingImage, setEditingImage] = useState<{category: Category, image: Image} | null>(null);
  
  useEffect(() => {
    if (isEditMode) return; // Don't load static data in edit mode
    
    const loadStaticData = async () => {
      setIsLoading(true);
      setLoadingMessage('Cargando catálogo...');
      try {
        const response = await fetch('/portfolio-data.json');
        if (!response.ok) {
          throw new Error('Could not load portfolio data.');
        }
        const data: Category[] = await response.json();
        setCategories(data);
      } catch (error) {
        console.warn("Could not load portfolio-data.json.", error);
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
      
      // Defensive client-side sort to guarantee order.
      categoryFolders.sort((a, b) => a.name.localeCompare(b.name));

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
  
const handleExportData = async () => {
    if (!window.JSZip) {
        alert("La librería de compresión (JSZip) no se ha cargado. Por favor, revisa tu conexión a internet y recarga la página.");
        return;
    }

    setIsLoading(true);
    setLoadingMessage('Iniciando exportación...');

    try {
        const zip = new window.JSZip();
        const newPublicData = [];
        const slugify = (text: string) => text.toLowerCase().replace(/[\s/]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-');

        for (const category of categories) {
            setLoadingMessage(`Procesando categoría: ${category.title}`);
            const sanitizedCategoryTitle = slugify(category.title);
            const newImages = [];
            
            for (const image of category.images) {
                try {
                    const metaResponse = await window.gapi.client.drive.files.get({
                        fileId: image.id,
                        fields: 'name, mimeType'
                    });
                    const originalName = metaResponse.result.name;
                    const mimeType = metaResponse.result.mimeType || 'image/jpeg';
                    const extension = originalName.split('.').pop() || 'jpg';
                    const sanitizedImageName = `${slugify(originalName.replace(/\.[^/.]+$/, ""))}-${image.id.slice(0, 6)}.${extension}`;
                    
                    setLoadingMessage(`Descargando: ${originalName}`);
                    const imageResponse = await window.gapi.client.drive.files.get({
                        fileId: image.id,
                        alt: 'media'
                    });

                    const imagePath = `public/images/${sanitizedCategoryTitle}/${sanitizedImageName}`;
                    
                    if (image.rotation || image.crop) {
                        setLoadingMessage(`Aplicando ediciones a: ${originalName}`);
                        const imageBlob = new Blob([imageResponse.body], { type: mimeType });
                        const processedBlob = await applyTransformations(imageBlob, image.rotation, image.crop, mimeType);
                        zip.file(imagePath, processedBlob);
                    } else {
                        zip.file(imagePath, imageResponse.body, { binary: true });
                    }
                    
                    newImages.push({
                        id: image.id,
                        src: `images/${sanitizedCategoryTitle}/${sanitizedImageName}`,
                        alt: image.alt,
                    });

                } catch (imgErr: any) {
                    console.error(`Error procesando la imagen ${image.id} (${image.alt}):`, imgErr);
                    alert(`No se pudo procesar la imagen "${image.alt}". Saltando...`);
                }
            }
            newPublicData.push({ ...category, id: sanitizedCategoryTitle, images: newImages });
        }
        
        setLoadingMessage('Generando archivo de datos...');
        zip.file('portfolio-data.json', JSON.stringify(newPublicData, null, 2));

        setLoadingMessage('Comprimiendo archivos...');
        const content = await zip.generateAsync({ type: 'blob' });
        
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = 'calligraffiti-portfolio-export.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

        alert("¡Exportación completa! Descomprime el archivo, reemplaza la carpeta 'public' y el archivo 'portfolio-data.json' en tu proyecto, y sube los cambios para desplegarlos.");

    } catch (err: any) {
        console.error("Error durante la exportación:", err);
        alert(`Ocurrió un error durante la exportación: ${err.message}`);
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
            if (tokenResponse.error) throw tokenResponse.error;
            window.gapi.client.setToken(tokenResponse);
            updateAuthStatus(true);
          },
        });

        await window.gapi.client.init({
          apiKey: apiConfig!.apiKey,
          discoveryDocs: DISCOVERY_DOCS,
        });

        if (localStorage.getItem('isAdminLoggedIn') === 'true') {
          handleAuthClick();
        }

      } catch (error) {
        console.error("Error setting up Google services:", error);
        alert("Ocurrió un error al configurar los servicios de Google. Revisa tu Client ID o API Key.");
      } finally {
        setIsInitializing(false);
        if(!isSignedIn) {
          setIsLoading(false);
          setLoadingMessage('');
        }
      }
    };
    
    if (isEditMode && gapiReady && gisReady && apiConfig) {
      initGoogleClient();
    }
  }, [isEditMode, gapiReady, gisReady, apiConfig, updateAuthStatus, handleAuthClick, isSignedIn]);
  

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
  };

  const handleImageClick = async (image: Image, gallery: Image[]) => {
    if (isEditMode && isSignedIn) {
        setLoadingMessage('Cargando imagen en alta resolución...');
        setIsLoading(true);
        try {
            const imageContent = await window.gapi.client.drive.files.get({
                fileId: image.id,
                alt: 'media'
            });
            const blob = new Blob([imageContent.body], { type: imageContent.headers['Content-Type'] });
            const objectURL = URL.createObjectURL(blob);
            setModalState({ image: { ...image, src: objectURL }, gallery });
        } catch (err) {
            console.error("Error loading full-res image:", err);
            alert("No se pudo cargar la imagen en alta resolución.");
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    } else {
        setModalState({ image, gallery });
    }
  };
  
  const handleCloseModal = () => {
    if (modalState && modalState.image.src.startsWith('blob:')) {
        URL.revokeObjectURL(modalState.image.src);
    }
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
    localStorage.setItem('editMode', 'true');
    setIsEditMode(true);
    setCategories([]);
    setIsLoading(true);
    setLoadingMessage('Cambiando a modo administrador...');
  };
  
  const handleExitEditMode = () => {
    localStorage.removeItem('editMode');
    localStorage.removeItem('isAdminLoggedIn');
    if (window.gapi && window.gapi.client) {
        window.gapi.client.setToken(null);
    }
    setIsSignedIn(false);
    setIsEditMode(false);
    window.location.reload();
  };

  const AdminControls = () => (
    <div className="fixed bottom-4 right-4 z-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-2 flex flex-col sm:flex-row items-center gap-3">
        <p className="text-sm text-purple-300 hidden sm:block">Modo Administrador</p>
        <button onClick={handleExitEditMode} className="flex items-center gap-2 text-sm bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-3 rounded-md transition-colors">
            <EyeIcon /> Ver Modo Público
        </button>
        <button onClick={handleExportData} className="flex items-center gap-2 text-sm bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-3 rounded-md transition-colors">
            <DownloadIcon /> Exportar para Publicar
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
    
    if (isEditMode) {
       if (!apiConfig) {
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

      if (!isSignedIn) {
        return (
          <div className="w-full max-w-md p-8 bg-gray-800/50 rounded-lg shadow-xl border border-gray-700 text-center">
            <h2 className="text-2xl font-bold mb-4">Modo Administrador</h2>
            <p className="text-gray-400 mb-6">Conecta tu cuenta de Google Drive para gestionar las imágenes de tu portafolio.</p>
            <button 
              onClick={handleAuthClick}
              disabled={isInitializing} 
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 mx-auto disabled:bg-gray-500 disabled:cursor-wait"
            >
              <GoogleIcon /> Conectar con Google Drive
            </button>
            {isInitializing && <p className="mt-2 text-sm text-gray-400">Inicializando servicios de Google...</p>}
          </div>
        );
      }
    }
    
    if (categories.length === 0) {
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
       <header className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center relative">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-500 to-violet-600 bg-clip-text text-transparent">
            Catálogo Calligraffiti Larsek
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            Ideas y referencias para tu próximo mural, cuadro o detalle.
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
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full flex flex-col items-center justify-center">
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