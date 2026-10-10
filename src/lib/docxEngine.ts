import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType } from 'docx';
import { DocumentItem, NoteDocument } from '../types';

/**
 * Converts a data URL (image/png, image/jpeg) to Uint8Array
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Exports a NoteDocument to a Microsoft Word (.docx) file
 */
export async function exportNoteToDocx(note: NoteDocument): Promise<Blob> {
  const paragraphs: Paragraph[] = [];

  // Title
  paragraphs.push(
    new Paragraph({
      text: note.title || 'Untitled Note',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  );

  // Metadata / Date
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Created: ${new Date(note.createdAt).toLocaleDateString()} · Veloce tech pdf maker`,
          italics: true,
          color: '666666',
          size: 20, // 10pt
        }),
      ],
      spacing: { after: 300 },
    })
  );

  // Content lines parsing
  const lines = (note.content || '').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      paragraphs.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      continue;
    }

    if (trimmed.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^#\s+/, ''),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (trimmed.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^##\s+/, ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (trimmed.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^###\s+/, ''),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        })
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^[-*]\s+/, ''),
          bullet: { level: 0 },
          spacing: { after: 80 },
        })
      );
    } else if (/^\d+\.\s+/.test(trimmed)) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^\d+\.\s+/, ''),
          spacing: { after: 80 },
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              size: 24, // 12pt
            }),
          ],
          spacing: { after: 120 },
        })
      );
    }
  }

  // Embedded images
  if (note.images && note.images.length > 0) {
    paragraphs.push(
      new Paragraph({
        text: 'Embedded Images & Visuals',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      })
    );

    for (const img of note.images) {
      try {
        const bytes = dataUrlToUint8Array(img.dataUrl);
        paragraphs.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: bytes,
                transformation: {
                  width: 520,
                  height: 340,
                },
                type: 'png',
              } as any),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          })
        );
        if (img.caption) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: img.caption,
                  italics: true,
                  size: 18,
                  color: '555555',
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            })
          );
        }
      } catch (e) {
        console.warn('Could not embed image in docx:', e);
      }
    }
  }

  // Embedded sketches
  if (note.sketches && note.sketches.length > 0) {
    paragraphs.push(
      new Paragraph({
        text: 'Hand-drawn Sketches & Diagrams',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      })
    );

    for (const sketch of note.sketches) {
      try {
        const bytes = dataUrlToUint8Array(sketch.dataUrl);
        paragraphs.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: bytes,
                transformation: {
                  width: 520,
                  height: 340,
                },
                type: 'png',
              } as any),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          })
        );
        if (sketch.title) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: sketch.title,
                  italics: true,
                  size: 18,
                  color: '555555',
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            })
          );
        }
      } catch (e) {
        console.warn('Could not embed sketch in docx:', e);
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Exports multiple document items (images, sketches, notes) to a Word document
 */
export async function exportDocumentItemsToDocx(
  items: DocumentItem[],
  documentTitle: string = 'PaperForge Export'
): Promise<Blob> {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      text: documentTitle,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
    }),
  ];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    paragraphs.push(
      new Paragraph({
        text: `Page ${i + 1}: ${item.title}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    if (item.type === 'note' && item.noteContent) {
      const lines = item.noteContent.split('\n');
      for (const line of lines) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: line, size: 24 })],
            spacing: { after: 100 },
          })
        );
      }
    }

    if (item.dataUrl && item.dataUrl.startsWith('data:image')) {
      try {
        const bytes = dataUrlToUint8Array(item.dataUrl);
        paragraphs.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: bytes,
                transformation: {
                  width: 520,
                  height: 360,
                },
                type: 'png',
              } as any),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          })
        );
      } catch (e) {
        console.warn('Could not embed item in docx:', e);
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
