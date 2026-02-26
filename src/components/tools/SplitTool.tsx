import React, { useState, useEffect } from 'react';
import { FileUpload, FileList } from '@/components/ui/FileUpload';
import { splitPdf, getPdfInfo, renderPageAsImage, type PdfFile } from '@/lib/pdf-utils';
import { saveAs } from 'file-saver';
import { Loader2, Scissors, CheckCircle2, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageData {
  id: string;
  originalIndex: number;
  image: string;
}

export function SplitTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [pdfInfo, setPdfInfo] = useState<PdfFile | null>(null);
  const [mode, setMode] = useState<'each' | 'ranges' | 'selected' | 'delete' | 'extract'>('each');
  const [ranges, setRanges] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');

  const handleFilesSelected = async (selectedFiles: File[]) => {
    const file = selectedFiles[0];
    setFiles([file]);
    setPages([]);
    setSelectedIds([]);
    
    try {
      const info = await getPdfInfo(file);
      setPdfInfo(info);
      setMessage(`已加载 ${file.name} (${info.pageCount} 页)`);
      
      // Load thumbnails
      setIsLoadingThumbnails(true);
      const newPages: PageData[] = [];
      const limit = Math.min(info.pageCount || 0, 50);
      
      for (let i = 0; i < limit; i++) {
        try {
          const { image } = await renderPageAsImage(file, i, 2);
          newPages.push({
            id: `page-${i}-${Date.now()}`,
            originalIndex: i,
            image
          });
        } catch (e) {
          console.error(`Error rendering page ${i}`, e);
        }
      }
      setPages(newPages);
      setIsLoadingThumbnails(false);
      
    } catch (error) {
      console.error(error);
      setMessage('加载 PDF 信息出错');
      setIsLoadingThumbnails(false);
    }
  };

  const togglePageSelection = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(p => p !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleRemoveFile = () => {
    setFiles([]);
    setPdfInfo(null);
    setPages([]);
    setSelectedIds([]);
    setMessage('');
  };

  const handleRemovePages = () => {
    if (!selectedIds.length) return;
    setPages(prev => prev.filter(p => !selectedIds.includes(p.id)));
    setSelectedIds([]);
    setMessage('页面已从视图中移除。点击“下载 PDF”保存。');
  };

  const handleSplit = async () => {
    if (!files.length) return;
    
    setIsProcessing(true);
    setMessage(mode === 'delete' ? '保存 PDF 中...' : mode === 'extract' ? '提取页面中...' : '拆分 PDF 中...');
    
    try {
      // Determine source indices based on current pages state
      const currentIndices = pages.map(p => p.originalIndex);
      
      let blob: Blob | Blob[];
      
      if (mode === 'delete') {
        // For delete mode, we just save the current pages (which have deletions applied)
        // This is effectively an 'extract' of the remaining pages
        blob = await splitPdf(files[0], 'extract', undefined, currentIndices, undefined);
      } else if (mode === 'extract') {
        // Extract selected pages from the current view
        const selectedOriginalIndices = pages
          .filter(p => selectedIds.includes(p.id))
          .map(p => p.originalIndex);
        blob = await splitPdf(files[0], 'extract', undefined, selectedOriginalIndices, undefined);
      } else if (mode === 'selected') {
        // Split selected pages into individual files
        const selectedOriginalIndices = pages
          .filter(p => selectedIds.includes(p.id))
          .map(p => p.originalIndex);
        // We pass selectedOriginalIndices as selectedPages, but we need to tell splitPdf to use them directly
        // Actually, splitPdf 'selected' mode iterates selectedPages. 
        // If we pass sourceIndices, it uses them. 
        // But here we can just pass the indices directly as selectedPages and NOT pass sourceIndices (or pass all).
        blob = await splitPdf(files[0], 'selected', undefined, selectedOriginalIndices, undefined);
      } else if (mode === 'each') {
        // Split all visible pages
        blob = await splitPdf(files[0], 'each', undefined, undefined, currentIndices);
      } else if (mode === 'ranges') {
        // Ranges refer to 1-based index of the CURRENT view
        // splitPdf 'ranges' mode with sourceIndices handles this mapping
        blob = await splitPdf(files[0], 'ranges', ranges, undefined, currentIndices);
      } else {
        throw new Error('Unknown mode');
      }

      const extension = (mode === 'delete' || mode === 'extract') ? 'pdf' : 'zip';
      const suffix = mode === 'delete' ? '-edited' : mode === 'extract' ? '-extracted' : '-split';
      saveAs(blob, `${files[0].name.replace('.pdf', '')}${suffix}.${extension}`);
      setMessage('完成！已开始下载。');
    } catch (error) {
      console.error(error);
      setMessage('处理 PDF 时出错。请检查您的输入。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {!files.length ? (
        <div className="max-w-4xl mx-auto space-y-8 mt-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">拆分 PDF</h2>
            <p className="text-gray-500">提取页面或将 PDF 文件拆分为多个文档。</p>
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
              <h3 className="text-lg font-bold text-gray-900">拆分设置</h3>
              <FileList files={files} onRemove={handleRemoveFile} />
              
              {pdfInfo && (
                <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600">
                  <p><strong>页数:</strong> {pdfInfo.pageCount}</p>
                  <p><strong>尺寸:</strong> {pdfInfo.width?.toFixed(0)} x {pdfInfo.height?.toFixed(0)} pts</p>
                </div>
              )}
            </div>

            <div className="space-y-4 flex-1">
              <label className="block text-sm font-medium text-gray-700">拆分模式</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode('each')}
                  className={cn(
                    "py-2 px-2 rounded-lg border text-xs font-medium transition-colors text-center",
                    mode === 'each' 
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  拆分所有
                </button>
                <button
                  onClick={() => setMode('selected')}
                  className={cn(
                    "py-2 px-2 rounded-lg border text-xs font-medium transition-colors text-center",
                    mode === 'selected' 
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  选择页面
                </button>
                <button
                  onClick={() => setMode('ranges')}
                  className={cn(
                    "py-2 px-2 rounded-lg border text-xs font-medium transition-colors text-center",
                    mode === 'ranges' 
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  范围
                </button>
                <button
                  onClick={() => setMode('delete')}
                  className={cn(
                    "py-2 px-2 rounded-lg border text-xs font-medium transition-colors text-center",
                    mode === 'delete' 
                      ? "bg-red-50 border-red-200 text-red-700" 
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  删除页面
                </button>
                <button
                  onClick={() => setMode('extract')}
                  className={cn(
                    "py-2 px-2 rounded-lg border text-xs font-medium transition-colors text-center",
                    mode === 'extract' 
                      ? "bg-green-50 border-green-200 text-green-700" 
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  提取页面
                </button>
              </div>

              {mode === 'ranges' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    范围 (例如: "1-5, 8")
                  </label>
                  <input
                    type="text"
                    value={ranges}
                    onChange={(e) => setRanges(e.target.value)}
                    placeholder="1-5, 8, 10-12"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
              )}

              <div className="pt-4 space-y-3">
                  {mode === 'delete' ? (
                    <>
                      <button
                        onClick={handleRemovePages}
                        disabled={selectedIds.length === 0}
                        className="w-full py-3 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm"
                      >
                        <Trash2 className="w-5 h-5" />
                        <span>移除选中</span>
                      </button>
                      
                      <button
                        onClick={handleSplit}
                        disabled={isProcessing || pages.length === 0}
                        className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Download className="w-5 h-5" />
                        )}
                        <span>下载 PDF</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleSplit}
                      disabled={isProcessing || (mode === 'ranges' && !ranges) || ((mode === 'selected' || mode === 'extract') && selectedIds.length === 0)}
                      className={cn(
                        "w-full py-3 px-4 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm",
                        mode === 'extract' ? "bg-green-600 hover:bg-green-700" : "bg-indigo-600 hover:bg-indigo-700"
                      )}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>处理中...</span>
                        </>
                      ) : (
                        <>
                          <Scissors className="w-5 h-5" />
                          <span>
                            {mode === 'extract' ? '提取选中' : '拆分 PDF'}
                          </span>
                        </>
                      )}
                    </button>
                  )}
                  
                  {message && (
                    <p className={`text-center text-xs mt-2 ${message.includes('出错') || message.includes('Error') || message.includes('无效') ? 'text-red-500' : 'text-green-600'}`}>
                      {message}
                    </p>
                  )}
              </div>
            </div>
          </div>

          {/* Right Content - Preview Grid */}
          <div className="flex-1 bg-gray-100 rounded-xl p-4 flex flex-col h-[calc(100vh-140px)] overflow-hidden">
            <div className="flex items-center justify-between mb-4 bg-white p-2 rounded-lg shadow-sm">
               <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold ml-2">
                 {mode === 'delete' ? '选择要移除的页面' : mode === 'extract' ? '选择要提取的页面' : mode === 'selected' ? '选择要拆分的页面' : '页面预览'}
               </p>
               <p className="text-xs text-gray-500 mr-2">
                 已选: {selectedIds.length}
               </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                {isLoadingThumbnails ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mr-2" />
                    加载预览中...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {pages.map((page, idx) => (
                      <div 
                        key={page.id}
                        onClick={() => togglePageSelection(page.id)}
                        className={cn(
                          "relative aspect-[3/4] cursor-pointer rounded-lg border-2 overflow-hidden transition-all shadow-sm hover:shadow-md group",
                          selectedIds.includes(page.id) 
                            ? (mode === 'delete' ? "border-red-600 ring-2 ring-red-100" : mode === 'extract' ? "border-green-600 ring-2 ring-green-100" : "border-indigo-600 ring-2 ring-indigo-100")
                            : "border-gray-200 hover:border-indigo-300"
                        )}
                      >
                        {page.image ? (
                          <img src={page.image} alt={`Page ${idx + 1}`} className="w-full h-full object-contain bg-gray-50" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-xs text-gray-400">
                            第 {idx + 1} 页
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 text-center group-hover:bg-black/70 transition-colors">
                          {idx + 1}
                        </div>
                        {selectedIds.includes(page.id) && (
                          <div className={cn(
                            "absolute top-2 right-2 text-white rounded-full p-0.5 shadow-sm",
                            mode === 'delete' ? "bg-red-600" : mode === 'extract' ? "bg-green-600" : "bg-indigo-600"
                          )}>
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
