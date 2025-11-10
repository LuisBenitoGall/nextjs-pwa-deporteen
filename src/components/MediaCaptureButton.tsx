'use client';

import { useState, useRef, useEffect, ChangeEvent, ReactNode, Children, isValidElement, cloneElement, ReactElement } from 'react';
import Image from 'next/image';
import { useFormContext } from 'react-hook-form';
import { Camera, Upload, X } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';
import { saveMedia } from '@/lib/indexeddb';
import { isAndroid } from 'react-device-detect';
import { useGooglePicker, fetchGoogleDriveFile } from '@/hooks/useGooglePicker';
// Custom Tabs implementation
const Tabs = ({ 
  value, 
  onValueChange, 
  children, 
  className 
}: { 
  value: string; 
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div className={className}>
      {Children.map(children, (child) => {
        if (isValidElement(child)) {
          // Cast element and injected props to satisfy TS when cloning
          return cloneElement(child as ReactElement<any>, {
            activeValue: value,
            onValueChange,
          } as any);
        }
        return child;
      })}
    </div>
  );
};

const TabsList = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn(
    "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
    className
  )}>
    {children}
  </div>
);

const TabsTrigger = ({ 
  value, 
  children, 
  className,
  activeValue,
  onValueChange
}: { 
  value: string;
  children: React.ReactNode;
  className?: string;
  activeValue?: string;
  onValueChange?: (value: string) => void;
}) => (
  <button
    type="button"
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      activeValue === value 
        ? "bg-background text-foreground shadow-sm" 
        : "hover:bg-background/50",
      className
    )}
    onClick={() => onValueChange?.(value)}
  >
    {children}
  </button>
);

const TabsContent = ({ 
  value, 
  children, 
  className,
  activeValue
}: { 
  value: string;
  children: React.ReactNode;
  className?: string;
  activeValue?: string;
}) => (
  <div 
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      activeValue === value ? 'block' : 'hidden',
      className
    )}
  >
    {children}
  </div>
);

// Custom dialog implementation
const Dialog = ({ 
  open, 
  onOpenChange, 
  children 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
};

export interface MediaCaptureButtonProps {
  name: string;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  enableRecording?: boolean; // enable video recording with MediaRecorder
  enableDrive?: boolean;
}

export function MediaCaptureButton({ 
  name, 
  label, 
  accept = 'image/*,video/*', 
  maxSizeMB = 10,
  className = '',
  enableRecording = true,
  enableDrive = true,
}: MediaCaptureButtonProps) {
  const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const { setValue, watch, register } = useFormContext<Record<string, any>>();
  const localIdFieldName = `${name}_localId`;
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('camera');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const handleDriveFilePicked = async (file: any) => {
    try {
      const blob = await fetchGoogleDriveFile(file);
      const driveFile = new File([blob], file.name, { type: file.mimeType });
      processFile(driveFile);
    } catch (err) {
      console.error('Error processing Google Drive file:', err);
      setError('No se pudo descargar el archivo de Google Drive.');
    }
  };

  const { 
    openPicker: openDrivePicker, 
    isPickerReady: isDrivePickerReady,
    error: drivePickerError
  } = useGooglePicker({
    apiKey: GOOGLE_API_KEY || '',
    clientId: GOOGLE_CLIENT_ID || '',
    onFilePicked: handleDriveFilePicked,
  });

  useEffect(() => {
    if (drivePickerError) {
      setError(drivePickerError);
    }
  }, [drivePickerError]);

  // Watch for changes to the field value
  const fieldValue = watch(name);

  // Update preview when field value changes (e.g., from form reset)
  useEffect(() => {
    if (fieldValue && typeof fieldValue === 'string') {
      setPreview(fieldValue);
    }
  }, [fieldValue]);

  // Clean up video stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        stopCamera();
      }
    };
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera by default
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
  };

  const captureImage = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { 
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          processFile(file);
          stopCamera();
          setIsOpen(false);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    try {
      chunksRef.current = [];
      const mr = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const f = new File([blob], `recording-${Date.now()}.webm`, {
          type: 'video/webm',
          lastModified: Date.now(),
        });
        processFile(f);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch (e) {
      console.error('MediaRecorder error', e);
      setError('No se pudo iniciar la grabación.');
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    try {
      mr.stop();
    } finally {
      setIsRecording(false);
    }
  };

  const processFile = async (selectedFile: File) => {
    // Validate file size
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      setError(`El archivo es demasiado grande. El tamaño máximo permitido es ${maxSizeMB}MB.`);
      return;
    }

    setError(null);
    setFile(selectedFile);
    
    // Create preview URL
    const url = URL.createObjectURL(selectedFile);
    setPreview(url);

    // Set the file to the form
    setValue(name, selectedFile, { 
      shouldValidate: true, 
      shouldDirty: true 
    });

    // Persist to IndexedDB for offline access (always on)
    try {
      const localId = crypto.randomUUID();
      console.log('Saving media to IndexedDB with local_id:', localId, 'Type:', selectedFile.type, 'Size:', selectedFile.size, 'bytes');
      // store in form so we can relate DB row with local IndexedDB item
      setValue(localIdFieldName, localId, { shouldDirty: true });
      await saveMedia({
        id: localId,
        blob: selectedFile,
        mimeType: selectedFile.type,
        createdAt: Date.now(),
        name: selectedFile.name,
      });
      console.log('Successfully saved to IndexedDB');
    } catch (e) {
      console.error('Failed to save to IndexedDB:', e);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      stopCamera();
    } else if (activeTab === 'camera') {
      // Small delay to allow dialog to open before starting camera
      setTimeout(startCamera, 100);
    }
    setIsOpen(open);
  };

  // Start/stop camera when changing tabs while modal is open
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [activeTab, isOpen]);

  const removeFile = () => {
    setPreview(null);
    setFile(null);
    setValue(name, null, { shouldValidate: true });
    setValue(localIdFieldName, null as any, { shouldDirty: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Register the field with react-hook-form
  const { ref: formRef, ...rest } = register(name, { required: false });

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <Label htmlFor={name} className="mb-1 block text-sm font-medium">
            {label}
          </Label>
          {preview && (
            <button
              type="button"
              onClick={removeFile}
              className="inline-flex items-center rounded-md px-2 py-1 text-sm font-medium text-red-500 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1" />
              Eliminar
            </button>
          )}
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        {/* Hidden field to register localId in react-hook-form */}
        <input type="hidden" {...register(localIdFieldName as any)} />
        <button
          type="button"
          onClick={() => {
            setActiveTab('camera');
            setIsOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          <Camera className="h-4 w-4" />
          Tomar foto
        </button>
        
        <button
          type="button"
          onClick={() => {
            setActiveTab('gallery');
            fileInputRef.current?.click();
          }}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          <Upload className="h-4 w-4" />
          Subir archivo
        </button>
        
        <Input
          {...rest}
          id={name}
          type="file"
          accept={accept}
          className="hidden"
          ref={(e) => {
            formRef(e);
            fileInputRef.current = e as HTMLInputElement;
          }}
          onChange={handleFileChange}
        />

        {enableDrive && isAndroid && GOOGLE_API_KEY && GOOGLE_CLIENT_ID && (
          <>
            <button
              type="button"
              onClick={openDrivePicker}
              disabled={!isDrivePickerReady}
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              <Upload className="h-4 w-4" />
              Google Drive
            </button>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="mb-4 text-center">
          Arrastra y suelta un archivo aquí,<br />o haz clic para seleccionar
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          Seleccionar archivo
        </button>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          Formatos: JPG, PNG, GIF, MP4 (máx. {maxSizeMB}MB)
        </p>
      </div>
      {preview && (
        <div className="mt-3 relative">
          {file?.type.startsWith('image/') ? (
            <div className="relative w-full max-w-xs rounded-md overflow-hidden border">
              <Image 
                src={preview} 
                alt="Vista previa" 
                className="w-full h-auto max-h-48 object-contain"
                width={320}
                height={240}
                unoptimized={true}
              />
            </div>
          ) : file?.type.startsWith('video/') ? (
            <div className="relative w-full max-w-xs">
              <video 
                src={preview} 
                controls 
                className="w-full max-h-48 rounded-md border"
              />
            </div>
          ) : (
            <div className="border rounded-md p-3 bg-gray-50">
              <p className="text-sm text-gray-700">{file?.name}</p>
              <p className="text-xs text-gray-500">
                {file && Math.round(file.size / 1024)} KB
              </p>
            </div>
          )}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <h3 className="text-lg font-semibold leading-none tracking-tight">Tomar foto</h3>
            </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="camera">
                Cámara
              </TabsTrigger>
              <TabsTrigger value="gallery">
                Galería
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="camera" className="mt-4">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <button 
                    type="button"
                    onClick={captureImage}
                    className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 flex items-center justify-center"
                  >
                    <div className="h-12 w-12 rounded-full bg-white" />
                  </button>
                </div>
              </div>

              {/* Manual start in case autoplay permissions block getUserMedia */}
              {!streamRef.current && (
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                  >
                    Iniciar cámara
                  </button>
                </div>
              )}

              {enableRecording && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                    >
                      Grabar video
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Detener y guardar
                    </button>
                  )}

                  {isRecording && (
                    <span className="text-sm text-red-600">● Grabando...</span>
                  )}
                </div>
              )}

              {error && (
                <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
              )}
            </TabsContent>
            
            <TabsContent value="gallery" className="mt-4">
              <div 
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-4 text-center">
                  Arrastra y suelta un archivo aquí,<br />o haz clic para seleccionar
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  Seleccionar archivo
                </button>
                <p className="mt-2 text-sm text-muted-foreground text-center">
                  Formatos: JPG, PNG, GIF, MP4 (máx. {maxSizeMB}MB)
                </p>
              </div>
            </TabsContent>
          </Tabs>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default MediaCaptureButton;
