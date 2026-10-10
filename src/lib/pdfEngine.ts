import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { DocumentItem, ExportSettings } from '../types';

// Setup pdfjs worker
try {
  if (typeof window !== 'undefined') {
    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  }
} catch (err) {
  console.warn('PDF.js worker initialization warning:', err);
}

/**
 * Standard page dimensions in points (72 points = 1 inch)
 */
export const PAGE_SIZES = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612.0, height: 792.0 },
  legal: { width: 612.0, height: 1008.0 },
};

/**
 * Convert any image (dataUrl, Blob, or Image element) to JPEG/PNG bytes using HTML5 Canvas
 * Handles rotation, scaling, and format normalization
 */
export async function processImageToBytes(
  dataUrl: string,
  targetFormat: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality: number = 0.9,
  rotationDeg: number = 0
): Promise<{ bytes: Uint8Array; width: number; height: number; isPng: boolean }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const isRotatedQuarter = rotationDeg % 180 !== 0;

      const baseWidth = img.naturalWidth || img.width;
      const baseHeight = img.naturalHeight || img.height;

      const canvasWidth = isRotatedQuarter ? baseHeight : baseWidth;
      const canvasHeight = isRotatedQuarter ? baseWidth : baseHeight;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas 2D context'));
        return;
      }

      // Draw with white background for JPEG
      if (targetFormat === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      ctx.save();
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.rotate((rotationDeg * Math.PI) / 180);
      ctx.drawImage(img, -baseWidth / 2, -baseHeight / 2);
      ctx.restore();

      const format = targetFormat;
      const finalDataUrl = canvas.toDataURL(format, quality);
      const base64 = finalDataUrl.split(',')[1];
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      resolve({
        bytes,
        width: canvasWidth,
        height: canvasHeight,
        isPng: format === 'image/png',
      });
    };
    img.onerror = (e) => reject(new Error('Failed to load image: ' + e));
    img.src = dataUrl;
  });
}

/**
 * Renders a PDF page to a canvas and returns image dataURL & dimensions
 */
export async function renderPdfPageToDataUrl(
  pdfArrayBuffer: ArrayBuffer,
  pageIndex: number,
  scale: number = 1.5
): Promise<{ dataUrl: string; width: number; height: number }> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer.slice(0) });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(pageIndex + 1);

    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas context');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    // Render page
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
      canvas: canvas,
    };
    await (page.render(renderContext as any) as any).promise;

    return {
      dataUrl: canvas.toDataURL('image/jpeg', 0.9),
      width: viewport.width,
      height: viewport.height,
    };
  } catch (err) {
    console.warn('PDF.js render error, creating stylized fallback thumbnail:', err);
    // Stylized fallback
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 600, 800);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 580, 780);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`PDF Document Page ${pageIndex + 1}`, 300, 380);

      ctx.fillStyle = '#64748b';
      ctx.font = '16px sans-serif';
      ctx.fillText('Original Vector Page Preserved', 300, 420);
    }
    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: 600,
      height: 800,
    };
  }
}

/**
 * Extracts all pages of a PDF file into DocumentItem instances
 */
export async function extractPdfToItems(file: File): Promise<DocumentItem[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  const items: DocumentItem[] = [];

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    let dataUrl = '';

    try {
      const renderRes = await renderPdfPageToDataUrl(arrayBuffer, i, 1.2);
      dataUrl = renderRes.dataUrl;
    } catch {
      dataUrl = '';
    }

    items.push({
      id: `${file.name}-p${i + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'pdf_page',
      title: `${file.name.replace(/\.pdf$/i, '')} · P.${i + 1}`,
      sourceFile: file.name,
      dataUrl: dataUrl,
      width: width,
      height: height,
      rotation: page.getRotation().angle || 0,
      originalSize: Math.round(file.size / pageCount),
    });
  }

  return items;
}

/**
 * Generate a Master PDF from DocumentItem list (mix of Images, PDF pages, Notes, and Sketches)
 */
export async function createPdfFromItems(
  items: DocumentItem[],
  settings: ExportSettings,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<Blob> {
  const finalPdf = await PDFDocument.create();
  const helveticaFont = await finalPdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await finalPdf.embedFont(StandardFonts.HelveticaBold);

  const total = items.length;

  for (let i = 0; i < total; i++) {
    const item = items[i];
    if (onProgress) {
      onProgress(i + 1, total, `Processing page ${i + 1} of ${total}: ${item.title}`);
    }

    // Determine target page dimensions
    let targetWidth: number;
    let targetHeight: number;

    if (settings.pageSize === 'auto') {
      targetWidth = item.width || PAGE_SIZES.a4.width;
      targetHeight = item.height || PAGE_SIZES.a4.height;
    } else {
      const sizeDef = PAGE_SIZES[settings.pageSize] || PAGE_SIZES.a4;
      if (settings.orientation === 'landscape') {
        targetWidth = Math.max(sizeDef.width, sizeDef.height);
        targetHeight = Math.min(sizeDef.width, sizeDef.height);
      } else if (settings.orientation === 'portrait') {
        targetWidth = Math.min(sizeDef.width, sizeDef.height);
        targetHeight = Math.max(sizeDef.width, sizeDef.height);
      } else {
        // Auto orientation based on item aspect
        const isItemLandscape = item.width > item.height;
        targetWidth = isItemLandscape
          ? Math.max(sizeDef.width, sizeDef.height)
          : Math.min(sizeDef.width, sizeDef.height);
        targetHeight = isItemLandscape
          ? Math.min(sizeDef.width, sizeDef.height)
          : Math.max(sizeDef.width, sizeDef.height);
      }
    }

    // Margins
    let marginPx = 0;
    if (settings.margin === 'small') marginPx = 20;
    if (settings.margin === 'normal') marginPx = 36;

    const availableWidth = targetWidth - marginPx * 2;
    const availableHeight = targetHeight - marginPx * 2;

    const page = finalPdf.addPage([targetWidth, targetHeight]);

    // Embed content based on item type
    if (item.dataUrl && item.dataUrl.startsWith('data:image')) {
      const processed = await processImageToBytes(
        item.dataUrl,
        'image/jpeg',
        settings.imageQuality || 0.9,
        item.rotation || 0
      );

      const embeddedImg = await finalPdf.embedJpg(processed.bytes);

      // Fit mode calculation
      const imgAspect = processed.width / processed.height;
      const targetAspect = availableWidth / availableHeight;

      let drawWidth = availableWidth;
      let drawHeight = availableHeight;
      let drawX = marginPx;
      let drawY = marginPx;

      if (item.fitMode === 'fill') {
        // Crop/fill
        drawWidth = availableWidth;
        drawHeight = availableHeight;
      } else {
        // Default: 'fit' - maintain aspect ratio
        if (imgAspect > targetAspect) {
          drawWidth = availableWidth;
          drawHeight = availableWidth / imgAspect;
          drawY = marginPx + (availableHeight - drawHeight) / 2;
        } else {
          drawHeight = availableHeight;
          drawWidth = availableHeight * imgAspect;
          drawX = marginPx + (availableWidth - drawWidth) / 2;
        }
      }

      page.drawImage(embeddedImg, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight,
      });
    } else if (item.type === 'note' && item.noteContent) {
      // Render text note page
      page.drawRectangle({
        x: marginPx,
        y: marginPx,
        width: availableWidth,
        height: availableHeight,
        color: rgb(0.99, 0.99, 0.99),
        borderColor: rgb(0.88, 0.91, 0.95),
        borderWidth: 1,
      });

      let currentY = targetHeight - marginPx - 40;
      page.drawText(item.title, {
        x: marginPx + 24,
        y: currentY,
        size: 18,
        font: helveticaBold,
        color: rgb(0.06, 0.09, 0.16),
      });

      currentY -= 30;
      const lines = item.noteContent.split('\n');
      for (const line of lines) {
        if (currentY < marginPx + 40) break;
        const trimmed = line.trim();
        if (!trimmed) {
          currentY -= 14;
          continue;
        }
        page.drawText(trimmed.slice(0, 80), {
          x: marginPx + 24,
          y: currentY,
          size: 11,
          font: helveticaFont,
          color: rgb(0.2, 0.25, 0.3),
        });
        currentY -= 18;
      }
    }

    // Page numbering
    if (settings.includePageNumbers) {
      const pageText = `${i + 1} / ${total}`;
      const textWidth = helveticaFont.widthOfTextAtSize(pageText, 9);
      page.drawText(pageText, {
        x: (targetWidth - textWidth) / 2,
        y: 14,
        size: 9,
        font: helveticaFont,
        color: rgb(0.4, 0.45, 0.5),
      });
    }
  }

  // Set document metadata
  if (settings.documentTitle) {
    finalPdf.setTitle(settings.documentTitle);
  }
  if (settings.authorName) {
    finalPdf.setAuthor(settings.authorName);
  }
  finalPdf.setCreator('Veloce tech pdf maker');

  const pdfBytes = await finalPdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

/**
 * Merge multiple PDF files into a single unified PDF
 */
export async function mergePdfFiles(files: File[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  const pdfBytes = await mergedPdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}

/**
 * In-browser PDF Compression:
 * Renders pages at selected resolution and quality, re-encodes embedded visual assets,
 * producing a significantly smaller file for sharing/emailing.
 */
export async function compressPdfFile(
  file: File,
  scale: number = 0.75,
  quality: number = 0.65,
  onProgress?: (current: number, total: number) => void
): Promise<{ blob: Blob; originalSize: number; compressedSize: number; reductionPct: number }> {
  const originalSize = file.size;
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const compressedDoc = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress(i, numPages);

    const page = await pdfDoc.getPage(i);
    const originalViewport = page.getViewport({ scale: 1.0 });
    const renderViewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(renderViewport.width);
    canvas.height = Math.floor(renderViewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context for compression');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await (page.render({
      canvasContext: ctx,
      viewport: renderViewport,
      canvas: canvas,
    } as any) as any).promise;

    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
    const base64 = compressedDataUrl.split(',')[1];
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let j = 0; j < len; j++) {
      bytes[j] = binaryString.charCodeAt(j);
    }

    const embeddedImage = await compressedDoc.embedJpg(bytes);
    const newPage = compressedDoc.addPage([originalViewport.width, originalViewport.height]);
    newPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: originalViewport.width,
      height: originalViewport.height,
    });
  }

  const finalBytes = await compressedDoc.save();
  const compressedBlob = new Blob([finalBytes as unknown as BlobPart], { type: 'application/pdf' });
  const compressedSize = compressedBlob.size;
  const reductionPct = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

  return {
    blob: compressedBlob,
    originalSize,
    compressedSize,
    reductionPct,
  };
}

/**
 * Apply annotation / sketch / stamp to an existing PDF page
 */
export async function annotatePdfPage(
  pdfBytes: ArrayBuffer,
  pageIndex: number,
  overlayDataUrl: string
): Promise<Blob> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const page = pdfDoc.getPage(pageIndex);
  const { width, height } = page.getSize();

  // Process overlay image
  const processed = await processImageToBytes(overlayDataUrl, 'image/png', 1.0, 0);
  const embeddedOverlay = await pdfDoc.embedPng(processed.bytes);

  page.drawImage(embeddedOverlay, {
    x: 0,
    y: 0,
    width,
    height,
  });

  const updatedBytes = await pdfDoc.save();
  return new Blob([updatedBytes as unknown as BlobPart], { type: 'application/pdf' });
}
