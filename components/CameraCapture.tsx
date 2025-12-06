import React, { useRef, useState, useEffect } from 'react';
import { X, Camera, RefreshCw, Check } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

const FILTERS = [
  { name: 'Normal', value: 'none', color: 'bg-white' },
  { name: 'Noir', value: 'grayscale(100%) contrast(120%)', color: 'bg-gray-900' },
  { name: 'Sepia', value: 'sepia(80%)', color: 'bg-amber-700' },
  { name: 'Matrix', value: 'sepia(100%) hue-rotate(50deg) saturate(300%) contrast(120%)', color: 'bg-green-500' },
  { name: 'Cyber', value: 'hue-rotate(180deg) contrast(120%)', color: 'bg-purple-500' },
  { name: 'Vivid', value: 'saturate(200%) contrast(110%)', color: 'bg-red-500' },
  { name: 'Cold', value: 'saturate(0) opacity(0.8) hue-rotate(180deg)', color: 'bg-blue-400' },
  { name: 'Warm', value: 'sepia(40%) saturate(150%) contrast(90%)', color: 'bg-orange-400' },
  { name: 'Dramatic', value: 'contrast(150%) saturate(110%)', color: 'bg-slate-700' },
  { name: 'Fade', value: 'brightness(110%) saturate(60%) contrast(90%)', color: 'bg-rose-200' },
  { name: 'Mono', value: 'grayscale(100%) contrast(110%)', color: 'bg-neutral-800' },
];

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Camera Error:", err);
      alert("Could not access camera.");
      onClose();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Apply filter to context
        if (activeFilter.value !== 'none') {
            context.filter = activeFilter.value;
        }
        
        // Flip horizontally if using front camera for natural mirror feel
        if (facingMode === 'user') {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Reset transform
        context.setTransform(1, 0, 0, 1, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
      }
    }
  };

  const confirmCapture = () => {
    if (capturedImage) {
        onCapture(capturedImage);
        stopCamera();
    }
  };

  const retake = () => {
      setCapturedImage(null);
  };

  const switchCamera = () => {
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/70 to-transparent">
        <button onClick={onClose} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors">
            <X size={24} />
        </button>
        <div className="text-white font-medium text-sm tracking-widest uppercase opacity-80">
            Secure Cam
        </div>
        <button onClick={switchCamera} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors">
            <RefreshCw size={24} />
        </button>
      </div>

      {/* Main View */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {capturedImage ? (
             <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
        ) : (
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                style={{ filter: activeFilter.value }}
            />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="bg-black/80 backdrop-blur-xl pb-8 pt-4 px-4 border-t border-white/10">
        {!capturedImage ? (
            <>
                {/* Filters */}
                <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x">
                    {FILTERS.map((filter) => (
                        <button
                            key={filter.name}
                            onClick={() => setActiveFilter(filter)}
                            className={`flex flex-col items-center gap-2 min-w-[60px] snap-center transition-all ${activeFilter.name === filter.name ? 'scale-110 opacity-100' : 'opacity-60 hover:opacity-100'}`}
                        >
                            <div className={`w-12 h-12 rounded-full border-2 ${activeFilter.name === filter.name ? 'border-emerald-500' : 'border-transparent'} overflow-hidden relative group`}>
                                <div className={`w-full h-full ${filter.color} opacity-50`}></div>
                                <div className="absolute inset-0 bg-gray-800 -z-10"></div>
                            </div>
                            <span className="text-[10px] text-white font-medium tracking-wide uppercase">{filter.name}</span>
                        </button>
                    ))}
                </div>

                {/* Capture Button */}
                <div className="flex justify-center pb-6">
                    <button 
                        onClick={handleCapture}
                        className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
                    >
                        <div className="w-14 h-14 bg-white rounded-full"></div>
                    </button>
                </div>
            </>
        ) : (
            <div className="flex justify-between items-center px-8 pb-8 pt-4">
                <button 
                    onClick={retake}
                    className="flex flex-col items-center text-white/80 hover:text-white transition-colors"
                >
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-1">
                        <RefreshCw size={20} />
                    </div>
                    <span className="text-xs">Retake</span>
                </button>

                <button 
                    onClick={confirmCapture}
                    className="flex flex-col items-center text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                    <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center mb-1 shadow-lg shadow-emerald-900/50">
                        <Check size={32} className="text-white" />
                    </div>
                    <span className="text-xs font-bold">Use Photo</span>
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;