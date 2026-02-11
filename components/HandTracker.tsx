
import React, { useEffect, useRef } from 'react';
import { Point3D } from '../types';

interface HandTrackerProps {
  onHandsUpdate: (data: { landmarks: Point3D[][], handedness: any[] } | null) => void;
  onCameraReady: (success: boolean) => void;
}

const MP_HANDS_VERSION = "0.4.1675469240";

const HandTracker: React.FC<HandTrackerProps> = ({ onHandsUpdate, onCameraReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMounted = useRef(true);
  const handsInstance = useRef<any>(null);
  const requestRef = useRef<number>(null);

  const loadHandsScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).Hands) return resolve();
      const script = document.createElement('script');
      script.src = `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MP_HANDS_VERSION}/hands.js`;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Vision AI Load Error"));
      document.head.appendChild(script);
    });
  };

  useEffect(() => {
    isMounted.current = true;
    const setupVision = async () => {
      try {
        await loadHandsScript();
        const HandsClass = (window as any).Hands;
        const hands = new HandsClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MP_HANDS_VERSION}/${file}`
        });

        hands.setOptions({
          maxNumHands: 1, // Enfocamos recursos en una mano para máxima precisión de dedos
          modelComplexity: 1, // Mayor precisión que 0, menos carga que 2
          minDetectionConfidence: 0.75, // Más estricto para evitar detecciones falsas
          minTrackingConfidence: 0.75
        });

        hands.onResults((results: any) => {
          if (isMounted.current) {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
              onHandsUpdate({
                landmarks: results.multiHandLandmarks,
                handedness: results.multiHandedness
              });
            } else {
              onHandsUpdate(null);
            }
          }
        });

        await hands.initialize();
        handsInstance.current = hands;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 }, 
            frameRate: { ideal: 60 } 
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          const processVideo = async () => {
            if (!isMounted.current) return;
            if (videoRef.current && videoRef.current.readyState >= 2) {
              await handsInstance.current.send({ image: videoRef.current });
            }
            requestRef.current = requestAnimationFrame(processVideo);
          };
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            processVideo();
            onCameraReady(true);
          };
        }
      } catch (err) {
        onCameraReady(false);
      }
    };
    setupVision();
    return () => {
      isMounted.current = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (handsInstance.current) handsInstance.current.close();
    };
  }, []);

  return (
    <div id="video-container" className="video-active border-cyan-500/50">
      <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-cover scale-x-[-1]" />
      <div className="absolute inset-0 border-2 border-cyan-500/20 pointer-events-none rounded-xl"></div>
    </div>
  );
};

export default HandTracker;
