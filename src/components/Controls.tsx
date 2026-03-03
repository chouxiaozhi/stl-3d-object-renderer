import React from 'react';
import { SceneSettings, RenderMode } from '../types';
import { 
  Box, 
  Grid3X3, 
  Dot, 
  RotateCw, 
  Sun, 
  Palette, 
  Layers,
  Info,
  Maximize,
  Square
} from 'lucide-react';

interface ControlsProps {
  settings: SceneSettings;
  setSettings: React.Dispatch<React.SetStateAction<SceneSettings>>;
  modelInfo: { vertices: number; triangles: number } | null;
}

export const Controls: React.FC<ControlsProps> = ({ settings, setSettings, modelInfo }) => {
  const updateSetting = (key: keyof SceneSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div id="controls-sidebar" className="w-80 h-full bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto text-slate-200">
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          渲染模式
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {(['solid', 'wireframe', 'points'] as RenderMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => updateSetting('renderMode', mode)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                settings.renderMode === mode 
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                  : 'bg-slate-800 border-slate-700 hover:border-slate-600'
              }`}
            >
              {mode === 'solid' && <Box className="w-5 h-5 mb-1" />}
              {mode === 'wireframe' && <Grid3X3 className="w-5 h-5 mb-1" />}
              {mode === 'points' && <Dot className="w-5 h-5 mb-1" />}
              <span className="text-xs capitalize">
                {mode === 'solid' ? '实体' : mode === 'wireframe' ? '线框' : '点云'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Palette className="w-5 h-5 text-emerald-400" />
          外观设置
        </h2>
        
        <div className="space-y-2">
          <label className="text-sm text-slate-400 flex justify-between">
            模型颜色
            <span className="text-xs font-mono">{settings.color}</span>
          </label>
          <input 
            type="color" 
            value={settings.color}
            onChange={(e) => updateSetting('color', e.target.value)}
            className="w-full h-10 rounded-lg cursor-pointer bg-slate-800 border-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-400 flex justify-between">
            透明度
            <span className="text-xs font-mono">{(settings.opacity * 100).toFixed(0)}%</span>
          </label>
          <input 
            type="range" min="0" max="1" step="0.01"
            value={settings.opacity}
            onChange={(e) => updateSetting('opacity', parseFloat(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-800 rounded-xl">
          <span className="text-sm">自动旋转</span>
          <button 
            onClick={() => updateSetting('autoRotate', !settings.autoRotate)}
            className={`w-12 h-6 rounded-full transition-colors relative ${settings.autoRotate ? 'bg-emerald-500' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.autoRotate ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-800 rounded-xl">
          <span className="text-sm">显示包围盒</span>
          <button 
            onClick={() => updateSetting('showBoundingBox', !settings.showBoundingBox)}
            className={`w-12 h-6 rounded-full transition-colors relative ${settings.showBoundingBox ? 'bg-yellow-500' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.showBoundingBox ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <button 
          onClick={() => updateSetting('cameraResetTrigger', settings.cameraResetTrigger + 1)}
          className="w-full flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all text-sm font-medium"
        >
          <Maximize className="w-4 h-4 text-emerald-400" />
          重置相机视角
        </button>
      </div>

      <div className="mb-8 space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Sun className="w-5 h-5 text-emerald-400" />
          光照强度
        </h2>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-400">环境光 (Ambient)</label>
            <input 
              type="range" min="0" max="2" step="0.1"
              value={settings.ambientLightIntensity}
              onChange={(e) => updateSetting('ambientLightIntensity', parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-400">平行光 (Directional)</label>
            <input 
              type="range" min="0" max="2" step="0.1"
              value={settings.directionalLightIntensity}
              onChange={(e) => updateSetting('directionalLightIntensity', parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
        </div>
      </div>

      {modelInfo && (
        <div className="mt-auto pt-6 border-t border-slate-800">
          <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            模型统计
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 p-3 rounded-lg">
              <div className="text-xs text-slate-500">顶点数</div>
              <div className="text-lg font-mono text-emerald-400">{modelInfo.vertices.toLocaleString()}</div>
            </div>
            <div className="bg-slate-800 p-3 rounded-lg">
              <div className="text-xs text-slate-500">三角面</div>
              <div className="text-lg font-mono text-emerald-400">{modelInfo.triangles.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
