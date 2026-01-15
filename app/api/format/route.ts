/**
 * Document Format API Route
 *
 * Converts documents to various formats (PDF, DOCX, HTML)
 * using Case.dev Format API with fallback generation.
 */

import { NextRequest, NextResponse } from 'next/server';

const CASE_API_BASE_URL = 'https://api.case.dev';

interface FormatRequestBody {
  content: string;
  format: 'pdf' | 'docx' | 'html';
  options?: {
    title?: string;
    author?: string;
    pageSize?: 'letter' | 'a4';
    margins?: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: FormatRequestBody = await request.json();

    // Validate required fields
    if (!body.content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!body.format || !['pdf', 'docx', 'html'].includes(body.format)) {
      return NextResponse.json(
        { error: 'Valid format (pdf, docx, html) is required' },
        { status: 400 }
      );
    }

    // Try Case.dev Format API first
    const apiKey = process.env.CASE_API_KEY;

    if (apiKey) {
      try {
        const response = await fetch(`${CASE_API_BASE_URL}/format/v1/document`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            content: body.content,
            input_format: 'md',
            output_format: body.format === 'html' ? 'html_preview' : body.format,
            options: {
              template: 'standard',
              ...body.options,
            },
          }),
        });

        if (response.ok) {
          // For binary formats (PDF, DOCX), return the file
          if (body.format === 'pdf' || body.format === 'docx') {
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();

            const contentType = body.format === 'pdf'
              ? 'application/pdf'
              : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

            return new NextResponse(arrayBuffer, {
              headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="document.${body.format}"`,
              },
            });
          }

          // For HTML, return the content
          const html = await response.text();
          return new NextResponse(html, {
            headers: {
              'Content-Type': 'text/html',
            },
          });
        }

        // API failed, fall through to fallback
        console.warn('Case.dev Format API failed, using fallback generation');
      } catch (apiError) {
        console.warn('Case.dev Format API error, using fallback:', apiError);
      }
    }

    // Fallback generation
    if (body.format === 'html') {
      const htmlContent = markdownToHtml(body.content);
      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }

    if (body.format === 'pdf') {
      const pdfBuffer = generateFallbackPdf(body.content);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="document.pdf"',
        },
      });
    }

    if (body.format === 'docx') {
      const docxBuffer = generateFallbackDocx(body.content);
      return new NextResponse(new Uint8Array(docxBuffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': 'attachment; filename="document.docx"',
        },
      });
    }

    return NextResponse.json(
      { error: 'Unsupported format' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Format API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Simple markdown to HTML converter for fallback preview
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Lists
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>');

  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr>');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraph tags with styling
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.6;
          max-width: 8.5in;
          margin: 0 auto;
          padding: 1in;
          background: white;
          color: black;
        }
        h1 { font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 24pt; }
        h2 { font-size: 14pt; font-weight: bold; margin-top: 18pt; margin-bottom: 12pt; }
        h3 { font-size: 12pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
        p { margin-bottom: 12pt; text-align: justify; }
        ul { margin-left: 24pt; margin-bottom: 12pt; }
        li { margin-bottom: 6pt; }
        hr { border: none; border-top: 1px solid #ccc; margin: 24pt 0; }
      </style>
    </head>
    <body>
      <p>${html}</p>
    </body>
    </html>
  `;
}

// Generate a simple PDF using a text-based approach
function generateFallbackPdf(markdownContent: string): Buffer {
  // Extract plain text from markdown for PDF
  const plainText = markdownContent
    .replace(/^#{1,6}\s+/gm, '') // Remove header markers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
    .replace(/\*(.*?)\*/g, '$1') // Remove italic markers
    .replace(/^\- /gm, '• ') // Convert list markers
    .replace(/^---$/gm, '────────────────────────────────────────') // Horizontal rules
    .trim();

  // Split into lines and wrap long lines
  const lines = plainText.split('\n');
  const wrappedLines: string[] = [];
  const maxLineLength = 80;

  for (const line of lines) {
    if (line.length <= maxLineLength) {
      wrappedLines.push(line);
    } else {
      const words = line.split(' ');
      let currentLine = '';
      for (const word of words) {
        if ((currentLine + ' ' + word).trim().length <= maxLineLength) {
          currentLine = (currentLine + ' ' + word).trim();
        } else {
          if (currentLine) wrappedLines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) wrappedLines.push(currentLine);
    }
  }

  // Create PDF content
  const pageHeight = 792; // Letter size height in points
  const pageWidth = 612; // Letter size width in points
  const margin = 72; // 1 inch margin
  const lineHeight = 14;
  const fontSize = 11;
  const linesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);

  // Split content into pages
  const pages: string[][] = [];
  for (let i = 0; i < wrappedLines.length; i += linesPerPage) {
    pages.push(wrappedLines.slice(i, i + linesPerPage));
  }

  if (pages.length === 0) {
    pages.push(['[Document content]']);
  }

  // Build PDF structure
  const objects: string[] = [];
  let objectCount = 0;

  // Object 1: Catalog
  objectCount++;
  objects.push(`${objectCount} 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);

  // Object 2: Pages
  objectCount++;
  const pageRefs = pages.map((_, i) => `${i + 4} 0 R`).join(' ');
  objects.push(`${objectCount} 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>\nendobj`);

  // Object 3: Font
  objectCount++;
  objects.push(`${objectCount} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>\nendobj`);

  // Create page objects and content streams
  const contentStartIndex = objectCount + pages.length + 1;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    objectCount++;
    const contentObjNum = contentStartIndex + pageIndex;
    objects.push(`${objectCount} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj`);
  }

  // Create content streams for each page
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    objectCount++;
    const pageLines = pages[pageIndex];

    let textContent = `BT\n/F1 ${fontSize} Tf\n`;
    let yPos = pageHeight - margin;

    for (const line of pageLines) {
      const escapedLine = line
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');

      textContent += `1 0 0 1 ${margin} ${yPos} Tm\n(${escapedLine}) Tj\n`;
      yPos -= lineHeight;
    }

    textContent += 'ET';

    const streamLength = textContent.length;
    objects.push(`${objectCount} 0 obj\n<< /Length ${streamLength} >>\nstream\n${textContent}\nendstream\nendobj`);
  }

  // Build the PDF file
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + '\n';
  }

  // Cross-reference table
  const xrefOffset = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objectCount + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (const offset of offsets) {
    pdf += offset.toString().padStart(10, '0') + ' 00000 n \n';
  }

  // Trailer
  pdf += 'trailer\n';
  pdf += `<< /Size ${objectCount + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += `${xrefOffset}\n`;
  pdf += '%%EOF';

  return Buffer.from(pdf, 'utf-8');
}

// Generate a simple DOCX file
function generateFallbackDocx(markdownContent: string): Buffer {
  // Convert markdown to simple XML paragraphs
  const lines = markdownContent.split('\n');
  let documentXml = '';

  for (const line of lines) {
    if (!line.trim()) {
      documentXml += '<w:p><w:r><w:t></w:t></w:r></w:p>';
      continue;
    }

    // Check for headers
    const h1Match = line.match(/^# (.+)$/);
    const h2Match = line.match(/^## (.+)$/);
    const h3Match = line.match(/^### (.+)$/);

    if (h1Match) {
      documentXml += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${escapeXml(h1Match[1])}</w:t></w:r></w:p>`;
    } else if (h2Match) {
      documentXml += `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>${escapeXml(h2Match[1])}</w:t></w:r></w:p>`;
    } else if (h3Match) {
      documentXml += `<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>${escapeXml(h3Match[1])}</w:t></w:r></w:p>`;
    } else {
      // Regular paragraph
      let text = line;

      // Handle list items
      if (line.startsWith('- ')) {
        text = '• ' + text.substring(2);
      }

      documentXml += `<w:p><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
    }
  }

  // Create the document.xml content
  const documentContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
${documentXml}
<w:sectPr>
<w:pgSz w:w="12240" w:h="15840"/>
<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
</w:sectPr>
</w:body>
</w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

  // Create ZIP structure
  return createMinimalDocxZip(contentTypes, rels, documentRels, documentContent);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Create a minimal ZIP file for DOCX
function createMinimalDocxZip(contentTypes: string, rels: string, documentRels: string, documentContent: string): Buffer {
  const files: { name: string; content: string }[] = [
    { name: '[Content_Types].xml', content: contentTypes },
    { name: '_rels/.rels', content: rels },
    { name: 'word/_rels/document.xml.rels', content: documentRels },
    { name: 'word/document.xml', content: documentContent }
  ];

  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const content = Buffer.from(file.content, 'utf-8');
    const nameBuffer = Buffer.from(file.name, 'utf-8');

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBuffer.length + content.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4); // Version needed
    localHeader.writeUInt16LE(0, 6); // General purpose bit flag
    localHeader.writeUInt16LE(0, 8); // Compression method (stored)
    localHeader.writeUInt16LE(0, 10); // Last mod time
    localHeader.writeUInt16LE(0, 12); // Last mod date
    localHeader.writeUInt32LE(crc32(content), 14); // CRC-32
    localHeader.writeUInt32LE(content.length, 18); // Compressed size
    localHeader.writeUInt32LE(content.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26); // File name length
    localHeader.writeUInt16LE(0, 28); // Extra field length
    nameBuffer.copy(localHeader, 30);
    content.copy(localHeader, 30 + nameBuffer.length);

    localHeaders.push(localHeader);

    // Central directory header
    const centralHeader = Buffer.alloc(46 + nameBuffer.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
    centralHeader.writeUInt16LE(20, 4); // Version made by
    centralHeader.writeUInt16LE(20, 6); // Version needed
    centralHeader.writeUInt16LE(0, 8); // General purpose bit flag
    centralHeader.writeUInt16LE(0, 10); // Compression method
    centralHeader.writeUInt16LE(0, 12); // Last mod time
    centralHeader.writeUInt16LE(0, 14); // Last mod date
    centralHeader.writeUInt32LE(crc32(content), 16); // CRC-32
    centralHeader.writeUInt32LE(content.length, 20); // Compressed size
    centralHeader.writeUInt32LE(content.length, 24); // Uncompressed size
    centralHeader.writeUInt16LE(nameBuffer.length, 28); // File name length
    centralHeader.writeUInt16LE(0, 30); // Extra field length
    centralHeader.writeUInt16LE(0, 32); // File comment length
    centralHeader.writeUInt16LE(0, 34); // Disk number start
    centralHeader.writeUInt16LE(0, 36); // Internal file attributes
    centralHeader.writeUInt32LE(0, 38); // External file attributes
    centralHeader.writeUInt32LE(offset, 42); // Relative offset of local header
    nameBuffer.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);
    offset += localHeader.length;
  }

  // End of central directory
  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);

  const endOfCentralDir = Buffer.alloc(22);
  endOfCentralDir.writeUInt32LE(0x06054b50, 0); // End of central directory signature
  endOfCentralDir.writeUInt16LE(0, 4); // Number of this disk
  endOfCentralDir.writeUInt16LE(0, 6); // Disk where central directory starts
  endOfCentralDir.writeUInt16LE(files.length, 8); // Number of central directory records on this disk
  endOfCentralDir.writeUInt16LE(files.length, 10); // Total number of central directory records
  endOfCentralDir.writeUInt32LE(centralDirSize, 12); // Size of central directory
  endOfCentralDir.writeUInt32LE(centralDirOffset, 16); // Offset of start of central directory
  endOfCentralDir.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, endOfCentralDir]);
}

// Simple CRC-32 implementation
function crc32(buffer: Buffer): number {
  let crc = 0xFFFFFFFF;
  const table = getCrc32Table();

  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xFF];
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

let crc32Table: number[] | null = null;

function getCrc32Table(): number[] {
  if (crc32Table) return crc32Table;

  crc32Table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crc32Table[i] = c;
  }

  return crc32Table;
}
