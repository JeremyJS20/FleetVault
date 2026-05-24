import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Upload, X, Check, RefreshCw, File as FileIcon } from 'lucide-react';
import { getImageProxyUrl } from '../../../Infrastructure/hooks/useUploads.js';

interface FileUploaderProps {
  value: string;
  onChange: (url: string) => void;
  onFileSelect?: (file: File | null) => void;
  label?: string;
  required?: boolean;
  accept?: string;
  maxSize?: number;
  showCamera?: boolean;
  compact?: boolean;
}

const humanSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

export const FileUploader: React.FC<FileUploaderProps> = ({
  value,
  onChange,
  onFileSelect,
  label,
  required = false,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024,
  showCamera = accept.startsWith('image/'),
  compact = false,
}) => {
  const { t } = useTranslation();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => { stopCamera(); revokeObjectUrl(); }, [revokeObjectUrl]);

  const startCamera = async () => {
    setError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err: any) {
      setIsCameraActive(false);
      if (compact) {
        fileInputRef.current?.click();
      } else {
        setError(t('fileUploader.cameraAccessDenied', 'Camera access denied.'));
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const validateAndSetFile = (file: File) => {
    setError(null);

    if (maxSize && file.size > maxSize) {
      setError(t('fileUploader.fileTooLarge', 'File too large. Max {{size}}.', { size: humanSize(maxSize) }));
      return;
    }

    if (accept !== '*') {
      const allowed = accept.split(',').map((a) => a.trim());
      const matches = allowed.some((a) => {
        if (a.endsWith('/*')) {
          const type = a.replace('/*', '/');
          return file.type.startsWith(type);
        }
        return file.type === a || file.name.endsWith(a.replace('*', ''));
      });
      if (!matches && accept !== '*/*') {
        setError(t('fileUploader.invalidFileType', 'Invalid file type. Accepted: {{accept}}.', { accept }));
        return;
      }
    }

    revokeObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    onChange(objectUrl);
    onFileSelect?.(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndSetFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    validateAndSetFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      setIsProcessing(true);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) validateAndSetFile(new File([blob], 'capture.jpg', { type: 'image/jpeg' }));
          setIsProcessing(false);
        },
        'image/jpeg',
        0.85
      );
    }
    stopCamera();
  };

  const clearFile = () => {
    revokeObjectUrl();
    onChange('');
    onFileSelect?.(null);
    setError(null);
  };

  const isImage = accept.startsWith('image/') || accept === '*/*' || accept === '*';

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <span className="text-xs font-bold text-fg-secondary flex items-center gap-1 uppercase tracking-wider">
          {label} {required && <span className="text-red-500">*</span>}
        </span>
      )}

      {error && !compact && (
        <p className="text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
          {error}
        </p>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => {
          if (!isCameraActive && !compact) {
            fileInputRef.current?.click();
          }
        }}
        className={`relative w-full ${compact ? 'aspect-[4/3] max-h-36' : 'aspect-[16/10] max-h-72'} ${compact ? 'rounded-xl' : 'rounded-2xl'} border-2 border-dashed overflow-hidden flex flex-col items-center justify-center select-none transition-all shadow-inner cursor-pointer
          ${isDragOver ? 'border-accent-primary bg-accent-primary/5 scale-[1.02]' : 'border-border-surface/40 bg-bg-inset'}
          ${isCameraActive ? 'cursor-default' : ''}
        `}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Full-screen camera overlay for compact mode */}
        {compact && isCameraActive && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col" onClick={(e) => e.stopPropagation()}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="flex-1 w-full object-cover scale-x-[-1]"
            />
            <div className="absolute inset-4 border-2 border-dashed border-white/20 rounded-2xl pointer-events-none flex items-center justify-center top-0 bottom-20">
              <span className="text-[11px] text-white/50 bg-black/40 px-3 py-1.5 rounded-md font-bold uppercase tracking-wider">
                {t('fileUploader.alignHere', 'Align Here')}
              </span>
            </div>
            <div className="flex items-center justify-around px-6 py-4 bg-black/90 border-t border-white/10">
              <button
                type="button"
                onClick={() => { stopCamera(); fileInputRef.current?.click(); }}
                className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase">{t('fileUploader.gallery', 'Gallery')}</span>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); capturePhoto(); }}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-all shadow-lg active:scale-95"
              >
                <div className="w-14 h-14 rounded-full border-2 border-black" />
              </button>
              <button
                type="button"
                onClick={() => stopCamera()}
                className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase">{t('common.cancel', 'Cancel')}</span>
              </button>
            </div>
            {isProcessing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <RefreshCw className="w-10 h-10 animate-spin text-white" />
              </div>
            )}
          </div>
        )}

        {/* Camera feed (inline, hidden in compact mode) */}
        {!compact && isCameraActive ? (
          <div className="absolute inset-0">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <div className="absolute inset-4 border-2 border-dashed border-white/20 rounded-xl pointer-events-none flex items-center justify-center">
              <span className="text-[10px] text-white/50 bg-black/40 px-2 py-1 rounded-md font-bold uppercase tracking-wider">
                {t('fileUploader.alignHere', 'Align Here')}
              </span>
            </div>
            <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-2 p-2 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); capturePhoto(); }}
                className={`${compact ? 'h-7 px-3 text-[10px]' : 'h-8 px-4 text-xs'} rounded-lg bg-accent-primary text-white font-bold flex items-center gap-1.5 hover:bg-accent-primary/80 transition-all`}
              >
                <Camera className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                {compact ? t('fileUploader.capture', 'Capture') : t('fileUploader.capture', 'Capture')}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); stopCamera(); }}
                className={`${compact ? 'h-7 px-3 text-[10px]' : 'h-8 px-4 text-xs'} rounded-lg bg-white/10 text-white font-bold flex items-center gap-1.5 hover:bg-white/20 transition-all`}
              >
                <X className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                {t('common.cancel', 'Cancel')}
              </button>
              {compact && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); stopCamera(); fileInputRef.current?.click(); }}
                  className="h-7 px-3 rounded-lg bg-white/10 text-white text-[10px] font-bold flex items-center gap-1.5 hover:bg-white/20 transition-all"
                >
                  <Upload className="w-3 h-3" />
                  {t('fileUploader.gallery', 'Gallery')}
                </button>
              )}
            </div>
          </div>
        ) : value && isImage ? (
          <>
            <img
              src={getImageProxyUrl(value)}
              alt="preview"
              className="w-full h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div className={`absolute bottom-0 inset-x-0 flex items-center justify-between gap-2 ${compact ? 'p-0.5' : 'p-2'} bg-gradient-to-t from-black/60 to-transparent`}>
              {!compact && (
                <span className="text-[10px] text-white font-bold flex items-center gap-1 px-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  {t('fileUploader.attached', 'Attached')}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                className={`${compact ? 'h-5 w-5 p-0 flex items-center justify-center ml-auto' : 'h-7 px-3'} rounded-lg bg-white/10 text-white text-[10px] font-bold flex items-center gap-1 hover:bg-white/20 transition-all`}
              >
                <X className="w-2.5 h-2.5" />
                {!compact && t('common.remove', 'Remove')}
              </button>
            </div>
          </>
        ) : value && !isImage ? (
          <div className="flex flex-col items-center gap-2 p-4" onClick={(e) => e.stopPropagation()}>
            <FileIcon className="w-10 h-10 text-fg-tertiary" />
            <span className="text-[10px] text-fg-secondary font-mono truncate max-w-full">{value.split('/').pop() || 'file'}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clearFile(); }}
              className="h-7 px-3 rounded-lg bg-accent-error/10 text-accent-error text-[10px] font-bold flex items-center gap-1 hover:bg-accent-error/20 transition-all"
            >
              <X className="w-3 h-3" />
              {t('common.remove', 'Remove')}
            </button>
          </div>
        ) : compact ? (
          <div className="flex flex-col items-center justify-center p-2 text-center text-fg-tertiary gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); startCamera(); }}
                className="w-9 h-9 rounded-full bg-bg-surface border border-border-surface/40 flex items-center justify-center hover:bg-accent-primary/10 hover:border-accent-primary/40 transition-all"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="w-9 h-9 rounded-full bg-bg-surface border border-border-surface/40 flex items-center justify-center hover:bg-accent-primary/10 hover:border-accent-primary/40 transition-all"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-fg-tertiary gap-3">
            <div className="w-12 h-12 rounded-full border border-border-surface/30 bg-white/5 flex items-center justify-center text-fg-tertiary">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-fg-secondary">{t('fileUploader.dropHere', 'Drop file here')}</p>
              <p className="text-[10px] text-fg-tertiary mt-0.5">{t('fileUploader.orClickToBrowse', 'or click to browse')}</p>
            </div>
            <div className="flex items-center gap-2">
              {isImage && showCamera && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); startCamera(); }}
                  className="h-8 px-4 rounded-lg bg-bg-surface border border-border-surface/40 text-fg-secondary text-[10px] font-bold flex items-center gap-1.5 hover:bg-bg-inset transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {t('fileUploader.camera', 'Camera')}
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="h-8 px-4 rounded-lg bg-accent-primary text-white text-[10px] font-bold flex items-center gap-1.5 hover:bg-accent-primary/80 transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                {accept.startsWith('image/') ? t('fileUploader.uploadPhoto', 'Upload Photo') : t('fileUploader.uploadFile', 'Upload File')}
              </button>
            </div>
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white">
            <RefreshCw className="w-6 h-6 animate-spin text-accent-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">
              {t('fileUploader.processing', 'Processing...')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
