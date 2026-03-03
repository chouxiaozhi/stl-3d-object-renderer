import React, { useCallback } from 'react';
import { Upload, FileCode } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (url: string, name: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const handleFile = (file: File) => {
    if (file && (file.name.toLowerCase().endsWith('.stl'))) {
      const url = URL.createObjectURL(file);
      onFileSelect(url, file.name);
    } else {
      alert('请上传 .stl 格式的文件');
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div 
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="relative group"
    >
      <input 
        type="file" 
        accept=".stl" 
        onChange={onFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20">
        <Upload className="w-4 h-4" />
        <span className="text-sm font-medium">上传 STL 模型</span>
      </div>
    </div>
  );
};

export const SampleModels: React.FC<{ onSelect: (url: string, name: string) => void }> = ({ onSelect }) => {
  const samples = [
    { 
      name: 'cube', 
      url: '/models/cube.stl' 
    },
    { 
      name: 'pyramid', 
      url: '/models/pyramid.stl' 
    },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold mr-2">示例:</span>
      {samples.map(sample => (
        <button
          key={sample.name}
          onClick={() => onSelect(sample.url, sample.name)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition-all"
        >
          {sample.name}
        </button>
      ))}
    </div>
  );
};
