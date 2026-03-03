import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneSettings } from '../types';

interface ViewerProps {
  modelUrl: string | null;
  settings: SceneSettings;
  onModelLoaded?: (info: { vertices: number; triangles: number }) => void;
}

export const Viewer: React.FC<ViewerProps> = ({ modelUrl, settings, onModelLoaded }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Mesh | THREE.Points | null>(null);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const lightsRef = useRef<{
    ambient: THREE.AmbientLight;
    directional: THREE.DirectionalLight;
    point: THREE.PointLight;
  } | null>(null);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = settings.autoRotate;
    }
  }, [settings.autoRotate]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(settings.backgroundColor);
    sceneRef.current = scene;

    // Camera Setup
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(3, 3, 3);
    cameraRef.current = camera;

    // Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls Setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, settings.ambientLightIntensity);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, settings.directionalLightIntensity);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, settings.pointLightIntensity);
    pointLight.position.set(-5, -5, -5);
    scene.add(pointLight);

    // Helpers for debugging
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    scene.add(gridHelper);

    lightsRef.current = { ambient: ambientLight, directional: directionalLight, point: pointLight };
    setIsSceneReady(true);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        rendererRef.current = null;
      }
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      setIsSceneReady(false);
    };
  }, []);

  const fitCameraToModel = () => {
    if (!modelRef.current || !cameraRef.current || !controlsRef.current) return;

    const box = new THREE.Box3().setFromObject(modelRef.current);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Calculate the required distance to fit the model in view
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    let cameraDistance = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
    
    // Add padding and ensure a minimum distance
    cameraDistance = Math.max(cameraDistance * 1.8, 5);
    
    cameraRef.current.position.set(cameraDistance, cameraDistance, cameraDistance);
    cameraRef.current.near = Math.max(maxDim / 1000, 0.01);
    cameraRef.current.far = Math.max(maxDim * 1000, 2000);
    cameraRef.current.updateProjectionMatrix();
    
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  };

  // Handle camera reset trigger
  useEffect(() => {
    if (settings.cameraResetTrigger > 0) {
      fitCameraToModel();
    }
  }, [settings.cameraResetTrigger]);

  // Update Scene when settings change (Material & Lights only)
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(settings.backgroundColor);
    }
    if (lightsRef.current) {
      lightsRef.current.ambient.intensity = settings.ambientLightIntensity;
      lightsRef.current.directional.intensity = settings.directionalLightIntensity;
      lightsRef.current.point.intensity = settings.pointLightIntensity;
    }
    if (modelRef.current) {
      const material = (modelRef.current as any).material;
      if (material) {
        material.color.set(settings.color);
        material.opacity = settings.opacity;
        material.transparent = settings.opacity < 1;
        if (settings.renderMode === 'solid') {
          material.wireframe = settings.wireframe;
        }
      }

      // Handle Bounding Box
      const existingBox = sceneRef.current?.getObjectByName('boundingBoxHelper');
      if (settings.showBoundingBox) {
        if (!existingBox) {
          const helper = new THREE.BoxHelper(modelRef.current, 0xffff00);
          helper.name = 'boundingBoxHelper';
          sceneRef.current?.add(helper);
        }
      } else if (existingBox) {
        sceneRef.current?.remove(existingBox);
      }
    }
  }, [
    settings.backgroundColor, 
    settings.ambientLightIntensity, 
    settings.directionalLightIntensity, 
    settings.pointLightIntensity,
    settings.color,
    settings.opacity,
    settings.wireframe,
    settings.showBoundingBox
  ]);

  const [error, setError] = useState<string | null>(null);

  const loadModel = async (url: string) => {
    if (!sceneRef.current || !rendererRef.current) return;

    setError(null);
    const loader = new STLLoader();
    
    try {
      // Use fetch to get the data first, allowing better error handling
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`网络请求失败: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      
      // Basic validation: check if it's likely an HTML page instead of STL
      const decoder = new TextDecoder();
      const head = decoder.decode(buffer.slice(0, 100)).trim().toLowerCase();
      if (head.startsWith('<!doctype html') || head.startsWith('<html')) {
        throw new Error('加载的文件似乎是网页而非 STL 模型。请检查链接是否有效。');
      }

      // Parse the geometry
      const geometry = loader.parse(buffer);

      if (!sceneRef.current) return;

      // Remove old model and helpers
      if (modelRef.current) {
        sceneRef.current.remove(modelRef.current);
        const existingBox = sceneRef.current.getObjectByName('boundingBoxHelper');
        if (existingBox) sceneRef.current.remove(existingBox);
        
        if ((modelRef.current as any).geometry) (modelRef.current as any).geometry.dispose();
        if ((modelRef.current as any).material) (modelRef.current as any).material.dispose();
      }

      geometry.computeVertexNormals();
      geometry.center();

      let mesh: THREE.Mesh | THREE.Points;

      if (settings.renderMode === 'points') {
        const material = new THREE.PointsMaterial({
          color: settings.color,
          size: 0.05,
          opacity: settings.opacity,
          transparent: settings.opacity < 1
        });
        mesh = new THREE.Points(geometry, material);
      } else {
        const material = new THREE.MeshStandardMaterial({
          color: settings.color,
          wireframe: settings.renderMode === 'wireframe' || settings.wireframe,
          opacity: settings.opacity,
          transparent: settings.opacity < 1,
          roughness: 0.5,
          metalness: 0.5,
          side: THREE.DoubleSide
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }

      sceneRef.current.add(mesh);
      modelRef.current = mesh;

      // Fit camera to model
      fitCameraToModel();

      if (onModelLoaded) {
        onModelLoaded({
          vertices: geometry.attributes.position.count,
          triangles: geometry.attributes.position.count / 3
        });
      }
    } catch (err: any) {
      console.error('An error happened during loading:', err);
      setError(err.message || '加载模型时发生未知错误');
      if (onModelLoaded) {
        // Signal loading finished even on error
        onModelLoaded({ vertices: 0, triangles: 0 });
      }
    }
  };

  useEffect(() => {
    if (isSceneReady && modelUrl && sceneRef.current) {
      loadModel(modelUrl);
    }
  }, [isSceneReady, modelUrl, settings.renderMode]);

  // Use ResizeObserver for robust sizing
  useEffect(() => {
    if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;

        if (rendererRef.current && cameraRef.current) {
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(width, height);
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div id="viewer-container" ref={containerRef} className="w-full h-full relative overflow-hidden bg-slate-900">
      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-8 bg-slate-950/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/50 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-2xl font-bold">!</span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">模型加载失败</h3>
            <p className="text-sm text-slate-400 mb-6">{error}</p>
            <button 
              onClick={() => modelUrl && loadModel(modelUrl)}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all text-sm font-medium border border-slate-700"
            >
              重试加载
            </button>
          </div>
        </div>
      )}
      <style>{`
        #viewer-container canvas {
          display: block;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
    </div>
  );
};
