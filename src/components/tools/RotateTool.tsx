import React, { useState, useEffect } from 'react';
import { FileUpload, FileList } from '@/components/ui/FileUpload';
import { rotatePdf, renderPageAsImage, getPdfInfo } from '@/lib/pdf-utils';
import { saveAs } from 'file-saver';
import { Loader2, RotateCw } from 'lucide-react';

export function RotateTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [rotation, setRotation] = useState<90 | 180 | 270>(90);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');

  const handleFilesSelected = async (selectedFiles: File[]) => {
    const file = selectedFiles[0];
    setFiles([file]);
    setMessage('');
    
    try {
      // Render first page for preview with 300 DPI (300/72 ≈ 4.17 scale)
      const scale = 300 / 72;
      const { image, width, height } = await renderPageAsImage(file, 0, scale);
      setPreviewImage(image);
    } catch (e) {
      console.error("Error generating preview", e);
    }
  };

  const handleRemoveFile = () => {
    setFiles([]);
    setMessage('');
    setPreviewImage('');
  };

  const handleRotate = async () => {
    if (!files.length) return;
    
    setIsProcessing(true);
    setMessage('旋转 PDF 中...');
    
    try {
      const blob = await rotatePdf(files[0], rotation);
      saveAs(blob, `${files[0].name.replace('.pdf', '')}-rotated.pdf`);
      setMessage('完成！已开始下载。');
    } catch (error) {
      console.error(error);
      setMessage('旋转 PDF 时出错。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {!files.length ? (
        <div className="max-w-4xl mx-auto space-y-8 mt-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">旋转 PDF</h2>
            <p className="text-gray-500">永久旋转您的 PDF 页面。</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <FileUpload onFilesSelected={handleFilesSelected} maxFiles={1} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row h-full gap-6">
          {/* Left Sidebar - Controls */}
          <div className="w-full lg:w-[20%] min-w-[250px] flex flex-col gap-6 bg-white p-4 border-r border-gray-200 overflow-y-auto h-full">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">旋转设置</h3>
              <FileList files={files} onRemove={handleRemoveFile} />
            </div>

            <div className="space-y-6 flex-1">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">旋转角度 (顺时针)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[90, 180, 270].map((deg) => (
                      <button
                        key={deg}
                        onClick={() => setRotation(deg as 90 | 180 | 270)}
                        className={`py-3 px-2 rounded-lg border text-sm font-medium transition-colors ${
                          rotation === deg 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-100' 
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleRotate}
                  disabled={isProcessing}
                  className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>处理中...</span>
                    </>
                  ) : (
                    <>
                      <RotateCw className="w-5 h-5" />
                      <span>旋转 PDF</span>
                    </>
                  )}
                </button>
                
                {message && (
                  <p className={`text-center text-sm ${message.includes('Error') || message.includes('出错') ? 'text-red-500' : 'text-green-600'}`}>
                    {message}
                  </p>
                )}
            </div>
          </div>

          {/* Right Content - Preview */}
          <div className="flex-1 bg-gray-100 rounded-xl p-4 flex flex-col h-[calc(100vh-140px)] overflow-hidden">
              <div className="flex items-center justify-between mb-4 bg-white p-2 rounded-lg shadow-sm">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold ml-2">预览</p>
              </div>
              
              <div className="flex-1 flex items-center justify-center overflow-auto">
                {previewImage ? (
                  <div 
                    className="relative transition-transform duration-500 ease-in-out shadow-lg bg-white"
                    style={{ 
                        transform: `rotate(${rotation}deg)`,
                        height: '95%',
                        width: 'auto',
                        maxWidth: '100%',
                        aspectRatio: 'auto'
                    }}
                  >
                    <img 
                      src={previewImage} 
                      alt="PDF Preview" 
                      className="w-full h-full object-contain"
                    />
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
