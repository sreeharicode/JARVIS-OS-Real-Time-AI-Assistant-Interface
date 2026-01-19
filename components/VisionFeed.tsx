
import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, Maximize2 } from 'lucide-react';

interface VisionFeedProps {
  isActive: boolean;
  onFrame?: (base64: string) => void;
}

const VisionFeed: React.FC<VisionFeedProps> = ({ isActive, onFrame }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 },
          audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("Optical sensor offline.");
      }
    };

    if (isActive) {
      startCamera();
    } else {
      if (stream) {
        (stream as MediaStream).getTracks().forEach(track => track.stop());
      }
    }

    return () => {
      if (stream) {
        (stream as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);

  // Frame processing loop
  useEffect(() => {
    if (!isActive || !onFrame) return;

    const intervalId = setInterval(() => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = 480;
          canvas.height = 270;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
          onFrame(base64);
        }
      }
    }, 1000); // 1 FPS for efficiency

    return () => clearInterval(intervalId);
  }, [isActive, onFrame]);

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden flex items-center justify-center border border-sky-500/20 rounded-lg group">
      {isActive ? (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover opacity-60 mix-blend-screen"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Recognition Overlays (Simulated) */}
          <div className="absolute inset-0 pointer-events-none border-[20px] border-sky-500/10" />
          <div className="absolute top-1/4 left-1/4 w-32 h-32 border-l border-t border-sky-400/50" />
          <div className="absolute bottom-1/4 right-1/4 w-32 h-32 border-r border-b border-sky-400/50" />
          
          <div className="absolute top-4 right-4 flex gap-2">
            <span className="bg-sky-500/20 text-sky-400 text-[10px] px-2 py-1 rounded font-orbitron border border-sky-500/30">
              V-SYNC ACTIVE
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 text-sky-900/40">
          <CameraOff size={64} />
          <span className="font-orbitron tracking-widest text-sm">OPTICAL SENSORS STANDBY</span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-red-950/20 flex items-center justify-center">
          <span className="text-red-500 font-orbitron text-xs">{error}</span>
        </div>
      )}
    </div>
  );
};

export default VisionFeed;
