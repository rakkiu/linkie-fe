import { useState, useCallback } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

interface ImageCropperModalProps {
  image: string;
  onCropComplete: (croppedImage: File) => void;
  onCancel: () => void;
}

export default function ImageCropperModal({ image, onCropComplete, onCancel }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteInternal = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<File> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Canvas is empty');
        }
        const file = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
        resolve(file);
      }, 'image/jpeg');
    });
  };

  const handleSave = async () => {
    try {
      if (croppedAreaPixels) {
        const croppedFile = await getCroppedImg(image, croppedAreaPixels);
        onCropComplete(croppedFile);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-8">
      <div className="relative w-full max-w-4xl h-[80vh] bg-[#1a1b2e] rounded-3xl overflow-hidden flex flex-col border border-white/10">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-bold uppercase tracking-widest text-sm">Cắt ảnh Thumbnail (16:10)</h3>
          <button onClick={onCancel} className="text-white/40 hover:text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative flex-1 bg-black/50">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1.6} // 16:10
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={onZoomChange}
          />
        </div>

        {/* Controls */}
        <div className="p-6 bg-[#0f1221] border-t border-white/10">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <span className="text-white/40 text-xs font-bold uppercase tracking-wider min-w-[60px]">Zoom</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-2xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest text-xs transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-2xl bg-teal-500 text-black font-bold uppercase tracking-widest text-xs hover:bg-teal-400 transition-all shadow-lg shadow-teal-500/20"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
