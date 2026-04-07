import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  BarChart3,
  Binary,
  Box,
  Braces,
  Clock3,
  Crosshair,
  FileCode2,
  Expand,
  Gauge,
  Github,
  HelpCircle,
  Minimize,
  Orbit,
  ShieldCheck,
  Target,
  Workflow,
} from 'lucide-react';
import { Controls } from './components/Controls';
import { FileUpload, SampleModels } from './components/FileUpload';
import { Viewer } from './components/Viewer';
import { ModelInfo, ParseProcessInfo, ParseStepInfo, SceneSettings } from './types';

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

const DEFAULT_MODEL: ModelInfo = { name: 'cube', url: '/models/cube.stl' };

const createInitialParseSteps = (): ParseStepInfo[] => [
  { key: 'read', title: '读取 STL 文件', status: 'pending' },
  { key: 'detect', title: '识别文件格式', status: 'pending' },
  { key: 'parse', title: '解析三角面数据', status: 'pending' },
  { key: 'normalize', title: '归一化与几何计算', status: 'pending' },
  { key: 'render', title: '生成渲染对象', status: 'pending' },
];

const createInitialParseInfo = (modelName: string): ParseProcessInfo => ({
  modelName,
  status: 'loading',
  message: '等待开始解析',
  steps: createInitialParseSteps(),
});

const formatBytes = (bytes?: number) => {
  if (!bytes) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatMs = (value?: number) => (value === undefined ? '--' : `${value.toFixed(1)} ms`);
const formatDimension = (value?: number) => (value === undefined ? '--' : value.toFixed(2));
const clampScore = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

const getProgressValue = (info: ParseProcessInfo) => {
  if (info.steps.length === 0) return 0;
  const doneCount = info.steps.filter((step) => step.status === 'done').length;
  const hasActive = info.steps.some((step) => step.status === 'active');
  const base = doneCount / info.steps.length;
  if (info.status === 'success') return 100;
  if (info.status === 'error') return Math.round(base * 100);
  if (hasActive) return Math.min(99, Math.round((base + 0.12) * 100));
  return Math.round(base * 100);
};

const getStatusLabel = (status: ParseProcessInfo['status']) => {
  if (status === 'success') return '已完成';
  if (status === 'error') return '失败';
  if (status === 'loading') return '进行中';
  return '空闲';
};

const getStepTone = (status: ParseStepInfo['status']) => {
  if (status === 'done') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'active') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  if (status === 'error') return 'border-red-500/30 bg-red-500/10 text-red-300';
  return 'border-slate-800 bg-slate-900/60 text-slate-400';
};

const getStepAccent = (status: ParseStepInfo['status']) => {
  if (status === 'done') return '#34d399';
  if (status === 'active') return '#fbbf24';
  if (status === 'error') return '#f87171';
  return '#475569';
};

const getScoreTone = (score: number) => {
  if (score >= 90) return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
  if (score >= 75) return 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10';
  if (score >= 60) return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
  return 'text-red-300 border-red-500/30 bg-red-500/10';
};

const getScoreLabel = (score: number) => {
  if (score >= 90) return '优秀';
  if (score >= 75) return '良好';
  if (score >= 60) return '可用';
  return '待优化';
};

const getFpsTone = (fps: number) => {
  if (fps >= 50) return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
  if (fps >= 30) return 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10';
  if (fps >= 20) return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
  return 'text-red-300 border-red-500/30 bg-red-500/10';
};

const getFpsLabel = (fps: number) => {
  if (fps >= 50) return '流畅';
  if (fps >= 30) return '稳定';
  if (fps >= 20) return '一般';
  return '偏低';
};

const getFormatDescription = (format?: string) => {
  if (format === 'ASCII STL') return 'ASCII STL 采用文本存储，适合观察面片与顶点结构。';
  if (format === 'Binary STL') return 'Binary STL 更紧凑，适合复杂模型快速加载。';
  return '系统会自动识别 STL 格式并切换对应解析路径。';
};

const stageMeta: Record<
  string,
  { token: string; principle: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }
> = {
  read: {
    token: '文件缓冲',
    principle: '读取 STL 原始字节流，构建输入缓冲区。',
    subtitle: '模型文件首先被转换为可分析的原始数据块。',
    icon: FileCode2,
  },
  detect: {
    token: '头部检测',
    principle: '检测头部内容与面片特征，判断 ASCII STL 或 Binary STL。',
    subtitle: '系统会根据格式判断后续解析分支。',
    icon: Binary,
  },
  parse: {
    token: '面片解码',
    principle: '提取 normal 与 3 个 vertex，并拼装为几何顶点数组。',
    subtitle: '这一阶段把 STL 描述转换成真正的几何数据。',
    icon: Braces,
  },
  normalize: {
    token: '包围盒对齐',
    principle: '计算包围盒、法向量和尺寸，并进行居中与归一化。',
    subtitle: '让不同尺度模型都能稳定进入统一视域。',
    icon: Crosshair,
  },
  render: {
    token: '网格构建',
    principle: '创建 Three.js 渲染对象，完成相机自适应和场景接入。',
    subtitle: '最终把几何数据转成可交互的三维模型。',
    icon: Orbit,
  },
};

const stageFlowMap: Record<
  string,
  {
    input: string;
    process: string;
    output: string;
  }
> = {
  read: {
    input: 'STL 文件',
    process: '读取字节流',
    output: '输入缓冲区',
  },
  detect: {
    input: '文件头片段',
    process: '识别格式特征',
    output: 'ASCII / 二进制',
  },
  parse: {
    input: 'facet / vertex',
    process: '提取三角面',
    output: '几何顶点数组',
  },
  normalize: {
    input: '原始几何',
    process: '居中与缩放',
    output: '标准化模型',
  },
  render: {
    input: '几何数据',
    process: '构建渲染对象',
    output: '可交互模型',
  },
};

const buildEvaluationMetrics = (info: ParseProcessInfo) => {
  const totalTime = info.metrics?.totalTimeMs ?? 0;
  const hasFormat = Boolean(info.metrics?.format);
  const hasGeometry = Boolean((info.metrics?.vertices ?? 0) > 0 && (info.metrics?.triangles ?? 0) > 0);
  const hasDimensions = Boolean(
    info.metrics?.dimensions &&
      info.metrics.dimensions.x > 0 &&
      info.metrics.dimensions.y > 0 &&
      info.metrics.dimensions.z > 0,
  );
  const completedSteps = info.steps.filter((step) => step.status === 'done').length;
  const completionRatio = info.steps.length > 0 ? completedSteps / info.steps.length : 0;
  const successBonus = info.status === 'success' ? 1 : info.status === 'loading' ? 0.75 : 0.3;
  const compatibilityScore = clampScore((hasFormat ? 45 : 0) + (hasGeometry ? 35 : 0) + successBonus * 20);

  let speedScore = 0;
  if (totalTime === 0 && info.status !== 'success') speedScore = info.status === 'loading' ? 65 : 40;
  else if (totalTime <= 120) speedScore = 96;
  else if (totalTime <= 300) speedScore = 88;
  else if (totalTime <= 700) speedScore = 78;
  else if (totalTime <= 1500) speedScore = 66;
  else speedScore = 52;

  const accuracyScore = clampScore((hasGeometry ? 40 : 0) + (hasDimensions ? 30 : 0) + successBonus * 30);
  const stabilityScore = clampScore(completionRatio * 70 + successBonus * 30);

  return [
    { key: 'compatibility', label: '兼容性', score: compatibilityScore, icon: ShieldCheck, detail: hasFormat ? '格式识别完成' : '等待格式识别' },
    { key: 'speed', label: '解析速度', score: clampScore(speedScore), icon: Gauge, detail: totalTime > 0 ? `总耗时 ${formatMs(totalTime)}` : '正在统计耗时' },
    { key: 'accuracy', label: '解析准确度', score: accuracyScore, icon: Target, detail: hasGeometry ? '几何数据已生成' : '等待几何提取' },
    { key: 'stability', label: '流程稳定性', score: stabilityScore, icon: Activity, detail: `${completedSteps}/${info.steps.length} 个节点完成` },
  ];
};

function ProgressRing({ value, status }: { value: number; status: ParseProcessInfo['status'] }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (value / 100) * circumference;
  const stroke = status === 'error' ? '#f87171' : status === 'success' ? '#34d399' : '#fbbf24';

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="-rotate-90 h-24 w-24">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle cx="48" cy="48" r={radius} fill="none" stroke={stroke} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} className="transition-all duration-700" />
      </svg>
      <div className="absolute text-center">
        <div className="text-xl font-bold text-slate-100">{value}%</div>
        <div className="text-[10px] tracking-[0.18em] text-slate-500">进度</div>
      </div>
    </div>
  );
}

function StageScene({ step, compact = false }: { step: ParseStepInfo; compact?: boolean }) {
  const accent = getStepAccent(step.status);
  const active = step.status === 'active';
  const done = step.status === 'done';
  const faded = step.status === 'pending' ? 'opacity-45' : 'opacity-100';

  if (step.key === 'read') {
    return (
      <div className={`relative h-full overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/70 ${faded}`}>
        <div className="absolute left-6 top-1/2 flex -translate-y-1/2 flex-col gap-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">模型文本头</div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">facet normal</div>
        </div>
        <div className="absolute left-[30%] right-[24%] top-1/2 h-[2px] -translate-y-1/2 bg-slate-800" />
        {[0, 1, 2, 3].map((index) => (
          <motion.div key={index} className="absolute top-1/2 h-3 w-8 -translate-y-1/2 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 16px ${accent}` }} animate={{ x: active ? [0, 180] : done ? 180 : 0, opacity: active ? [0.2, 1, 0.2] : done ? 1 : 0.25 }} transition={{ duration: 1.2, repeat: active ? Infinity : 0, delay: index * 0.16 }} initial={{ left: '32%' }} />
        ))}
        <div className="absolute right-6 top-1/2 flex h-28 w-36 -translate-y-1/2 flex-col justify-center rounded-[24px] border border-slate-700 bg-slate-900/80 p-4">
          <div className="mb-3 text-xs tracking-[0.22em] text-slate-500">字节缓冲</div>
          <div className="grid grid-cols-6 gap-1">
            {Array.from({ length: 18 }).map((_, index) => (
              <motion.div key={index} className="h-3 rounded-full" style={{ backgroundColor: accent }} animate={{ opacity: active ? [0.2, 1, 0.2] : done ? 0.95 : 0.25 }} transition={{ duration: 0.9, repeat: active ? Infinity : 0, delay: index * 0.04 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step.key === 'detect') {
    return (
      <div className={`relative h-full overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/70 ${faded}`}>
        <div className="absolute inset-y-5 left-6 w-[42%] rounded-[24px] border border-slate-700 bg-slate-900/80 p-4">
          <div className="mb-3 text-xs tracking-[0.22em] text-slate-500">头部片段</div>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">solid cube</div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">facet normal ...</div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">vertex / vertex / vertex</div>
          </div>
        </div>
        <motion.div className="absolute inset-y-6 left-[20%] w-12 bg-gradient-to-r from-transparent via-white/20 to-transparent" animate={{ x: active ? [0, 240] : 0 }} transition={{ duration: 1.6, repeat: active ? Infinity : 0, ease: 'linear' }} />
        <div className="absolute right-6 top-1/2 grid h-28 w-40 -translate-y-1/2 grid-cols-2 gap-2 rounded-[24px] border border-slate-700 bg-slate-900/80 p-4">
          {['ASCII 格式', '二进制格式'].map((label, index) => (
            <motion.div key={label} className={`flex items-center justify-center rounded-2xl border ${index === 0 ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-slate-800 bg-slate-950/60 text-slate-400'}`} animate={{ scale: active && index === 0 ? [1, 1.06, 1] : 1, opacity: active ? [0.65, 1, 0.65] : 1 }} transition={{ duration: 1, repeat: active && index === 0 ? Infinity : 0 }}>{label}</motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (step.key === 'parse') {
    return (
      <div className={`relative h-full overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/70 ${faded}`}>
        <div className="absolute left-6 top-6 rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-400">
          facet -&gt; normal + 3 vertices
        </div>
        <div className="absolute inset-x-6 bottom-6 top-16">
          <svg viewBox="0 0 560 220" className="h-full w-full">
            <motion.path d="M72 170 L188 48 L282 150 L384 56 L482 158" fill="none" stroke="#1e293b" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
            <motion.path d="M72 170 L188 48 L282 150 L384 56 L482 158" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" animate={{ pathLength: active ? [0.08, 1, 0.08] : 1, opacity: active ? [0.35, 1, 0.4] : 1 }} transition={{ duration: 1.8, repeat: active ? Infinity : 0 }} />
            {['110,158 188,48 250,145', '282,150 384,56 456,150'].map((points, index) => (
              <motion.polygon key={points} points={points} fill={done ? 'rgba(52,211,153,0.14)' : active ? 'rgba(251,191,36,0.16)' : 'rgba(71,85,105,0.14)'} stroke={accent} strokeWidth="2" animate={{ opacity: active ? [0.3, 0.95, 0.3] : done ? 0.9 : 0.28 }} transition={{ duration: 1.2, repeat: active ? Infinity : 0, delay: index * 0.22 }} />
            ))}
            {[[72, 170], [188, 48], [282, 150], [384, 56], [482, 158]].map(([x, y], index) => (
              <motion.circle key={`${x}-${y}`} cx={x} cy={y} r="9" fill={accent} animate={{ scale: active ? [0.8, 1.35, 0.8] : 1, opacity: active ? [0.55, 1, 0.55] : 1 }} transition={{ duration: 1.15, repeat: active ? Infinity : 0, delay: index * 0.12 }} />
            ))}
          </svg>
        </div>
      </div>
    );
  }

  if (step.key === 'normalize') {
    return (
      <div className={`relative h-full overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/70 ${faded}`}>
        <div className="absolute inset-6 rounded-[28px] border border-slate-800 bg-slate-950/50">
          <motion.div className="absolute left-1/2 top-1/2 h-28 w-40 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-dashed" style={{ borderColor: accent }} animate={{ scale: active ? [0.72, 1.02, 0.72] : done ? 1 : 0.82 }} transition={{ duration: 1.6, repeat: active ? Infinity : 0 }} />
          <motion.div className="absolute left-1/2 top-1/2" animate={{ rotate: active ? [0, 180, 360] : 0 }} transition={{ duration: 2.6, repeat: active ? Infinity : 0, ease: 'linear' }}>
            <Crosshair className="h-10 w-10 -translate-x-1/2 -translate-y-1/2" style={{ color: accent }} />
          </motion.div>
          <div className="absolute left-1/2 top-1/2 h-[2px] w-56 -translate-x-1/2 -translate-y-1/2 bg-slate-800" />
          <div className="absolute left-1/2 top-1/2 h-40 w-[2px] -translate-x-1/2 -translate-y-1/2 bg-slate-800" />
          <motion.div className="absolute left-1/2 top-1/2 h-14 w-14 rounded-2xl border border-slate-700 bg-slate-900/80" animate={{ x: active ? [-110, 0, 70, 0] : 0, y: active ? [-50, 0, 30, 0] : 0, scale: active ? [0.85, 1, 0.82, 1] : 1 }} transition={{ duration: 2.2, repeat: active ? Infinity : 0 }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-full overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/70 ${faded}`}>
      <div className="absolute inset-y-8 left-8 flex w-36 flex-col justify-center rounded-[24px] border border-slate-700 bg-slate-900/80 p-4">
        <div className="mb-2 text-xs tracking-[0.22em] text-slate-500">几何数据</div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, index) => (
            <motion.div key={index} className="h-7 rounded-xl" style={{ backgroundColor: accent }} animate={{ opacity: active ? [0.2, 1, 0.2] : done ? 0.95 : 0.3 }} transition={{ duration: 0.85, repeat: active ? Infinity : 0, delay: index * 0.06 }} />
          ))}
        </div>
      </div>
      <div className="absolute left-[42%] right-[36%] top-1/2 h-[2px] -translate-y-1/2 bg-slate-800" />
      {[0, 1, 2].map((index) => (
        <motion.div key={index} className="absolute top-1/2 h-3 w-10 -translate-y-1/2 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 18px ${accent}` }} animate={{ x: active ? [0, 140] : done ? 140 : 0, opacity: active ? [0.2, 1, 0.2] : done ? 1 : 0.3 }} transition={{ duration: 1.2, repeat: active ? Infinity : 0, delay: index * 0.2 }} initial={{ left: '44%' }} />
      ))}
      <div className="absolute right-8 top-1/2 flex h-40 w-40 -translate-y-1/2 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80">
        <motion.div animate={{ rotate: active ? [0, 360] : 0 }} transition={{ duration: 4, repeat: active ? Infinity : 0, ease: 'linear' }} className="absolute">
          <Orbit className="h-20 w-20" style={{ color: accent }} />
        </motion.div>
        <motion.div animate={{ scale: active ? [0.85, 1.1, 0.85] : done ? 1.05 : 0.92 }} transition={{ duration: 1.4, repeat: active ? Infinity : 0 }}>
          <Box className="h-10 w-10" style={{ color: accent }} />
        </motion.div>
      </div>
    </div>
  );
}

function CompactStageScene({ step }: { step: ParseStepInfo }) {
  const accent = getStepAccent(step.status);
  const active = step.status === 'active';
  const done = step.status === 'done';
  const muted = step.status === 'pending' ? 'opacity-45' : 'opacity-100';

  if (step.key === 'read') {
    return (
      <div className={`relative h-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/65 ${muted}`}>
        <div className="absolute left-3 top-3 rounded-xl border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[10px] text-slate-300">文件</div>
        <div className="absolute left-[20%] right-[18%] top-1/2 h-[2px] -translate-y-1/2 bg-slate-800" />
        {[0, 1].map((index) => (
          <motion.div
            key={index}
            className="absolute top-1/2 h-2 w-5 -translate-y-1/2 rounded-full"
            style={{ backgroundColor: accent, boxShadow: `0 0 12px ${accent}` }}
            initial={{ left: '24%' }}
            animate={{ x: active ? [0, 86] : done ? 86 : 0, opacity: active ? [0.2, 1, 0.2] : done ? 1 : 0.35 }}
            transition={{ duration: 1.1, repeat: active ? Infinity : 0, delay: index * 0.16 }}
          />
        ))}
        <div className="absolute right-3 top-1/2 grid h-16 w-20 -translate-y-1/2 grid-cols-4 gap-1 rounded-2xl border border-slate-700 bg-slate-900/80 p-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <motion.div
              key={index}
              className="h-2 rounded-full"
              style={{ backgroundColor: accent }}
              animate={{ opacity: active ? [0.2, 1, 0.2] : done ? 0.95 : 0.3 }}
              transition={{ duration: 0.8, repeat: active ? Infinity : 0, delay: index * 0.03 }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (step.key === 'detect') {
    return (
      <div className={`relative h-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/65 ${muted}`}>
        <div className="absolute inset-y-3 left-3 w-[44%] rounded-2xl border border-slate-700 bg-slate-900/80 p-2">
          <div className="space-y-1.5 text-[10px] text-slate-300">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1">solid</div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1">facet</div>
          </div>
        </div>
        <motion.div
          className="absolute inset-y-3 left-[24%] w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: active ? [0, 86] : 0 }}
          transition={{ duration: 1.4, repeat: active ? Infinity : 0, ease: 'linear' }}
        />
        <div className="absolute right-3 top-1/2 grid h-16 w-24 -translate-y-1/2 grid-cols-2 gap-1.5 rounded-2xl border border-slate-700 bg-slate-900/80 p-2">
          {['ASCII', '二进制'].map((label, index) => (
            <motion.div
              key={label}
              className={`flex items-center justify-center rounded-xl border text-[10px] ${
                index === 0 ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-slate-800 bg-slate-950/60 text-slate-400'
              }`}
              animate={{ scale: active && index === 0 ? [1, 1.05, 1] : 1 }}
              transition={{ duration: 1, repeat: active && index === 0 ? Infinity : 0 }}
            >
              {label}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (step.key === 'parse') {
    return (
      <div className={`relative h-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/65 ${muted}`}>
        <svg viewBox="0 0 240 120" className="h-full w-full">
          <motion.path d="M28 88 L90 26 L138 84 L208 34" fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
          <motion.path d="M28 88 L90 26 L138 84 L208 34" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" animate={{ pathLength: active ? [0.08, 1, 0.08] : 1, opacity: active ? [0.35, 1, 0.45] : 1 }} transition={{ duration: 1.5, repeat: active ? Infinity : 0 }} />
          <motion.polygon points="52,82 90,26 126,82" fill={done ? 'rgba(52,211,153,0.14)' : 'rgba(251,191,36,0.14)'} stroke={accent} strokeWidth="1.6" animate={{ opacity: active ? [0.25, 0.9, 0.25] : done ? 0.9 : 0.3 }} transition={{ duration: 1.1, repeat: active ? Infinity : 0 }} />
          {[28, 90, 138, 208].map((cx, index) => (
            <motion.circle key={cx} cx={cx} cy={index === 1 ? 26 : index === 3 ? 34 : index === 2 ? 84 : 88} r="5.5" fill={accent} animate={{ scale: active ? [0.85, 1.25, 0.85] : 1, opacity: active ? [0.55, 1, 0.55] : 1 }} transition={{ duration: 1.1, repeat: active ? Infinity : 0, delay: index * 0.12 }} />
          ))}
        </svg>
      </div>
    );
  }

  if (step.key === 'normalize') {
    return (
      <div className={`relative h-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/65 ${muted}`}>
        <div className="absolute inset-4 rounded-2xl border border-slate-800 bg-slate-950/50" />
        <motion.div
          className="absolute left-1/2 top-1/2 h-16 w-24 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-dashed"
          style={{ borderColor: accent }}
          animate={{ scale: active ? [0.78, 1.02, 0.78] : done ? 1 : 0.84 }}
          transition={{ duration: 1.4, repeat: active ? Infinity : 0 }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2"
          animate={{ rotate: active ? [0, 180, 360] : 0 }}
          transition={{ duration: 2.2, repeat: active ? Infinity : 0, ease: 'linear' }}
        >
          <Crosshair className="h-7 w-7 -translate-x-1/2 -translate-y-1/2" style={{ color: accent }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`relative h-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/65 ${muted}`}>
      <div className="absolute left-3 top-1/2 h-[2px] w-[38%] -translate-y-1/2 bg-slate-800" />
      {[0, 1].map((index) => (
        <motion.div
          key={index}
          className="absolute top-1/2 h-2 w-5 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: accent, boxShadow: `0 0 12px ${accent}` }}
          initial={{ left: '16%' }}
          animate={{ x: active ? [0, 72] : done ? 72 : 0, opacity: active ? [0.2, 1, 0.2] : done ? 1 : 0.3 }}
          transition={{ duration: 1.05, repeat: active ? Infinity : 0, delay: index * 0.16 }}
        />
      ))}
      <div className="absolute right-4 top-1/2 flex h-24 w-24 -translate-y-1/2 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80">
        <motion.div animate={{ rotate: active ? [0, 360] : 0 }} transition={{ duration: 3.4, repeat: active ? Infinity : 0, ease: 'linear' }} className="absolute">
          <Orbit className="h-12 w-12" style={{ color: accent }} />
        </motion.div>
        <motion.div animate={{ scale: active ? [0.85, 1.12, 0.85] : done ? 1.05 : 0.92 }} transition={{ duration: 1.2, repeat: active ? Infinity : 0 }}>
          <Box className="h-6 w-6" style={{ color: accent }} />
        </motion.div>
      </div>
    </div>
  );
}

function ParseProcessPanel({ info }: { info: ParseProcessInfo }) {
  const progressValue = getProgressValue(info);
  const activeIndex = info.steps.findIndex((step) => step.status === 'active');
  const currentIndex = activeIndex >= 0 ? activeIndex : Math.max(0, info.steps.filter((step) => step.status === 'done').length - 1);
  const currentStep = info.steps[currentIndex] ?? createInitialParseSteps()[0];
  const currentMeta = stageMeta[currentStep.key] ?? stageMeta.read;
  const currentFlow = stageFlowMap[currentStep.key] ?? stageFlowMap.read;
  const CurrentIcon = currentMeta.icon;
  const showOverview = info.status === 'success' && info.steps.every((step) => step.status === 'done');
  const [isStageExpanded, setIsStageExpanded] = useState(false);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);

  return (
    <div className="absolute bottom-6 left-6 right-[27rem] top-6 z-10 flex min-w-0 flex-col gap-4">
      <div className="rounded-3xl border border-slate-700/80 bg-slate-900/78 p-5 shadow-2xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              <Workflow className="h-3.5 w-3.5" />
              解析算法主流程
            </div>
            <div className="text-2xl font-semibold tracking-tight text-slate-50">{info.modelName}</div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{info.message}</p>
          </div>
          <div className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] ${info.status === 'success' ? 'bg-emerald-500/15 text-emerald-300' : info.status === 'error' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>
            {getStatusLabel(info.status)}
          </div>
        </div>

      <div className="mt-4 grid grid-cols-[1.35fr_0.65fr] gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <span>算法流程</span>
              <span>{progressValue}%</span>
            </div>
            <div className="relative h-24">
              <div className="absolute left-4 right-4 top-10 h-[3px] rounded-full bg-slate-800">
                <motion.div animate={{ width: `${progressValue}%` }} transition={{ duration: 0.6 }} className={`h-full rounded-full ${info.status === 'error' ? 'bg-red-400' : info.status === 'success' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              </div>
              <motion.div animate={{ left: `calc(16px + (${progressValue} / 100) * (100% - 32px))`, opacity: info.status === 'error' ? 0.45 : 1, scale: info.status === 'loading' ? [0.92, 1.15, 0.92] : 1 }} transition={{ left: { duration: 0.7, ease: 'easeInOut' }, scale: { duration: 1.1, repeat: info.status === 'loading' ? Infinity : 0 } }} className="absolute top-[31px] h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white/15 bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.55)]" />
              <div className="absolute inset-x-0 top-0 grid grid-cols-5 gap-2">
                {info.steps.map((step, index) => {
                  const meta = stageMeta[step.key] ?? stageMeta.read;
                  const Icon = meta.icon;
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${getStepTone(step.status)}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="text-center text-[11px] leading-4 text-slate-400">S{index + 1}</div>
                      <div className="text-center text-[10px] leading-4 text-slate-500">{meta.token}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">当前阶段</div>
                <div className="mt-1 text-lg font-semibold text-slate-50">{currentStep.title}</div>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${getStepTone(currentStep.status)}`}>
                <CurrentIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm leading-6 text-slate-300">{currentMeta.principle}</div>
            {!showOverview ? (
              <button
                type="button"
                onClick={() => setIsStageExpanded(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/65 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-700 hover:bg-slate-900"
              >
                <Expand className="h-4 w-4" />
                放大查看当前流程
              </button>
            ) : null}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{currentMeta.token}</span>
              <span>{formatMs(currentStep.durationMs)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="min-h-0 rounded-3xl border border-slate-700/80 bg-slate-900/78 p-5 shadow-2xl backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">解析动画主舞台</div>
              <div className="mt-1 text-lg font-semibold text-slate-50">{showOverview ? '完整解析流程总览' : currentStep.title}</div>
            </div>
            {showOverview ? (
              <button
                type="button"
                onClick={() => setIsOverviewExpanded(true)}
                className="mr-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-slate-950/70 text-slate-300 align-middle transition hover:border-slate-700 hover:bg-slate-900"
                title="放大查看完整解析流程"
              >
                <Expand className="h-4 w-4" />
              </button>
            ) : null}
            <div className="inline-flex rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">
              {showOverview ? '全流程' : currentMeta.token}
            </div>
          </div>
          {showOverview ? (
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="grid h-[calc(100%-5.2rem)] min-h-[320px] grid-cols-2 gap-2 overflow-auto pr-1"
            >
              {info.steps.map((step, index) => {
                const meta = stageMeta[step.key] ?? stageMeta.read;

                return (
                  <div key={`${step.key}-overview`} className="rounded-3xl border border-slate-800 bg-slate-950/45 p-2.5">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.16em] text-slate-500">S{index + 1}</div>
                        <div className="mt-0.5 text-xs font-semibold text-slate-100">{step.title}</div>
                      </div>
                      <div className="rounded-full border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[9px] text-slate-400">
                        {meta.token}
                      </div>
                    </div>
                    <div className="h-[208px]">
                      <CompactStageScene step={step} />
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.key}
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="h-[calc(100%-5.2rem)] min-h-[320px]"
              >
                <div className="grid h-full grid-rows-[1fr_auto] gap-3">
                  <StageScene step={currentStep} />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">输入</div>
                      <div className="mt-1 text-sm font-medium text-slate-200">{currentFlow.input}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">处理</div>
                      <div className="mt-1 text-sm font-medium text-slate-200">{currentFlow.process}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">输出</div>
                      <div className="mt-1 text-sm font-medium text-slate-200">{currentFlow.output}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {showOverview && isOverviewExpanded ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-3xl bg-slate-950/72 p-6 backdrop-blur-sm">
            <div className="flex h-full max-h-[760px] w-full max-w-6xl flex-col rounded-[28px] border border-slate-700 bg-slate-900/96 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">整体流程放大查看</div>
                  <div className="mt-1 text-xl font-semibold text-slate-50">完整 STL 解析流程总览</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOverviewExpanded(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 text-slate-300 transition hover:bg-slate-900"
                  title="关闭整体流程放大查看"
                >
                  <Minimize className="h-4 w-4" />
                </button>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-3 gap-4 overflow-auto p-5">
                {info.steps.map((step, index) => {
                  const meta = stageMeta[step.key] ?? stageMeta.read;
                  const flow = stageFlowMap[step.key] ?? stageFlowMap.read;

                  return (
                    <div key={`${step.key}-expanded-overview`} className="flex min-h-[280px] flex-col rounded-[24px] border border-slate-800 bg-slate-950/55 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">S{index + 1}</div>
                          <div className="mt-1 text-base font-semibold text-slate-50">{step.title}</div>
                        </div>
                        <div className="rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[10px] text-slate-400">
                          {meta.token}
                        </div>
                      </div>
                      <div className="min-h-0 flex-1 rounded-[20px] border border-slate-800 bg-slate-950/50 p-2">
                        <CompactStageScene step={step} />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-2.5">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">输入</div>
                          <div className="mt-1 text-xs text-slate-200">{flow.input}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-2.5">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">处理</div>
                          <div className="mt-1 text-xs text-slate-200">{flow.process}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-2.5">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">输出</div>
                          <div className="mt-1 text-xs text-slate-200">{flow.output}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {!showOverview && isStageExpanded ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-3xl bg-slate-950/72 p-6 backdrop-blur-sm">
            <div className="flex h-full max-h-[720px] w-full max-w-5xl flex-col rounded-[28px] border border-slate-700 bg-slate-900/96 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">单步放大查看</div>
                  <div className="mt-1 text-xl font-semibold text-slate-50">{currentStep.title}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStageExpanded(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 text-slate-300 transition hover:bg-slate-900"
                  title="关闭放大查看"
                >
                  <Minimize className="h-4 w-4" />
                </button>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-[1.25fr_0.75fr] gap-4 p-5">
                <div className="min-h-0 rounded-[24px] border border-slate-800 bg-slate-950/55 p-4">
                  <StageScene step={currentStep} />
                </div>
                <div className="flex min-h-0 flex-col gap-4">
                  <div className="rounded-[24px] border border-slate-800 bg-slate-950/55 p-4">
                    <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">阶段说明</div>
                    <div className="text-sm leading-7 text-slate-300">{currentMeta.principle}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-[20px] border border-slate-800 bg-slate-950/55 p-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">输入</div>
                      <div className="mt-1 text-sm font-medium text-slate-200">{currentFlow.input}</div>
                    </div>
                    <div className="rounded-[20px] border border-slate-800 bg-slate-950/55 p-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">处理</div>
                      <div className="mt-1 text-sm font-medium text-slate-200">{currentFlow.process}</div>
                    </div>
                    <div className="rounded-[20px] border border-slate-800 bg-slate-950/55 p-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">输出</div>
                      <div className="mt-1 text-sm font-medium text-slate-200">{currentFlow.output}</div>
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-slate-800 bg-slate-950/55 p-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                      <span>阶段标识</span>
                      <span>{formatMs(currentStep.durationMs)}</span>
                    </div>
                    <div className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-300">
                      {currentMeta.token}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-col gap-4">
          <div className="rounded-3xl border border-slate-700/80 bg-slate-900/78 p-5 shadow-2xl backdrop-blur-md">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              <Activity className="h-3.5 w-3.5" />
              算法说明
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 text-sm leading-7 text-slate-300">
              {showOverview
                ? '解析完成后，主舞台会把读取、识别、解析、归一化和渲染五个阶段整体展开，便于从全局说明 STL 解析算法的完整链路。'
                : currentMeta.subtitle}
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {info.steps.map((step, index) => (
                <div key={`${step.key}-pill`} className={`rounded-2xl border p-2 text-center ${getStepTone(step.status)}`}>
                  <div className="text-[10px] uppercase tracking-[0.18em]">S{index + 1}</div>
                  <div className="mt-1 text-[11px] leading-4">{formatMs(step.durationMs)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="min-h-0 rounded-3xl border border-slate-700/80 bg-slate-900/78 p-5 shadow-2xl backdrop-blur-md">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              <BarChart3 className="h-3.5 w-3.5" />
              算法节点详解
            </div>
            <div className="grid max-h-[calc(100%-2rem)] gap-3 overflow-y-auto pr-1">
              {info.steps.map((step, index) => {
                const meta = stageMeta[step.key] ?? stageMeta.read;
                const Icon = meta.icon;
                return (
                  <div key={`${step.key}-detail`} className={`rounded-2xl border p-3 ${getStepTone(step.status)}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-current/20 bg-black/10">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">S{index + 1}</div>
                          <div className="mt-1 text-sm font-semibold text-slate-50">{step.title}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-400">{meta.principle}</div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">{formatMs(step.durationMs)}</div>
                    </div>
                    <div className="mt-3 rounded-xl border border-current/15 bg-black/10 px-3 py-2 text-xs leading-5 text-slate-300">
                      {step.detail ?? '等待进入该阶段'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewerWindow({ modelName, children }: { modelName: string; children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!containerRef.current) return;

      if (document.fullscreenElement === containerRef.current) {
        await document.exitFullscreen();
        return;
      }

      await containerRef.current.requestFullscreen();
    } catch (error) {
      console.error('Failed to toggle fullscreen preview:', error);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`absolute bottom-30 right-6 z-20 overflow-hidden border border-slate-700/90 bg-slate-900/92 shadow-2xl backdrop-blur-md ${
        isFullscreen ? 'h-screen w-screen rounded-none' : 'w-[360px] rounded-3xl'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">模型预览窗口</div>
          <div className="mt-1 text-sm font-semibold text-slate-100">{modelName}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] text-emerald-300">
            模型
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-slate-300 transition hover:bg-slate-800"
            title={isFullscreen ? '退出全屏' : '全屏查看'}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className={isFullscreen ? 'h-[calc(100vh-96px)] bg-slate-950' : 'h-[240px] bg-slate-950'}>{children}</div>

      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/70 px-4 py-2 text-[11px] text-slate-400">
        <span>鼠标左键旋转，滚轮缩放</span>
        <span className="text-slate-500">{isFullscreen ? '全屏' : '预览'}</span>
      </div>
    </div>
  );
}

function FpsPanel({ fps }: { fps: number }) {
  const tone = getFpsTone(fps);

  return (
    <div className="absolute bottom-8 right-6 z-20 w-[360px] rounded-2xl border border-slate-700/90 bg-slate-900/92 p-3 shadow-2xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-bold tracking-[0.2em] text-slate-500">帧率</div>
        <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${tone}`}>
          {getFpsLabel(fps)}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="min-w-16 text-2xl font-bold leading-none text-slate-100">{fps}</div>
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <motion.div
              animate={{ width: `${Math.min(100, (fps / 60) * 100)}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                fps >= 50 ? 'bg-emerald-400' : fps >= 30 ? 'bg-cyan-400' : fps >= 20 ? 'bg-amber-400' : 'bg-red-400'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ParseResultPanel({ info }: { info: ParseProcessInfo }) {
  const progressValue = getProgressValue(info);
  const evaluationMetrics = buildEvaluationMetrics(info);
  const overallScore = clampScore(
    evaluationMetrics.reduce((sum, metric) => sum + metric.score, 0) / evaluationMetrics.length,
  );
  const statusChipClass =
    info.status === 'success'
      ? 'bg-emerald-500/15 text-emerald-300'
      : info.status === 'error'
        ? 'bg-red-500/15 text-red-300'
        : 'bg-amber-500/15 text-amber-300';

  return (
    <div className="absolute right-6 top-6 z-30 w-[360px] pointer-events-auto">
      <div className="flex items-center justify-between rounded-t-2xl border border-slate-700/90 bg-slate-950/96 px-4 py-2 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          <Clock3 className="h-3.5 w-3.5" />
          结果窗口
        </div>
        <div className="text-[10px] tracking-[0.18em] text-slate-500">
          滚动
        </div>
      </div>
      <div className="max-h-[26rem] space-y-4 overflow-y-auto rounded-b-2xl border-x border-b border-slate-700/90 bg-slate-900/92 p-4 shadow-2xl backdrop-blur-md">
        <div className="rounded-3xl border border-slate-700/80 bg-slate-900/88 p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              <Clock3 className="h-3.5 w-3.5" />
              解析结果
            </div>
            <div className="text-base font-semibold text-slate-50">{info.modelName}</div>
          </div>
          <div className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusChipClass}`}>
            {getStatusLabel(info.status)}
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70">
            <ProgressRing value={progressValue} status={info.status} />
          </div>
          <div className="flex-1 space-y-2 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2">
              <div className="text-slate-500">当前格式</div>
              <div className="mt-1 font-semibold text-slate-100">{info.metrics?.format ?? '--'}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2">
              <div className="text-slate-500">综合评分</div>
              <div className="mt-1 font-semibold text-slate-100">
                {overallScore} / 100
                <span className="ml-1 text-[10px] text-slate-500">{getScoreLabel(overallScore)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
            <div className="text-slate-500">文件大小</div>
            <div className="mt-1 font-semibold text-slate-100">{formatBytes(info.metrics?.fileSizeBytes)}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
            <div className="text-slate-500">总耗时</div>
            <div className="mt-1 font-semibold text-slate-100">{formatMs(info.metrics?.totalTimeMs)}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
            <div className="text-slate-500">顶点数</div>
            <div className="mt-1 font-semibold text-slate-100">{info.metrics?.vertices?.toLocaleString() ?? '--'}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
            <div className="text-slate-500">三角面</div>
            <div className="mt-1 font-semibold text-slate-100">{info.metrics?.triangles?.toLocaleString() ?? '--'}</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">尺寸信息</div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            {[
              ['X', info.metrics?.dimensions?.x],
              ['Y', info.metrics?.dimensions?.y],
              ['Z', info.metrics?.dimensions?.z],
            ].map(([axis, value]) => (
              <div key={axis} className="rounded-xl border border-slate-800 bg-slate-900/70 p-2 text-center">
                <div className="text-slate-500">{axis}</div>
                <div className="mt-1 font-semibold text-slate-100">{formatDimension(value as number | undefined)}</div>
              </div>
            ))}
          </div>
        </div>
        </div>

        <div className="rounded-3xl border border-slate-700/80 bg-slate-900/88 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          <BarChart3 className="h-3.5 w-3.5" />
          评价指标
        </div>
        <div className="space-y-3">
          {evaluationMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.key} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl border ${getScoreTone(metric.score)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-100">{metric.label}</div>
                      <div className="text-[11px] text-slate-500">{metric.detail}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-100">{metric.score}</div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${
                      metric.score >= 90
                        ? 'bg-emerald-400'
                        : metric.score >= 75
                          ? 'bg-cyan-400'
                          : metric.score >= 60
                            ? 'bg-amber-400'
                            : 'bg-red-400'
                    }`}
                    style={{ width: `${metric.score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        </div>

        <div className="rounded-3xl border border-slate-700/80 bg-slate-900/88 p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" />
          格式说明
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3 text-xs leading-6 text-slate-300">
          {getFormatDescription(info.metrics?.format)}
        </div>
      </div>
      </div>
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = useState<SceneSettings>(DEFAULT_SETTINGS);
  const [currentModel, setCurrentModel] = useState<ModelInfo>(DEFAULT_MODEL);
  const [modelStats, setModelStats] = useState<{ vertices: number; triangles: number } | null>(null);
  const [fps, setFps] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [parseInfo, setParseInfo] = useState<ParseProcessInfo>(() => createInitialParseInfo(DEFAULT_MODEL.name));
  const uploadedModelUrlRef = useRef<string | null>(null);
  const overlayBoundsRef = useRef<HTMLDivElement>(null);

  const revokeUploadedModelUrl = (nextUrl?: string) => {
    if (uploadedModelUrlRef.current && uploadedModelUrlRef.current !== nextUrl) {
      URL.revokeObjectURL(uploadedModelUrlRef.current);
      uploadedModelUrlRef.current = null;
    }
  };

  const handleModelSelect = (url: string, name: string) => {
    setIsLoading(true);
    setModelStats(null);
    setParseInfo(createInitialParseInfo(name));
    if (url.startsWith('blob:')) {
      revokeUploadedModelUrl(url);
      uploadedModelUrlRef.current = url;
    } else {
      revokeUploadedModelUrl();
    }
    setCurrentModel({ url, name });
  };

  useEffect(() => () => revokeUploadedModelUrl(), []);

  return (
    <div className="flex h-screen flex-col bg-slate-950 font-sans text-slate-100 selection:bg-emerald-500/30">
      <header className="z-20 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/20">
            <Box className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">STL 3D 模型解析与渲染系统</h1>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-500">
              基于 Three.js 的毕业设计
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
        <div ref={overlayBoundsRef} className="relative flex-1">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,1))]" />
          <ParseProcessPanel info={parseInfo} />
          <ParseResultPanel info={parseInfo} />

          <ViewerWindow modelName={currentModel.name}>
            <Viewer
              modelName={currentModel.name}
            modelUrl={currentModel.url}
            settings={settings}
            onParseUpdate={setParseInfo}
            onFpsUpdate={setFps}
            onModelLoaded={(stats) => {
              setModelStats(stats);
              setIsLoading(false);
            }}
          />
          </ViewerWindow>
          <FpsPanel fps={fps} />

          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[5] flex items-center justify-center bg-slate-950/18 backdrop-blur-[1px]"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
                  <p className="animate-pulse text-sm font-medium text-emerald-400">正在解析 STL 模型...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pointer-events-none absolute bottom-8 left-8 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-2xl backdrop-blur">
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">当前模型</div>
            <div className="text-xl font-semibold text-emerald-400">{currentModel.name}</div>
          </div>

          <div className="group absolute bottom-8 right-6 z-20">
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 backdrop-blur transition-all hover:bg-slate-800">
              <HelpCircle className="h-5 w-5 text-slate-400" />
            </button>
            <div className="pointer-events-none absolute bottom-12 right-0 w-72 translate-y-2 rounded-2xl border border-slate-700 bg-slate-900 p-4 opacity-0 shadow-2xl transition-all group-hover:translate-y-0 group-hover:opacity-100">
              <h3 className="mb-2 text-sm font-bold">操作说明</h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>旋转：鼠标左键拖拽</li>
                <li>缩放：鼠标滚轮</li>
                <li>平移：鼠标右键拖拽</li>
                <li>重置：点击右侧“重置相机视角”</li>
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
          <span>·</span>
          <span>Three.js r183</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#" className="transition-colors hover:text-slate-300">
            项目文档
          </a>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Github className="h-3 w-3" />
            源代码
          </span>
        </div>
      </footer>
    </div>
  );
}
