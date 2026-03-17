import React, { useState } from 'react';
import { FileUpload, FileList } from '@/components/ui/FileUpload';
import { saveAs } from 'file-saver';
import { Loader2, FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { isPdfEncrypted } from '@/lib/pdf-utils';
import { AlertModal } from '@/components/ui/Modals';

export function PdfToWordTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });

  const handleFilesSelected = async (selectedFiles: File[]) => {
    const file = selectedFiles[0];
    
    const encrypted = await isPdfEncrypted(file);
    if (encrypted) {
      setAlertModal({
        isOpen: true,
        title: '无法处理加密文档',
        message: `文件 "${file.name}" 已加密。请先解密后再试。`
      });
      return;
    }

    setFiles([file]);
    setMessage('');
  };

  const handleRemoveFile = () => {
    setFiles([]);
    setMessage('');
  };

  const handleConvert = async () => {
    if (!files.length) return;
    
    setIsProcessing(true);
    setMessage('正在提取文本并转换为 Word... 这可能需要一些时间。');
    
    try {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const paragraphs: Paragraph[] = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        let lastY = -1;
        let currentLine: string[] = [];
        
        for (const item of textContent.items) {
          if ('str' in item) {
            // Very basic line detection based on Y coordinate
            if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
              paragraphs.push(new Paragraph({
                children: [new TextRun(currentLine.join(' '))]
              }));
              currentLine = [];
            }
            currentLine.push(item.str);
            lastY = item.transform[5];
          }
        }
        
        if (currentLine.length > 0) {
          paragraphs.push(new Paragraph({
            children: [new TextRun(currentLine.join(' '))]
          }));
        }
        
        // Add page break if not last page
        if (i < pdf.numPages) {
          paragraphs.push(new Paragraph({ pageBreakBefore: true }));
        }
      }
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      });
      
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${file.name.replace('.pdf', '')}.docx`);
      
      setMessage('完成！已开始下载。');
    } catch (error) {
      console.error(error);
      setMessage('转换为 Word 时出错。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {!files.length ? (
        <div className="max-w-4xl mx-auto space-y-8 mt-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">PDF 转 Word</h2>
            <p className="text-gray-500">从 PDF 中提取文本并保存为 Word (.docx) 文档。</p>
            <p className="text-xs text-orange-500">注意：纯前端转换仅能提取纯文本，无法保留图片、表格和排版。</p>
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
                <p className="text-xs text-orange-500">提示：由于是纯前端提取，复杂的排版、图片和表格将丢失。此工具仅适用于提取纯文本内容。</p>
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
                      <span>转换为 Word</span>
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

          {/* Right Content - Info */}
          <div className="flex-1 bg-gray-100 rounded-xl p-4 flex flex-col h-[calc(100vh-140px)] overflow-hidden">
              <div className="flex items-center justify-between mb-4 bg-white p-2 rounded-lg shadow-sm">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold ml-2">说明</p>
              </div>
              
              <div className="flex-1 overflow-auto bg-white p-8 shadow-lg flex flex-col items-center justify-center text-center space-y-4">
                 <FileText className="w-16 h-16 text-gray-300" />
                 <h3 className="text-xl font-medium text-gray-700">准备好转换</h3>
                 <p className="text-gray-500 max-w-md">点击左侧的“转换为 Word”按钮开始提取文本。请注意，此工具只能提取文本，无法保留原始 PDF 的排版和图片。</p>
              </div>
          </div>
        </div>
      )}
      
      <AlertModal 
        isOpen={alertModal.isOpen} 
        title={alertModal.title} 
        message={alertModal.message} 
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })} 
      />
    </div>
  );
}
