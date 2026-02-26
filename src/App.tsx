import React, { useState } from 'react';
import { Scissors, Layers, RotateCw, Crop, Stamp, Image as ImageIcon } from 'lucide-react';
import { SplitTool } from '@/components/tools/SplitTool';
import { MergeTool } from '@/components/tools/MergeTool';
import { RotateTool } from '@/components/tools/RotateTool';
import { CropTool } from '@/components/tools/CropTool';
import { WatermarkTool } from '@/components/tools/WatermarkTool';
import { PdfToImageTool } from '@/components/tools/PdfToImageTool';
import { cn } from '@/lib/utils';

const TOOLS = [
  { id: 'split', name: '拆分 PDF', icon: Scissors, component: SplitTool },
  { id: 'merge', name: '合并 PDF', icon: Layers, component: MergeTool },
  { id: 'rotate', name: '旋转 PDF', icon: RotateCw, component: RotateTool },
  { id: 'crop', name: '裁剪 PDF', icon: Crop, component: CropTool },
  { id: 'watermark', name: '水印', icon: Stamp, component: WatermarkTool },
  { id: 'image', name: 'PDF 转图片', icon: ImageIcon, component: PdfToImageTool },
];

export default function App() {
  const [activeToolId, setActiveToolId] = useState('split');
  const ActiveComponent = TOOLS.find(t => t.id === activeToolId)?.component || SplitTool;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 mr-8">
                PDFDo 在线工具
              </h1>
            </div>
            <nav className="flex space-x-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveToolId(tool.id)}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                    activeToolId === tool.id
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <tool.icon className={cn("w-4 h-4", activeToolId === tool.id ? "text-indigo-600" : "text-gray-400")} />
                  <span>{tool.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="w-full h-full">
          <ActiveComponent />
        </div>
      </main>
    </div>
  );
}
