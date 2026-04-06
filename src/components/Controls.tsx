import React from 'react';
import { Box, Dot, Grid3X3, Info, Layers, Maximize, Palette, Sun } from 'lucide-react';
import { RenderMode, SceneSettings } from '../types';

interface ControlsProps {
  settings: SceneSettings;
  setSettings: React.Dispatch<React.SetStateAction<SceneSettings>>;
  modelInfo: { vertices: number; triangles: number } | null;
}

export const Controls: React.FC<ControlsProps> = ({ settings, setSettings, modelInfo }) => {
  const updateSetting = <K extends keyof SceneSettings>(key: K, value: SceneSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      id="controls-sidebar"
      className="h-full w-80 overflow-y-auto border-l border-slate-800 bg-slate-900 p-6 text-slate-200"
    >
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <Layers className="h-5 w-5 text-emerald-400" />
          渲染模式
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {(['solid', 'wireframe', 'points'] as RenderMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => updateSetting('renderMode', mode)}
              className={`flex flex-col items-center justify-center rounded-xl border p-3 transition-all ${
                settings.renderMode === mode
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-600'
              }`}
            >
              {mode === 'solid' && <Box className="mb-1 h-5 w-5" />}
              {mode === 'wireframe' && <Grid3X3 className="mb-1 h-5 w-5" />}
              {mode === 'points' && <Dot className="mb-1 h-5 w-5" />}
              <span className="text-xs capitalize">
                {mode === 'solid' ? '实体' : mode === 'wireframe' ? '线框' : '点云'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 space-y-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Palette className="h-5 w-5 text-emerald-400" />
          外观设置
        </h2>

        <div className="space-y-2">
          <label className="flex justify-between text-sm text-slate-400">
            模型颜色
            <span className="font-mono text-xs">{settings.color}</span>
          </label>
          <input
            type="color"
            value={settings.color}
            onChange={(e) => updateSetting('color', e.target.value)}
            className="h-10 w-full cursor-pointer rounded-lg border-none bg-slate-800"
          />
        </div>

        <div className="space-y-2">
          <label className="flex justify-between text-sm text-slate-400">
            透明度
            <span className="font-mono text-xs">{(settings.opacity * 100).toFixed(0)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.opacity}
            onChange={(e) => updateSetting('opacity', parseFloat(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-800 p-3">
          <span className="text-sm">自动旋转</span>
          <button
            onClick={() => updateSetting('autoRotate', !settings.autoRotate)}
            className={`relative h-6 w-12 rounded-full transition-colors ${
              settings.autoRotate ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                settings.autoRotate ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-800 p-3">
          <span className="text-sm">显示包围盒</span>
          <button
            onClick={() => updateSetting('showBoundingBox', !settings.showBoundingBox)}
            className={`relative h-6 w-12 rounded-full transition-colors ${
              settings.showBoundingBox ? 'bg-yellow-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                settings.showBoundingBox ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        <button
          onClick={() => updateSetting('cameraResetTrigger', settings.cameraResetTrigger + 1)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm font-medium transition-all hover:bg-slate-700"
        >
          <Maximize className="h-4 w-4 text-emerald-400" />
          重置相机视角
        </button>
      </div>

      <div className="mb-8 space-y-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Sun className="h-5 w-5 text-emerald-400" />
          光照强度
        </h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-400">环境光</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.ambientLightIntensity}
              onChange={(e) => updateSetting('ambientLightIntensity', parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-400">平行光</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.directionalLightIntensity}
              onChange={(e) => updateSetting('directionalLightIntensity', parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
        </div>
      </div>

      {modelInfo && (
        <div className="mt-auto border-t border-slate-800 pt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-400">
            <Info className="h-4 w-4" />
            模型统计
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-800 p-3">
              <div className="text-xs text-slate-500">顶点数</div>
              <div className="font-mono text-lg text-emerald-400">{modelInfo.vertices.toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-slate-800 p-3">
              <div className="text-xs text-slate-500">三角面</div>
              <div className="font-mono text-lg text-emerald-400">{modelInfo.triangles.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
