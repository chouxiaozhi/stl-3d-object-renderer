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
