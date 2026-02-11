
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ThreeScene from './components/ThreeScene';
import HandTracker from './components/HandTracker';
import { Point3D, GestureState, CubeState } from './types';

const App: React.FC = () => {
  const [handsData, setHandsData] = useState<{ landmarks: Point3D[][], handedness: any[] } | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  
  // Filtro de suavizado (Exponential Moving Average)
  const smoothedPos = useRef<Point3D>({ x: 0, y: 0, z: 0 });
  const alpha = 0.25; // Factor de suavizado (menor = más suave pero más delay)

  const [cubesPos, setCubesPos] = useState<Point3D[]>([
    { x: -4, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 4, y: 0, z: 0 }
  ]);

  const gesture = useMemo((): GestureState => {
    const defaultState: GestureState = {
      fingerCount: 0,
      handPos: smoothedPos.current,
      cubes: cubesPos.map((pos, i) => ({
        id: i,
        position: pos,
        active: false,
        color: [0x3b82f6, 0xec4899, 0x10b981][i]
      }))
    };

    if (!handsData || !handsData.landmarks[0]) return defaultState;

    const landmarks = handsData.landmarks[0];
    
    // Función para calcular distancia 3D
    const dist3D = (p1: Point3D, p2: Point3D) => {
      return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
    };

    // Detección robusta: Comparamos si la punta del dedo está más lejos de la palma que el nudillo base
    const wrist = landmarks[0];
    const isExtended = (tipIdx: number, baseIdx: number) => {
      return dist3D(landmarks[tipIdx], wrist) > dist3D(landmarks[baseIdx], wrist);
    };

    const indexUp = isExtended(8, 6);
    const middleUp = isExtended(12, 10);
    const ringUp = isExtended(16, 14);
    const pinkyUp = isExtended(20, 18);

    let count = 0;
    if (indexUp && !middleUp && !ringUp && !pinkyUp) count = 1;
    else if (indexUp && middleUp && !ringUp && !pinkyUp) count = 2;
    else if (indexUp && middleUp && ringUp && !pinkyUp) count = 3;
    else if (indexUp && middleUp && ringUp && pinkyUp) count = 4; // Extra para debug o futuros

    // Captura de posición con suavizado
    const rawX = (landmarks[9].x - 0.5) * 22;
    const rawY = -(landmarks[9].y - 0.5) * 16;
    const rawZ = -landmarks[9].z * 15;

    smoothedPos.current = {
      x: smoothedPos.current.x + alpha * (rawX - smoothedPos.current.x),
      y: smoothedPos.current.y + alpha * (rawY - smoothedPos.current.y),
      z: smoothedPos.current.z + alpha * (rawZ - smoothedPos.current.z)
    };

    const updatedCubes = defaultState.cubes.map((cube, i) => {
      const isActive = count === i + 1;
      if (isActive) {
        cube.position = smoothedPos.current;
        cube.active = true;
      }
      return cube;
    });

    return {
      fingerCount: count,
      handPos: smoothedPos.current,
      cubes: updatedCubes
    };
  }, [handsData, cubesPos]);

  useEffect(() => {
    if (gesture.fingerCount > 0 && gesture.fingerCount <= 3) {
      const index = gesture.fingerCount - 1;
      const newPos = [...cubesPos];
      newPos[index] = gesture.handPos;
      setCubesPos(newPos);
    }
  }, [gesture.handPos, gesture.fingerCount]);

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center w-screen h-screen bg-[#010101] text-white">
        <div className="relative mb-8">
           <div className="absolute inset-0 blur-3xl bg-blue-500/20 rounded-full scale-150"></div>
           <h1 className="relative text-8xl font-black tracking-tighter italic">QUANTUM<span className="text-cyan-400">.</span>LINK</h1>
        </div>
        <p className="text-white/20 text-[10px] uppercase tracking-[1em] mb-12">Precision Hand-Tracking V4.0</p>
        <button onClick={() => setIsStarted(true)} className="group relative px-20 py-6 bg-transparent overflow-hidden rounded-full border border-white/10">
          <div className="absolute inset-0 bg-white group-hover:bg-cyan-400 transition-colors duration-300"></div>
          <span className="relative text-black font-black text-lg tracking-widest uppercase">Sync Biometrics</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-[#000] overflow-hidden">
      <ThreeScene gesture={gesture} hasHands={!!handsData} />
      <HandTracker onHandsUpdate={setHandsData} onCameraReady={() => {}} />
      
      <div className="absolute top-10 left-10 pointer-events-none">
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className={`flex items-center gap-4 px-5 py-3 rounded-xl border-l-4 transition-all duration-500 ${gesture.fingerCount === i ? 'bg-white/10 border-cyan-400 translate-x-4' : 'bg-black/40 border-white/5 opacity-30 grayscale'}`}>
               <span className="text-2xl font-bold font-mono">0{i}</span>
               <div className="h-4 w-[2px] bg-white/20" />
               <span className="text-[10px] uppercase tracking-widest font-bold">LOCKED_OBJECT</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-10 left-10 text-[9px] text-white/30 uppercase tracking-widest font-mono">
        <p>Coordinate_X: {gesture.handPos.x.toFixed(3)}</p>
        <p>Coordinate_Y: {gesture.handPos.y.toFixed(3)}</p>
        <p className="text-cyan-400/50">Processing_Stable: 60FPS</p>
      </div>
    </div>
  );
};

export default App;
