import React, { useState } from 'react';
import { FileUpload, SortableFileList, type SortableFileItem } from '@/components/ui/FileUpload';
import { mergePdfs } from '@/lib/pdf-utils';
import { saveAs } from 'file-saver';
import { Loader2, Layers } from 'lucide-react';

export function MergeTool() {
  const [items, setItems] = useState<SortableFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');

  const handleFilesSelected = (selectedFiles: File[]) => {
    const newItems = selectedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file
    }));
    setItems(prev => [...prev, ...newItems]);
    setMessage('');
  };

  const handleRemoveFile = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleReorder = (newItems: SortableFileItem[]) => {
    setItems(newItems);
  };

  const handleMerge = async () => {
    if (items.length < 2) {
      setMessage('请至少选择 2 个 PDF 文件进行合并。');
      return;
    }
    
    setIsProcessing(true);
    setMessage('合并 PDF 中...');
    
    try {
      const files = items.map(item => item.file);
      const blob = await mergePdfs(files);
      saveAs(blob, `merged-document.pdf`);
      setMessage('完成！已开始下载。');
    } catch (error) {
      console.error(error);
      setMessage('合并 PDF 时出错。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {!items.length ? (
        <div className="max-w-4xl mx-auto space-y-8 mt-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">合并 PDF</h2>
            <p className="text-gray-500">将多个 PDF 文件合并为一个文档。</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <FileUpload onFilesSelected={handleFilesSelected} maxFiles={10} label="添加要合并的 PDF 文件" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row h-full gap-6">
          {/* Left Sidebar - Controls */}
          <div className="w-full lg:w-[20%] min-w-[250px] flex flex-col gap-6 bg-white p-4 border-r border-gray-200 overflow-y-auto h-full">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">合并设置</h3>
              <p className="text-sm text-gray-500">
                拖动列表中的文件以重新排序。顶部的文件将作为第一页。
              </p>
            </div>

            <div className="space-y-4 flex-1">
               <div className="space-y-2">
                 <label className="block text-sm font-medium text-gray-700">添加更多文件</label>
                 <FileUpload onFilesSelected={handleFilesSelected} maxFiles={10} label="添加 PDF" small />
               </div>

               <div className="pt-4">
                  <button
                    onClick={handleMerge}
                    disabled={isProcessing || items.length < 2}
                    className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>处理中...</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-5 h-5" />
                        <span>合并 PDF</span>
                      </>
                    )}
                  </button>
                  
                  {message && (
                    <p className={`text-center text-xs mt-2 ${message.includes('Error') || message.includes('出错') || message.includes('请') ? 'text-red-500' : 'text-green-600'}`}>
                      {message}
                    </p>
                  )}
               </div>
            </div>
          </div>

          {/* Right Content - File List */}
          <div className="flex-1 bg-gray-100 rounded-xl p-4 flex flex-col h-[calc(100vh-140px)] overflow-hidden">
             <div className="flex items-center justify-between mb-4 bg-white p-2 rounded-lg shadow-sm">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold ml-2">要合并的文件 ({items.length})</p>
                <button 
                  onClick={() => setItems([])}
                  className="text-xs text-red-600 hover:text-red-700 font-medium px-2"
                >
                  清空所有
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 bg-white rounded-lg border border-gray-200">
               <SortableFileList items={items} onReorder={handleReorder} onRemove={handleRemoveFile} />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
