import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, RefreshCw, Eraser } from 'lucide-react';
import { getImageProxyUrl } from '../../../Infrastructure/hooks/useUploads.js';

interface SignaturePadProps {
  value?: string;
  onChange: (url: string | null) => void;
  onFileSelect?: (file: File | null) => void;
  height?: number;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ value, onChange, onFileSelect, height = 150 }) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const isExistingRemote = useMemo(() => value && !value.startsWith('blob:'), [value]);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#000000';
  }, []);

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const emitFile = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      revokeObjectUrl();
      const file = new File([blob], 'signature.png', { type: 'image/png' });
      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      onChange(objectUrl);
      onFileSelect?.(file);
    }, 'image/png');
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setIsEmpty(false);
    setIsProcessing(true);
    setTimeout(() => {
      emitFile();
      setIsProcessing(false);
    }, 100);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    revokeObjectUrl();
    setIsEmpty(true);
    onChange(null);
    onFileSelect?.(null);
  };

  return (
    <div className="space-y-3">
      {isExistingRemote ? (
        <div className="relative w-full rounded-2xl border border-border-surface/60 overflow-hidden bg-white" style={{ height: `${height}px` }}>
          <img
            src={getImageProxyUrl(value!)}
            alt="Signature"
            className="w-full h-full object-contain"
          />
        </div>
      ) : (
        <>
          <div className="relative rounded-2xl border border-border-surface/60 overflow-hidden bg-bg-inset">
            <canvas
              ref={canvasRef}
              height={height}
              className="w-full block touch-none cursor-crosshair bg-white"
              style={{ height: `${height}px` }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              width={500}
            />

            {isEmpty && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <span className="text-xs font-medium tracking-wide text-fg-tertiary select-none">
                  {t('signaturePad.placeholder')}
                </span>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center">
                <RefreshCw className="w-5 h-5 animate-spin text-accent-primary" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between min-h-[36px]">
            <div className={`flex items-center gap-1.5 text-[11px] font-bold text-emerald-500 uppercase tracking-wider transition-opacity duration-150 ${isEmpty ? 'opacity-0' : 'opacity-100'}`}>
              <Check className="w-3.5 h-3.5" />
              {t('signaturePad.signed', 'Signature captured')}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={clearSignature}
                className={`h-8 px-3.5 rounded-lg border border-border-surface/40 bg-bg-surface/30 hover:bg-bg-surface text-fg-secondary text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-150 ${isEmpty ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
              >
                <Eraser className="w-3.5 h-3.5" />
                {t('signaturePad.clear', 'Clear & Redraw')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SignaturePad;
