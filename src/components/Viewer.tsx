import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { SceneSettings } from '../types';

interface ViewerProps {
  modelUrl: string | null;
  settings: SceneSettings;
  onModelLoaded?: (info: { vertices: number; triangles: number }) => void;
}

export const Viewer: React.FC<ViewerProps> = ({ modelUrl, settings, onModelLoaded }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<STLLoader | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Mesh | THREE.Points | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const lightsRef = useRef<{
    ambient: THREE.AmbientLight;
    directional: THREE.DirectionalLight;
    point: THREE.PointLight;
    hemisphere: THREE.HemisphereLight;
  } | null>(null);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const removeBoundingBox = () => {
    const existingBox = sceneRef.current?.getObjectByName('boundingBoxHelper');
    if (existingBox && sceneRef.current) {
      sceneRef.current.remove(existingBox);
    }
  };

  const normalizeGeometry = (geometry: THREE.BufferGeometry) => {
    geometry.computeBoundingBox();

    const boundingBox = geometry.boundingBox;
    if (!boundingBox) return geometry;

    const size = boundingBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    geometry.center();

    if (maxDim > 0) {
      const targetSize = 2.5;
      const scale = targetSize / maxDim;
      geometry.scale(scale, scale, scale);
    }

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.computeVertexNormals();

    return geometry;
  };

  const updateBoundingBox = () => {
    if (!sceneRef.current) return;

    removeBoundingBox();

    if (settings.showBoundingBox && modelRef.current) {
      const helper = new THREE.BoxHelper(modelRef.current, 0xffff00);
      helper.name = 'boundingBoxHelper';
      sceneRef.current.add(helper);
    }
  };

  const disposeMaterial = (material: THREE.Material | THREE.Material[]) => {
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
      return;
    }

    material.dispose();
  };

  const disposeCurrentModel = (disposeGeometry: boolean) => {
    removeBoundingBox();

    if (sceneRef.current && modelRef.current) {
      sceneRef.current.remove(modelRef.current);
    }

    if (modelRef.current) {
      disposeMaterial(modelRef.current.material);
      modelRef.current = null;
    }

    if (disposeGeometry && geometryRef.current) {
      geometryRef.current.dispose();
      geometryRef.current = null;
    }
  };

  const fitCameraToModel = () => {
    if (!modelRef.current || !cameraRef.current || !controlsRef.current) return;

    const box = new THREE.Box3().setFromObject(modelRef.current);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const fov = cameraRef.current.fov * (Math.PI / 180);
    const distance = Math.max(maxDim / (2 * Math.tan(fov / 2)) * 1.8, 4);

    cameraRef.current.position.set(distance, distance, distance);
    cameraRef.current.near = Math.max(maxDim / 100, 0.01);
    cameraRef.current.far = Math.max(maxDim * 100, 2000);
    cameraRef.current.updateProjectionMatrix();

    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  };

  const applyModelAppearance = () => {
    if (!modelRef.current) return;

    const material = modelRef.current.material;

    if (material instanceof THREE.MeshStandardMaterial) {
      material.color.set(settings.color);
      material.opacity = settings.opacity;
      material.transparent = settings.opacity < 1;
      material.wireframe = settings.renderMode === 'wireframe' || settings.wireframe;
      material.needsUpdate = true;
    }

    if (material instanceof THREE.PointsMaterial) {
      material.color.set(settings.color);
      material.opacity = settings.opacity;
      material.transparent = settings.opacity < 1;
      material.needsUpdate = true;
    }

    updateBoundingBox();
  };

  const createModelObject = (geometry: THREE.BufferGeometry) => {
    if (settings.renderMode === 'points') {
      return new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          color: settings.color,
          size: 0.06,
          opacity: settings.opacity,
          transparent: settings.opacity < 1,
        }),
      );
    }

    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: settings.color,
        wireframe: settings.renderMode === 'wireframe' || settings.wireframe,
        opacity: settings.opacity,
        transparent: settings.opacity < 1,
        roughness: 0.45,
        metalness: 0.2,
        side: THREE.DoubleSide,
      }),
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const renderGeometry = (geometry: THREE.BufferGeometry, resetCamera: boolean) => {
    if (!sceneRef.current) return;

    disposeCurrentModel(false);

    const model = createModelObject(geometry);
    sceneRef.current.add(model);
    modelRef.current = model;

    applyModelAppearance();

    if (resetCamera) {
      fitCameraToModel();
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.querySelectorAll('canvas').forEach((canvas) => canvas.remove());

    loaderRef.current = new STLLoader();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(settings.backgroundColor);
    sceneRef.current = scene;

    const initialWidth = container.clientWidth || 1;
    const initialHeight = container.clientHeight || 1;

    const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 1000);
    camera.position.set(4, 4, 4);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(initialWidth, initialHeight);
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = settings.autoRotate;
    controls.target.set(0, 0, 0);
    controls.update();
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, settings.ambientLightIntensity);
    const directionalLight = new THREE.DirectionalLight(0xffffff, settings.directionalLightIntensity);
    const pointLight = new THREE.PointLight(0xffffff, settings.pointLightIntensity);
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.8);

    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    pointLight.position.set(-5, -5, -5);

    scene.add(ambientLight);
    scene.add(directionalLight);
    scene.add(pointLight);
    scene.add(hemisphereLight);
    scene.add(new THREE.AxesHelper(5));
    scene.add(new THREE.GridHelper(10, 10, 0x444444, 0x222222));

    lightsRef.current = {
      ambient: ambientLight,
      directional: directionalLight,
      point: pointLight,
      hemisphere: hemisphereLight,
    };
    setIsSceneReady(true);

    let animationFrameId = 0;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

      const width = containerRef.current.clientWidth || 1;
      const height = containerRef.current.clientHeight || 1;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(container);
    resize();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      disposeCurrentModel(true);

      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        rendererRef.current = null;
      }

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      container.querySelectorAll('canvas').forEach((canvas) => canvas.remove());

      lightsRef.current = null;
      loaderRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      setIsSceneReady(false);
    };
  }, []);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = settings.autoRotate;
    }
  }, [settings.autoRotate]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(settings.backgroundColor);
    }

    if (lightsRef.current) {
      lightsRef.current.ambient.intensity = settings.ambientLightIntensity;
      lightsRef.current.directional.intensity = settings.directionalLightIntensity;
      lightsRef.current.point.intensity = settings.pointLightIntensity;
      lightsRef.current.hemisphere.intensity = Math.max(
        0.35,
        (settings.ambientLightIntensity + settings.directionalLightIntensity) / 2,
      );
    }

    applyModelAppearance();
  }, [
    settings.backgroundColor,
    settings.ambientLightIntensity,
    settings.directionalLightIntensity,
    settings.pointLightIntensity,
    settings.color,
    settings.opacity,
    settings.wireframe,
    settings.showBoundingBox,
    settings.renderMode,
  ]);

  useEffect(() => {
    if (settings.cameraResetTrigger > 0) {
      fitCameraToModel();
    }
  }, [settings.cameraResetTrigger]);

  useEffect(() => {
    if (!geometryRef.current || !sceneRef.current) return;
    renderGeometry(geometryRef.current, false);
  }, [settings.renderMode]);

  useEffect(() => {
    if (!isSceneReady || !modelUrl || !loaderRef.current) return;

    let disposed = false;

    const loadModel = async () => {
      setError(null);

      try {
        const geometry = await loaderRef.current!.loadAsync(modelUrl);
        normalizeGeometry(geometry);

        if (disposed) {
          geometry.dispose();
          return;
        }

        disposeCurrentModel(true);
        geometryRef.current = geometry;
        renderGeometry(geometry, true);

        onModelLoaded?.({
          vertices: geometry.attributes.position.count,
          triangles: geometry.attributes.position.count / 3,
        });
      } catch (err) {
        if (disposed) return;

        const message = err instanceof Error ? err.message : '加载模型时发生未知错误';
        console.error('An error happened during loading:', err);
        setError(message);
        onModelLoaded?.({ vertices: 0, triangles: 0 });
      }
    };

    void loadModel();

    return () => {
      disposed = true;
    };
  }, [isSceneReady, modelUrl, retryKey]);

  return (
    <div id="viewer-container" ref={containerRef} className="relative h-full w-full overflow-hidden bg-slate-900">
      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 p-8 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-500/50 bg-slate-900 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
              <span className="text-2xl font-bold text-red-500">!</span>
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-100">模型加载失败</h3>
            <p className="mb-6 text-sm text-slate-400">{error}</p>
            <button
              onClick={() => setRetryKey((current) => current + 1)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-6 py-2 text-sm font-medium text-slate-200 transition-all hover:bg-slate-700"
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
