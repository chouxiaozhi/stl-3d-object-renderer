import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (url: string, name: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const handleFile = (file?: File) => {
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.stl')) {
      const url = URL.createObjectURL(file);
      onFileSelect(url, file.name);
      return;
    }

    alert('请上传 .stl 格式的模型文件');
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFile(e.dataTransfer.files[0]);
    },
    [onFileSelect],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
  };

  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop} className="group relative">
      <input
        type="file"
        accept=".stl"
        onChange={onFileChange}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      />
      <div className="flex items-center gap-3 rounded-xl bg-emerald-500 px-4 py-2 text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600">
        <Upload className="h-4 w-4" />
        <span className="text-sm font-medium">上传 STL 模型</span>
      </div>
    </div>
  );
};

export const SampleModels: React.FC<{ onSelect: (url: string, name: string) => void }> = ({ onSelect }) => {
  const samples = [
    { name: 'cube', url: '/models/cube.stl' },
    { name: 'pyramid', url: '/models/pyramid.stl' },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-slate-500">示例:</span>
      {samples.map((sample) => (
        <button
          key={sample.name}
          onClick={() => onSelect(sample.url, sample.name)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition-all hover:bg-slate-700"
        >
          {sample.name}
        </button>
      ))}
    </div>
  );
};
