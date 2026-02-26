import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File as FileIcon, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reorder, useDragControls } from 'motion/react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  className?: string;
  label?: string;
  small?: boolean;
}

export function FileUpload({ 
  onFilesSelected, 
  accept = { 'application/pdf': ['.pdf'] }, 
  maxFiles = 0, // 0 means unlimited
  className,
  label = "拖放 PDF 文件到此处，或点击选择",
  small = false
}: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFilesSelected(acceptedFiles);
    }
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: maxFiles > 0 ? maxFiles : undefined,
  } as any);

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors duration-200 ease-in-out",
        small ? "p-4" : "p-8",
        isDragActive ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className={cn(
          "bg-indigo-100 rounded-full text-indigo-600",
          small ? "p-2" : "p-4"
        )}>
          <Upload className={cn(small ? "w-4 h-4" : "w-8 h-8")} />
        </div>
        <div className="space-y-1">
          <p className={cn("font-medium text-gray-900", small ? "text-xs" : "text-sm")}>
            {isDragActive ? "释放文件..." : label}
          </p>
          {!small && (
            <p className="text-xs text-gray-500">
              文件数量和大小不限
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface FileListProps {
  files: File[];
  onRemove: (index: number) => void;
}

export function FileList({ files, onRemove }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      {files.map((file, index) => (
        <div 
          key={`${file.name}-${index}`}
          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 bg-red-50 rounded-lg">
              <FileIcon className="w-5 h-5 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={() => onRemove(index)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export interface SortableFileItem {
  id: string;
  file: File;
}

interface SortableFileListProps {
  items: SortableFileItem[];
  onReorder: (newItems: SortableFileItem[]) => void;
  onRemove: (id: string) => void;
}

export function SortableFileList({ items, onReorder, onRemove }: SortableFileListProps) {
  if (items.length === 0) return null;

  return (
    <Reorder.Group axis="y" values={items} onReorder={onReorder} className="mt-6 space-y-3">
      {items.map((item) => (
        <SortableItem key={item.id} item={item} onRemove={onRemove} />
      ))}
    </Reorder.Group>
  );
}

const SortableItem: React.FC<{ item: SortableFileItem; onRemove: (id: string) => void }> = ({ item, onRemove }) => {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm select-none touch-none"
    >
      <div className="flex items-center space-x-3 overflow-hidden flex-1">
        <div 
          className="p-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          onPointerDown={(e) => controls.start(e)}
        >
          <GripVertical className="w-5 h-5" />
        </div>
        <div className="p-2 bg-red-50 rounded-lg">
          <FileIcon className="w-5 h-5 text-red-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {item.file.name}
          </p>
          <p className="text-xs text-gray-500">
            {(item.file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className="p-1 text-gray-400 hover:text-red-500 transition-colors ml-2"
      >
        <X className="w-5 h-5" />
      </button>
    </Reorder.Item>
  );
}
