import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import fontkit from '@pdf-lib/fontkit';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Initialize PDF.js worker
// Use a fixed version if the dynamic one fails, or ensure the version matches.
// We'll use the version from the library, but fallback to a known stable CDN if needed.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export type PdfFile = {
  file: File;
  id: string;
  name: string;
  size: number;
  pageCount?: number;
  width?: number;
  height?: number;
};

export async function getPdfInfo(file: File): Promise<PdfFile> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pageCount = pdfDoc.getPageCount();
  const firstPage = pdfDoc.getPages()[0];
  const { width, height } = firstPage.getSize();

  return {
    file,
    id: Math.random().toString(36).substring(7),
    name: file.name,
    size: file.size,
    pageCount,
    width,
    height,
  };
}

export async function renderPageAsImage(file: File, pageIndex: number, scale: number = 1): Promise<{ image: string; width: number; height: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  const page = await pdf.getPage(pageIndex + 1); // PDF.js is 1-based
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  if (!context) throw new Error('无法获取 canvas 上下文');

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };
  
  await page.render(renderContext as any).promise;
  return {
    image: canvas.toDataURL('image/png'),
    width: viewport.width,
    height: viewport.height
  };
}

export async function splitPdf(
  file: File, 
  mode: 'each' | 'ranges' | 'selected' | 'delete' | 'extract', 
  ranges?: string, 
  selectedPages?: number[],
  sourceIndices?: number[]
): Promise<Blob | Blob[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pageCount = pdfDoc.getPageCount();

  // Default source indices to all pages if not provided
  const availableIndices = sourceIndices || Array.from({ length: pageCount }, (_, i) => i);

  const zip = new JSZip();

  if (mode === 'each') {
    const folder = zip.folder(file.name.replace('.pdf', '') + '-split');
    for (let i = 0; i < availableIndices.length; i++) {
      const originalIndex = availableIndices[i];
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [originalIndex]);
      newPdf.addPage(copiedPage);
      const pdfBytes = await newPdf.save();
      folder?.file(`${file.name.replace('.pdf', '')}-${i + 1}.pdf`, pdfBytes);
    }
    return await zip.generateAsync({ type: 'blob' });
  } else if (mode === 'ranges' && ranges) {
    const parts = ranges.split(',').map(p => p.trim());
    const folder = zip.folder(file.name.replace('.pdf', '') + '-parts');

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const newPdf = await PDFDocument.create();
      
      let pageIndices: number[] = [];
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n));
        for (let j = start; j <= end; j++) {
          if (j > 0 && j <= availableIndices.length) {
            pageIndices.push(availableIndices[j - 1]);
          }
        }
      } else {
        const pageNum = parseInt(part);
        if (pageNum > 0 && pageNum <= availableIndices.length) {
          pageIndices.push(availableIndices[pageNum - 1]);
        }
      }

      if (pageIndices.length > 0) {
        const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
        copiedPages.forEach(page => newPdf.addPage(page));
        const pdfBytes = await newPdf.save();
        folder?.file(`${file.name.replace('.pdf', '')}-part-${i + 1}.pdf`, pdfBytes);
      }
    }
    return await zip.generateAsync({ type: 'blob' });
  } else if (mode === 'selected' && selectedPages && selectedPages.length > 0) {
    const folder = zip.folder(file.name.replace('.pdf', '') + '-selected');
    for (const idx of selectedPages) {
       if (idx >= 0 && idx < availableIndices.length) {
         const originalIndex = availableIndices[idx];
         const newPdf = await PDFDocument.create();
         const [copiedPage] = await newPdf.copyPages(pdfDoc, [originalIndex]);
         newPdf.addPage(copiedPage);
         const pdfBytes = await newPdf.save();
         folder?.file(`${file.name.replace('.pdf', '')}-page-${idx + 1}.pdf`, pdfBytes);
       }
    }
    return await zip.generateAsync({ type: 'blob' });
  } else if (mode === 'delete' && selectedPages) {
    const newPdf = await PDFDocument.create();
    const pageIndicesToKeep = [];
    for (let i = 0; i < availableIndices.length; i++) {
      if (!selectedPages.includes(i)) {
        pageIndicesToKeep.push(availableIndices[i]);
      }
    }

    if (pageIndicesToKeep.length > 0) {
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndicesToKeep);
      copiedPages.forEach(page => newPdf.addPage(page));
    }
    
    const pdfBytes = await newPdf.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  } else if (mode === 'extract' && selectedPages && selectedPages.length > 0) {
    const newPdf = await PDFDocument.create();
    
    const indicesToExtract = selectedPages
      .filter(idx => idx >= 0 && idx < availableIndices.length)
      .map(idx => availableIndices[idx]);

    if (indicesToExtract.length > 0) {
      const copiedPages = await newPdf.copyPages(pdfDoc, indicesToExtract);
      copiedPages.forEach(page => newPdf.addPage(page));
    }
    
    const pdfBytes = await newPdf.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }
  
  throw new Error('无效的拆分模式');
}

export async function mergePdfs(files: File[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach(page => mergedPdf.addPage(page));
  }

  const pdfBytes = await mergedPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export async function rotatePdf(file: File, angle: number): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  pages.forEach(page => {
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees(currentRotation + angle));
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export async function cropPdf(file: File, margins: { left: number; right: number; top: number; bottom: number }): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  pages.forEach(page => {
    const { width, height } = page.getSize();
    page.setCropBox(
      margins.left,
      margins.bottom,
      width - margins.left - margins.right,
      height - margins.top - margins.bottom
    );
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export type WatermarkOptions = {
  text?: string;
  size?: number;
  opacity?: number;
  color?: string; // hex
  file?: File;
  x?: number; // 0-1 ratio of page width (center)
  y?: number; // 0-1 ratio of page height (center, from top)
  rotation?: number; // degrees
};

export async function addWatermark(file: File, options: WatermarkOptions): Promise<Blob> {
  const pdfBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  pdfDoc.registerFontkit(fontkit);
  const pages = pdfDoc.getPages();

  const xRatio = options.x ?? 0.5;
  const yRatio = options.y ?? 0.5;
  const rotationAngle = options.rotation ?? (options.text ? 45 : 0);

  if (options.file) {
    const watermarkBuffer = await options.file.arrayBuffer();
    const watermarkDoc = await PDFDocument.load(watermarkBuffer);
    const [watermarkPage] = await pdfDoc.embedPdf(watermarkDoc, [0]);

    pages.forEach(page => {
      const { width, height } = page.getSize();
      page.drawPage(watermarkPage, {
        x: width * xRatio - width / 2,
        y: height * (1 - yRatio) - height / 2,
        width,
        height,
        opacity: options.opacity || 0.5,
        rotate: degrees(rotationAngle),
      });
    });
  } else if (options.text) {
    let font;
    const hasNonLatin = /[^\u0000-\u007F]/.test(options.text);

    if (hasNonLatin) {
      try {
        // Try loading Noto Serif SC (Songti style) from multiple CDNs
        const fontUrls = [
          'https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-sc@4.5.12/files/noto-serif-sc-chinese-simplified-400-normal.woff',
          'https://unpkg.com/@fontsource/noto-serif-sc@4.5.12/files/noto-serif-sc-chinese-simplified-400-normal.woff',
        ];

        let fontBytes: ArrayBuffer | null = null;
        for (const url of fontUrls) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              fontBytes = await res.arrayBuffer();
              break;
            }
          } catch (e) {
            console.warn(`Failed to load font from ${url}`, e);
          }
        }

        if (!fontBytes) {
          throw new Error("无法从所有源加载中文字体。");
        }

        font = await pdfDoc.embedFont(fontBytes);
      } catch (e) {
        console.error("Failed to load Chinese font", e);
        throw new Error("无法加载中文字体 (Noto Serif SC)。请检查您的网络连接。");
      }
    } else {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    const textSize = options.size || 50;
    const text = options.text;
    const opacity = options.opacity || 0.5;
    
    // Parse hex color
    let color = rgb(0, 0, 0);
    if (options.color) {
      const r = parseInt(options.color.slice(1, 3), 16) / 255;
      const g = parseInt(options.color.slice(3, 5), 16) / 255;
      const b = parseInt(options.color.slice(5, 7), 16) / 255;
      color = rgb(r, g, b);
    }

    pages.forEach((page, idx) => {
      const { width, height } = page.getSize();
      
      let currentText = text;
      // Replace placeholders
      // Support basic padding like {page:02} manually if needed, or just simple replacement
      // Simple replacement:
      currentText = currentText.replace(/{page}/g, (idx + 1).toString());
      currentText = currentText.replace(/{total}/g, pages.length.toString());
      
      // Support {page:02} style padding
      currentText = currentText.replace(/{page:(\d+)}/g, (_, width) => (idx + 1).toString().padStart(parseInt(width), '0'));


      const textWidth = font.widthOfTextAtSize(currentText, textSize);
      const textHeight = font.heightAtSize(textSize);

      // Calculate center position
      const centerX = width * xRatio;
      const centerY = height * (1 - yRatio);

      const rad = (rotationAngle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      
      const vX = textWidth / 2;
      const vY = textHeight / 2;
      
      // Rotated vector from origin to center
      const rotatedVX = vX * cos - vY * sin;
      const rotatedVY = vX * sin + vY * cos;
      
      // Calculate origin (x,y) such that origin + rotatedV = center
      const drawX = centerX - rotatedVX;
      const drawY = centerY - rotatedVY;

      try {
        page.drawText(currentText, {
          x: drawX,
          y: drawY,
          size: textSize,
          font: font,
          color: color,
          opacity: opacity,
          rotate: degrees(rotationAngle),
        });
      } catch (e) {
        console.error("Error drawing text", e);
      }
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export async function convertPdfToImages(file: File, dpi: number = 200): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  const pageCount = pdf.numPages;
  const zip = new JSZip();
  const folder = zip.folder(file.name.replace('.pdf', '') + '-images');

  // Scale factor based on DPI (72 is standard PDF DPI)
  const scale = dpi / 72;

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      await page.render(renderContext as any).promise;
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        folder?.file(`${file.name.replace('.pdf', '')}-${i}.png`, blob);
      }
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}
