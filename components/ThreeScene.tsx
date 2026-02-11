
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SceneProps } from '../types';

const ThreeScene: React.FC<SceneProps> = ({ gesture, hasHands }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cubeGroups = useRef<THREE.Group[]>([]);
  const gestureRef = useRef(gesture);

  useEffect(() => {
    gestureRef.current = gesture;
  }, [gesture]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 10, 50);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 25);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.1));
    
    const hLight = new THREE.HemisphereLight(0xffffff, 0x000000, 0.5);
    scene.add(hLight);

    const handLight = new THREE.PointLight(0x22d3ee, 10, 25);
    scene.add(handLight);

    // Malla de entorno refinada
    const grid = new THREE.GridHelper(100, 80, 0x111111, 0x050505);
    grid.position.y = -6;
    scene.add(grid);

    const createCube = (color: number) => {
      const group = new THREE.Group();
      const voxCount = 3;
      const spacing = 0.5;
      const offset = ((voxCount - 1) * spacing) / 2;
      const geo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
      
      const mat = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 120,
        specular: 0xffffff,
        transparent: true,
        opacity: 0.85,
        emissive: color,
        emissiveIntensity: 0.1
      });

      for (let x = 0; x < voxCount; x++) {
        for (let y = 0; y < voxCount; y++) {
          for (let z = 0; z < voxCount; z++) {
            const m = new THREE.Mesh(geo, mat);
            m.position.set(x * spacing - offset, y * spacing - offset, z * spacing - offset);
            group.add(m);
          }
        }
      }
      return group;
    };

    const cubeColors = [0x0088ff, 0xff00cc, 0x00ffaa];
    cubeColors.forEach((color, i) => {
      const g = createCube(color);
      g.position.x = (i - 1) * 6;
      cubeGroups.current.push(g);
      scene.add(g);
    });

    const vTarget = new THREE.Vector3();

    const animate = () => {
      requestAnimationFrame(animate);
      const g = gestureRef.current;
      
      cubeGroups.current.forEach((group, i) => {
        const cubeData = g.cubes[i];
        
        if (cubeData.active) {
          vTarget.set(cubeData.position.x, cubeData.position.y, cubeData.position.z);
          // Interpolación suave pero precisa
          group.position.lerp(vTarget, 0.2);
          group.rotation.y += 0.08;
          group.rotation.z += 0.03;
          
          group.children.forEach((child, idx) => {
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshPhongMaterial;
            mesh.scale.setScalar(1.2 + Math.sin(Date.now() * 0.01 + idx) * 0.1);
            mat.emissiveIntensity = 1.0;
          });
          
          handLight.position.copy(group.position);
          handLight.intensity = 15;
          handLight.color.setHex(cubeColors[i]);
        } else {
          group.rotation.y += 0.01;
          group.rotation.x *= 0.98; // Frenado suave
          
          group.children.forEach(child => {
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshPhongMaterial;
            mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
            mat.emissiveIntensity = 0.05;
          });
        }
      });

      if (g.fingerCount === 0) {
        handLight.intensity = THREE.MathUtils.lerp(handLight.intensity, 0, 0.1);
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      cubeGroups.current.forEach(g => {
        g.children.forEach(c => {
          const m = c as THREE.Mesh;
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        });
      });
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default ThreeScene;
