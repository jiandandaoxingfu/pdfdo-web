import React, { useState, useRef } from 'react';
import { FileUpload, FileList } from '@/components/ui/FileUpload';
import { saveAs } from 'file-saver';
import { Loader2, FileText } from 'lucide-react';
import * as mammoth from 'mammoth';
import html2pdf from 'html2pdf.js';

export function WordToPdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  const handleFilesSelected = async (selectedFiles: File[]) => {
    const file = selectedFiles[0];
    if (!file.name.endsWith('.docx')) {
      setMessage('请选择 .docx 格式的 Word 文档。');
      return;
    }
    setFiles([file]);
    setMessage('');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setHtmlContent(result.value);
    } catch (e) {
      console.error("Error converting Word to HTML", e);
      setMessage('预览 Word 文档时出错。');
    }
  };

  const handleRemoveFile = () => {
    setFiles([]);
    setMessage('');
    setHtmlContent('');
  };

  const handleConvert = async () => {
    if (!files.length || !contentRef.current) return;
    
    setIsProcessing(true);
    setMessage('正在转换为 PDF... 这可能需要一些时间。');
    
    try {
      const element = contentRef.current;
      const opt = {
        margin:       10,
        filename:     `${files[0].name.replace('.docx', '')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // html2pdf().set(opt).from(element).save() returns a promise
      await html2pdf().set(opt).from(element).save();
      
      setMessage('完成！已开始下载。');
    } catch (error) {
      console.error(error);
      setMessage('转换为 PDF 时出错。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {!files.length ? (
        <div className="max-w-4xl mx-auto space-y-8 mt-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Word 转 PDF</h2>
            <p className="text-gray-500">将 Word (.docx) 文档转换为 PDF 格式。</p>
            <p className="text-xs text-orange-500">注意：纯前端转换可能无法完美保留复杂的排版和样式。</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <FileUpload onFilesSelected={handleFilesSelected} maxFiles={1} accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
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
                <p className="text-xs text-orange-500">提示：由于是纯前端转换，复杂的表格、图片排版或特殊字体可能会丢失或错位。建议仅用于简单文本内容的转换。</p>
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
                      <FileText className="w-5 h-5" />
                      <span>转换为 PDF</span>
                    </>
                  )}
                </button>
                
                {message && (
                  <p className={`text-center text-sm ${message.includes('Error') || message.includes('出错') || message.includes('请') ? 'text-red-500' : 'text-green-600'}`}>
                    {message}
                  </p>
                )}
            </div>
          </div>

          {/* Right Content - Preview */}
          <div className="flex-1 bg-gray-100 rounded-xl p-4 flex flex-col h-[calc(100vh-140px)] overflow-hidden">
              <div className="flex items-center justify-between mb-4 bg-white p-2 rounded-lg shadow-sm">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold ml-2">预览内容</p>
              </div>
              
              <div className="flex-1 overflow-auto bg-white p-8 shadow-lg">
                {htmlContent ? (
                  <div 
                    ref={contentRef}
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                ) : (
                  <div className="text-gray-300 flex flex-col items-center justify-center h-full">
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
