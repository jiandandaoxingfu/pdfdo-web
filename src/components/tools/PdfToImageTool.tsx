import React, { useState } from 'react';
import { FileUpload, FileList } from '@/components/ui/FileUpload';
import { convertPdfToImages, renderPageAsImage } from '@/lib/pdf-utils';
import { saveAs } from 'file-saver';
import { Loader2, Image as ImageIcon } from 'lucide-react';

export function PdfToImageTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [dpi, setDpi] = useState(200);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [previewImage, setPreviewImage] = useState<string>('');

  const handleFilesSelected = async (selectedFiles: File[]) => {
    const file = selectedFiles[0];
    setFiles([file]);
    setMessage('');
    
    try {
      // Render first page for preview with 300 DPI
      const scale = 300 / 72;
      const { image } = await renderPageAsImage(file, 0, scale);
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

  const handleConvert = async () => {
    if (!files.length) return;
    
    setIsProcessing(true);
    setMessage('正在将页面转换为图片... 这可能需要一些时间。');
    
    try {
      const blob = await convertPdfToImages(files[0], dpi);
      saveAs(blob, `${files[0].name.replace('.pdf', '')}-images.zip`);
      setMessage('完成！已开始下载。');
    } catch (error) {
      console.error(error);
      setMessage('PDF 转图片时出错。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {!files.length ? (
        <div className="max-w-4xl mx-auto space-y-8 mt-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">PDF 转图片</h2>
            <p className="text-gray-500">将 PDF 的每一页转换为高质量图片。</p>
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
              <h3 className="text-lg font-bold text-gray-900">转换设置</h3>
              <FileList files={files} onRemove={handleRemoveFile} />
            </div>

            <div className="space-y-6 flex-1">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">图片质量 (DPI)</label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="72"
                      max="300"
                      step="10"
                      value={dpi}
                      onChange={(e) => setDpi(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm font-mono text-gray-600 w-16 text-right">{dpi} DPI</span>
                  </div>
                  <p className="text-xs text-gray-500">DPI 越高，质量越好，但文件越大，处理速度越慢。</p>
                </div>

                <button
                  onClick={handleConvert}
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
                      <ImageIcon className="w-5 h-5" />
                      <span>转换为图片</span>
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
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold ml-2">预览 (第一页)</p>
              </div>
              
              <div className="flex-1 flex items-center justify-center overflow-auto">
                {previewImage ? (
                  <div 
                    className="relative shadow-lg bg-white"
                    style={{
                      height: '95%',
                      width: 'auto',
                      maxWidth: '100%',
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
