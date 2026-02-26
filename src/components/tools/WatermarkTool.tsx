import React, { useState, useEffect, useRef } from 'react';
import { FileUpload, FileList } from '@/components/ui/FileUpload';
import { addWatermark, renderPageAsImage, getPdfInfo } from '@/lib/pdf-utils';
import { saveAs } from 'file-saver';
import { Loader2, Stamp, Type, FileText, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WatermarkTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [watermarkType, setWatermarkType] = useState<'text' | 'file'>('text');
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [textOptions, setTextOptions] = useState({
    size: 50,
    opacity: 0.5,
    color: '#FF0000'
  });
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
  const [rotation, setRotation] = useState(45);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const loadPagePreview = async (file: File, pageIndex: number) => {
    try {
      // Use 300 DPI (300/72 ≈ 4.17 scale) for high quality
      const scale = 300 / 72;
      const { image, width, height } = await renderPageAsImage(file, pageIndex, scale);
      setPreviewImage(image);
      setPageSize({ width, height });
    } catch (e) {
      console.error("Error generating preview", e);
    }
  };

  const handleFilesSelected = async (selectedFiles: File[]) => {
    const file = selectedFiles[0];
    setFiles([file]);
    setMessage('');
    setCurrentPage(0);
    
    try {
      const info = await getPdfInfo(file);
      setPageCount(info.pageCount || 0);
      await loadPagePreview(file, 0);
    } catch (e) {
      console.error("Error loading PDF info", e);
      setMessage('加载 PDF 信息出错');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < pageCount) {
      setCurrentPage(newPage);
      if (files.length > 0) {
        loadPagePreview(files[0], newPage);
      }
    }
  };

  const handleWatermarkSelected = (selectedFiles: File[]) => {
    setWatermarkFile(selectedFiles[0]);
  };

  const handleRemoveFile = () => {
    setFiles([]);
    setMessage('');
    setPreviewImage('');
    setPageCount(0);
    setCurrentPage(0);
  };

  const handleRemoveWatermark = () => {
    setWatermarkFile(null);
  };

  const handleAddWatermark = async () => {
    if (!files.length) return;
    if (watermarkType === 'file' && !watermarkFile) return;
    if (watermarkType === 'text' && !watermarkText) return;
    
    setIsProcessing(true);
    setMessage('添加水印中...');
    
    try {
      const blob = await addWatermark(files[0], {
        file: watermarkType === 'file' ? watermarkFile! : undefined,
        text: watermarkType === 'text' ? watermarkText : undefined,
        size: textOptions.size,
        opacity: textOptions.opacity,
        color: textOptions.color,
        x: position.x,
        y: position.y,
        rotation: rotation
      });
      saveAs(blob, `${files[0].name.replace('.pdf', '')}-watermarked.pdf`);
      setMessage('完成！已开始下载。');
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : '添加水印时出错。');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !previewContainerRef.current) return;
    
    const rect = previewContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // Clamp values between 0 and 1
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));
    
    setPosition({ x: clampedX, y: clampedY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isDragging]);

  return (
    <div className="w-full h-full flex flex-col">
      {!files.length ? (
        <div className="max-w-4xl mx-auto space-y-8 mt-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">添加水印</h2>
            <p className="text-gray-500">在文档上覆盖文本或另一个 PDF 页面。</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-8">
             <div className="space-y-4">
               <h3 className="text-sm font-medium text-gray-700">1. 选择目标 PDF</h3>
               <FileUpload onFilesSelected={handleFilesSelected} maxFiles={1} />
             </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row h-full gap-6">
          {/* Left Sidebar - Controls */}
          <div className="w-full lg:w-[20%] min-w-[250px] flex flex-col gap-6 bg-white p-4 border-r border-gray-200 overflow-y-auto h-full">
             <div className="space-y-4">
               <h3 className="text-lg font-bold text-gray-900">水印设置</h3>
               <FileList files={files} onRemove={handleRemoveFile} />
             </div>

             <div className="space-y-6 flex-1">
                 <div className="flex space-x-2 border-b border-gray-200 pb-4">
                    <button
                      onClick={() => setWatermarkType('text')}
                      className={cn(
                        "flex-1 flex items-center justify-center space-x-2 px-2 py-2 rounded-lg text-sm font-medium transition-colors",
                        watermarkType === 'text' ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      <Type className="w-4 h-4" />
                      <span>文本</span>
                    </button>
                    <button
                      onClick={() => setWatermarkType('file')}
                      className={cn(
                        "flex-1 flex items-center justify-center space-x-2 px-2 py-2 rounded-lg text-sm font-medium transition-colors",
                        watermarkType === 'file' ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      <FileText className="w-4 h-4" />
                      <span>PDF 文件</span>
                    </button>
                 </div>

                 {/* Controls Content */}
                 <div className="space-y-6">
                   {watermarkType === 'text' ? (
                     <div className="space-y-4">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">水印文本</label>
                         <input
                           type="text"
                           value={watermarkText}
                           onChange={(e) => setWatermarkText(e.target.value)}
                           className="w-full p-2 border border-gray-300 rounded-lg"
                           placeholder="例如：机密"
                         />
                         <p className="text-xs text-gray-500 mt-1">
                           支持 <code>{'{page}'}</code>, <code>{'{total}'}</code>, <code>{'{page:02}'}</code>
                         </p>
                         <div className="flex flex-wrap gap-2 mt-2">
                           <button
                             onClick={() => setWatermarkText(prev => prev + '{page}')}
                             className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
                           >
                             + 页码
                           </button>
                           <button
                             onClick={() => setWatermarkText(prev => prev + '{total}')}
                             className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
                           >
                             + 总页数
                           </button>
                           <button
                             onClick={() => setWatermarkText(prev => prev + '{page:02}')}
                             className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
                           >
                             + 01, 02...
                           </button>
                         </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">大小</label>
                            <input
                              type="number"
                              value={textOptions.size}
                              onChange={(e) => setTextOptions({...textOptions, size: Number(e.target.value)})}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">不透明度</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="1"
                              value={textOptions.opacity}
                              onChange={(e) => setTextOptions({...textOptions, opacity: Number(e.target.value)})}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">颜色</label>
                         <div className="flex items-center space-x-2">
                           <input
                             type="color"
                             value={textOptions.color}
                             onChange={(e) => setTextOptions({...textOptions, color: e.target.value})}
                             className="h-10 w-full p-1 border border-gray-300 rounded-lg cursor-pointer"
                           />
                         </div>
                       </div>
                     </div>
                   ) : (
                     <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700">水印文件</h3>
                        {!watermarkFile ? (
                          <FileUpload onFilesSelected={handleWatermarkSelected} maxFiles={1} label="选择 PDF" />
                        ) : (
                          <FileList files={[watermarkFile]} onRemove={handleRemoveWatermark} />
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">不透明度</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="1"
                              value={textOptions.opacity}
                              onChange={(e) => setTextOptions({...textOptions, opacity: Number(e.target.value)})}
                              className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                     </div>
                   )}

                   {/* Rotation Control */}
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center"><RotateCw className="w-4 h-4 mr-2" /> 旋转</span>
                        <span>{rotation}°</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={rotation}
                        onChange={(e) => setRotation(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                   </div>

                   <button
                      onClick={handleAddWatermark}
                      disabled={isProcessing || (watermarkType === 'file' && !watermarkFile) || (watermarkType === 'text' && !watermarkText)}
                      className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>处理中...</span>
                        </>
                      ) : (
                        <>
                          <Stamp className="w-5 h-5" />
                          <span>添加水印</span>
                        </>
                      )}
                    </button>
                    
                    {message && (
                      <p className={`text-center text-sm ${message.includes('Error') || message.includes('出错') || message.includes('无法') ? 'text-red-500' : 'text-green-600'}`}>
                        {message}
                      </p>
                    )}
                 </div>
             </div>
          </div>

          {/* Right Content - Preview */}
          <div className="flex-1 bg-gray-100 rounded-xl p-4 flex flex-col h-[calc(100vh-140px)] overflow-hidden">
              <div className="flex items-center justify-between mb-4 bg-white p-2 rounded-lg shadow-sm">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold ml-2">预览</p>
                {pageCount > 1 && (
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 0}
                      className="px-3 py-1 text-xs bg-gray-50 border rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                      上一页
                    </button>
                    <span className="text-xs font-medium text-gray-600">
                      {currentPage + 1} / {pageCount}
                    </span>
                    <button 
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === pageCount - 1}
                      className="px-3 py-1 text-xs bg-gray-50 border rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                      下一页
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex-1 flex items-center justify-center overflow-auto">
                {previewImage ? (
                  <div 
                    ref={previewContainerRef}
                    className="relative shadow-2xl bg-white cursor-crosshair select-none"
                    onMouseMove={handleMouseMove}
                    onMouseDown={handleMouseDown}
                    style={{ 
                      touchAction: 'none',
                      aspectRatio: pageSize.width && pageSize.height ? `${pageSize.width} / ${pageSize.height}` : 'auto',
                      height: '95%', // Fill height mostly
                      width: 'auto',
                      maxWidth: '100%',
                    }} 
                  >
                    <img 
                      src={previewImage} 
                      alt="PDF Preview" 
                      className="w-full h-full object-contain pointer-events-none block"
                    />
                    {/* Text Watermark Preview Overlay */}
                    {watermarkType === 'text' && watermarkText && (
                      <div 
                        className="absolute flex items-center justify-center cursor-move border border-dashed border-indigo-300 hover:border-indigo-500"
                        style={{ 
                          left: `${position.x * 100}%`,
                          top: `${position.y * 100}%`,
                          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                          opacity: textOptions.opacity 
                        }}
                      >
                        <span 
                          className="whitespace-nowrap"
                          style={{ 
                            fontSize: `${textOptions.size / 2}px`, // Scale down for preview roughly
                            color: textOptions.color,
                            fontWeight: 'bold',
                            fontFamily: 'serif'
                          }}
                        >
                          {watermarkText
                            .replace(/{page}/g, (currentPage + 1).toString())
                            .replace(/{total}/g, pageCount.toString())
                            .replace(/{page:(\d+)}/g, (_, width) => (currentPage + 1).toString().padStart(parseInt(width), '0'))
                          }
                        </span>
                      </div>
                    )}
                    {/* File Watermark Preview Overlay */}
                    {watermarkType === 'file' && watermarkFile && (
                      <div 
                         className="absolute flex items-center justify-center bg-black/10 cursor-move border-2 border-dashed border-indigo-400"
                         style={{
                           left: `${position.x * 100}%`,
                           top: `${position.y * 100}%`,
                           transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                           width: '100%', // Assuming full page overlay
                           height: '100%'
                         }}
                      >
                         <p className="bg-white/80 px-2 py-1 rounded text-xs pointer-events-none">PDF 覆盖</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-300 flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <span>加载预览中...</span>
                  </div>
                )}
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
