import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Box, Github, HelpCircle } from 'lucide-react';
import { Controls } from './components/Controls';
import { FileUpload, SampleModels } from './components/FileUpload';
import { Viewer } from './components/Viewer';
import { ModelInfo, SceneSettings } from './types';

const DEFAULT_SETTINGS: SceneSettings = {
  color: '#10b981',
  wireframe: false,
  renderMode: 'solid',
  autoRotate: true,
  ambientLightIntensity: 0.5,
  directionalLightIntensity: 1.0,
  pointLightIntensity: 0.5,
  backgroundColor: '#0f172a',
  opacity: 1.0,
  showBoundingBox: false,
  cameraResetTrigger: 0,
};

const DEFAULT_MODEL: ModelInfo = {
  name: 'cube',
  url: '/models/cube.stl',
};

export default function App() {
  const [settings, setSettings] = useState<SceneSettings>(DEFAULT_SETTINGS);
  const [currentModel, setCurrentModel] = useState<ModelInfo>(DEFAULT_MODEL);
  const [modelStats, setModelStats] = useState<{ vertices: number; triangles: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const uploadedModelUrlRef = useRef<string | null>(null);

  const revokeUploadedModelUrl = (nextUrl?: string) => {
    if (uploadedModelUrlRef.current && uploadedModelUrlRef.current !== nextUrl) {
      URL.revokeObjectURL(uploadedModelUrlRef.current);
      uploadedModelUrlRef.current = null;
    }
  };

  const handleModelSelect = (url: string, name: string) => {
    setIsLoading(true);

    if (url.startsWith('blob:')) {
      uploadedModelUrlRef.current = url;
    } else {
      revokeUploadedModelUrl();
    }

    setCurrentModel({ url, name });
  };

  useEffect(() => {
    return () => revokeUploadedModelUrl();
  }, []);

  return (
    <div className="flex h-screen flex-col bg-slate-950 font-sans text-slate-100 selection:bg-emerald-500/30">
      <header className="z-20 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/20">
            <Box className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">STL 3D 模型查看器</h1>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Graduation Project Based on Three.js
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <SampleModels onSelect={handleModelSelect} />
          <div className="h-8 w-px bg-slate-800" />
          <FileUpload onFileSelect={handleModelSelect} />
        </div>
      </header>

      <main className="relative flex flex-1 overflow-hidden">
        <div className="relative flex-1">
          <Viewer
            modelUrl={currentModel.url}
            settings={settings}
            onModelLoaded={(stats) => {
              setModelStats(stats);
              setIsLoading(false);
            }}
          />

          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
                  <p className="animate-pulse text-sm font-medium text-emerald-400">正在加载 STL 模型...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pointer-events-none absolute bottom-8 left-8 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-2xl backdrop-blur">
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">当前模型</div>
            <div className="text-xl font-semibold text-emerald-400">{currentModel.name}</div>
          </div>

          <div className="group absolute right-8 top-8">
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 backdrop-blur transition-all hover:bg-slate-800">
              <HelpCircle className="h-5 w-5 text-slate-400" />
            </button>
            <div className="pointer-events-none absolute right-0 top-12 w-64 translate-y-2 rounded-2xl border border-slate-700 bg-slate-900 p-4 opacity-0 shadow-2xl transition-all group-hover:translate-y-0 group-hover:opacity-100">
              <h3 className="mb-2 text-sm font-bold">操作说明</h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>旋转: 鼠标左键拖拽</li>
                <li>缩放: 鼠标滚轮</li>
                <li>平移: 鼠标右键拖拽</li>
                <li>重置: 点击右侧“重置相机视角”</li>
              </ul>
            </div>
          </div>
        </div>

        <Controls settings={settings} setSettings={setSettings} modelInfo={modelStats} />
      </main>

      <footer className="flex h-10 items-center justify-between border-t border-slate-800 bg-slate-900 px-6 text-[10px] font-medium text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            WebGL 渲染器已就绪
          </span>
          <span>•</span>
          <span>Three.js r183</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#" className="transition-colors hover:text-slate-300">
            项目文档
          </a>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Github className="h-3 w-3" />
            Source Code
          </span>
        </div>
      </footer>
    </div>
  );
}
