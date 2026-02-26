import React, { useState, useEffect, useRef } from 'react';
import { FileUpload, FileList } from '@/components/ui/FileUpload';
import { cropPdf, getPdfInfo, renderPageAsImage, type PdfFile } from '@/lib/pdf-utils';
import { saveAs } from 'file-saver';
import { Loader2, Crop } from 'lucide-react';

export function CropTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [pdfInfo, setPdfInfo] = useState<PdfFile | null>(null);
  const [margins, setMargins] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [previewScale, setPreviewScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFilesSelected = async (selectedFiles: File[]) => {
    const file = selectedFiles[0];
    setFiles([file]);
    setMargins({ top: 0, bottom: 0, left: 0, right: 0 });
    
    try {
      const info = await getPdfInfo(file);
      setPdfInfo(info);
      setMessage('');
      
      // Render first page for preview with 300 DPI
      const scale = 300 / 72;
      const { image } = await renderPageAsImage(file, 0, scale);
      setPreviewImage(image);
    } catch (error) {
      console.error(error);
      setMessage('加载 PDF 信息出错');
    }
  };

  const handleRemoveFile = () => {
    setFiles([]);
    setPdfInfo(null);
    setMessage('');
    setMargins({ top: 0, bottom: 0, left: 0, right: 0 });
    setPreviewImage('');
  };

  const handleCrop = async () => {
    if (!files.length) return;
    
    setIsProcessing(true);
    setMessage('裁剪 PDF 中...');
    
    try {
      const blob = await cropPdf(files[0], margins);
      saveAs(blob, `${files[0].name.replace('.pdf', '')}-cropped.pdf`);
      setMessage('完成！已开始下载。');
    } catch (error) {
      console.error(error);
      setMessage('裁剪 PDF 时出错。');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate scaling factor for overlay
  useEffect(() => {
    if (containerRef.current && pdfInfo?.width) {
       // The image is rendered with object-contain, so we need to find the actual displayed size
       // This is a simplification. For precise overlay, we need to know the rendered dimensions.
       // Let's assume the image takes up the full width of the container for now or use a fixed aspect ratio container.
       // A better approach is to use the rendered image dimensions.
       const img = containerRef.current.querySelector('img');
       if (img) {
         const updateScale = () => {
           const displayedWidth = img.clientWidth;
           const originalWidth = pdfInfo.width || 1;
           setPreviewScale(displayedWidth / originalWidth);
         };
         
         // Wait for image load
         if (img.complete) updateScale();
         else img.onload = updateScale;
         
         window.addEventListener('resize', updateScale);
         return () => window.removeEventListener('resize', updateScale);
       }
    }
  }, [previewImage, pdfInfo]);

  return (
    <div className="w-full h-full flex flex-col">
      {!files.length ? (
        <div className="max-w-4xl mx-auto space-y-8 mt-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">裁剪 PDF</h2>
            <p className="text-gray-500">裁剪 PDF 页面的边距。</p>
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
              <h3 className="text-lg font-bold text-gray-900">裁剪设置</h3>
              <FileList files={files} onRemove={handleRemoveFile} />
              
              {pdfInfo && (
                <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600">
                  <p><strong>原始尺寸:</strong> {pdfInfo.width?.toFixed(0)} x {pdfInfo.height?.toFixed(0)} 点</p>
                </div>
              )}
            </div>

            <div className="space-y-6 flex-1">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">裁剪边距 (点)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">上</label>
                      <input
                        type="number"
                        min="0"
                        value={margins.top}
                        onChange={(e) => setMargins({ ...margins, top: Math.max(0, Number(e.target.value)) })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">下</label>
                      <input
                        type="number"
                        min="0"
                        value={margins.bottom}
                        onChange={(e) => setMargins({ ...margins, bottom: Math.max(0, Number(e.target.value)) })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">左</label>
                      <input
                        type="number"
                        min="0"
                        value={margins.left}
                        onChange={(e) => setMargins({ ...margins, left: Math.max(0, Number(e.target.value)) })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">右</label>
                      <input
                        type="number"
                        min="0"
                        value={margins.right}
                        onChange={(e) => setMargins({ ...margins, right: Math.max(0, Number(e.target.value)) })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    红色边框显示新的页面边界。红框以外的区域将被裁剪。
                  </p>
                </div>

                <button
                  onClick={handleCrop}
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
                      <Crop className="w-5 h-5" />
                      <span>裁剪 PDF</span>
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
                    className="relative shadow-lg bg-white" 
                    ref={containerRef}
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
                    {/* Crop Overlay */}
                    <div 
                      className="absolute border-2 border-red-500 bg-red-500/10 pointer-events-none"
                      style={{
                        top: margins.top * previewScale,
                        bottom: margins.bottom * previewScale,
                        left: margins.left * previewScale,
                        right: margins.right * previewScale,
                        position: 'absolute'
                      }}
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
