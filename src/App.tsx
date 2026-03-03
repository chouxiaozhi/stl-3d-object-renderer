import React, { useState } from 'react';
import { Viewer } from './components/Viewer';
import { Controls } from './components/Controls';
import { FileUpload, SampleModels } from './components/FileUpload';
import { SceneSettings, ModelInfo } from './types';
import { Box, Github, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  cameraResetTrigger: 0
};

export default function App() {
  const [settings, setSettings] = useState<SceneSettings>(DEFAULT_SETTINGS);
  const [currentModel, setCurrentModel] = useState<ModelInfo>({
    name: 'cubee',
    url: '/models/cube.stl'
  });
  const [modelStats, setModelStats] = useState<{ vertices: number; triangles: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleModelSelect = (url: string, name: string) => {
    setIsLoading(true);
    setCurrentModel({ url, name });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-slate-900/50 border-b border-slate-800 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Box className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">STL 3D 解析与渲染系统</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Graduation Project • Based on three.js</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <SampleModels onSelect={handleModelSelect} />
          <div className="h-8 w-px bg-slate-800" />
          <FileUpload onFileSelect={handleModelSelect} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Viewer Area */}
        <div className="flex-1 relative">
          <Viewer 
            modelUrl={currentModel.url} 
            settings={settings} 
            onModelLoaded={(stats) => {
              setModelStats(stats);
              setIsLoading(false);
            }}
          />
          
          {/* Loading Overlay */}
          <AnimatePresence>
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                  <p className="text-sm font-medium text-emerald-400 animate-pulse">正在解析 STL 数据...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Model Name Overlay */}
          <div className="absolute bottom-8 left-8 p-4 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-2xl shadow-2xl pointer-events-none">
            <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">当前模型</div>
            <div className="text-xl font-semibold text-emerald-400">{currentModel.name}</div>
          </div>

          {/* Help Tooltip */}
          <div className="absolute top-8 right-8 group">
            <button className="w-10 h-10 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-full flex items-center justify-center hover:bg-slate-800 transition-all">
              <HelpCircle className="w-5 h-5 text-slate-400" />
            </button>
            <div className="absolute top-12 right-0 w-64 p-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none translate-y-2 group-hover:translate-y-0">
              <h3 className="text-sm font-bold mb-2">操作说明</h3>
              <ul className="text-xs text-slate-400 space-y-2">
                <li>• <b>旋转</b>: 鼠标左键拖拽</li>
                <li>• <b>缩放</b>: 鼠标滚轮</li>
                <li>• <b>平移</b>: 鼠标右键拖拽</li>
                <li>• <b>重置</b>: 切换渲染模式或重新加载</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <Controls 
          settings={settings} 
          setSettings={setSettings} 
          modelInfo={modelStats}
        />
      </main>

      {/* Footer / Status Bar */}
      <footer className="h-10 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6 text-[10px] text-slate-500 font-medium">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            WebGL 渲染器就绪
          </span>
          <span>•</span>
          <span>Three.js r146</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-slate-300 transition-colors">项目文档</a>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Github className="w-3 h-3" />
            Source Code
          </span>
        </div>
      </footer>
    </div>
  );
}
