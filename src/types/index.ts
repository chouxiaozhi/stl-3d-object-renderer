export type RenderMode = 'solid' | 'wireframe' | 'points';

export interface SceneSettings {
  color: string;
  wireframe: boolean;
  renderMode: RenderMode;
  autoRotate: boolean;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
  pointLightIntensity: number;
  backgroundColor: string;
  opacity: number;
  showBoundingBox: boolean;
  cameraResetTrigger: number;
}

export interface ModelInfo {
  name: string;
  url: string;
  vertices?: number;
  triangles?: number;
}

export type ParseStepStatus = 'pending' | 'active' | 'done' | 'error';

export interface ParseStepInfo {
  key: string;
  title: string;
  status: ParseStepStatus;
  detail?: string;
  durationMs?: number;
}

export interface ParseMetrics {
  format?: 'ASCII STL' | 'Binary STL';
  fileSizeBytes?: number;
  vertices?: number;
  triangles?: number;
  dimensions?: {
    x: number;
    y: number;
    z: number;
  };
  totalTimeMs?: number;
}

export interface ParseProcessInfo {
  modelName: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  steps: ParseStepInfo[];
  metrics?: ParseMetrics;
}
