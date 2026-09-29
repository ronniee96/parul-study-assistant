// Client-side in-browser Document & PDF Extractor
// Extracts genuine human-readable text from user-uploaded PDFs, Word docs, PPTs, and text files

// Helper to ensure PDF.js is loaded
async function ensurePdfJsLoaded() {
  if (typeof window !== 'undefined' && window.pdfjsLib) {
    return window.pdfjsLib;
  }
  
  // Try loading PDF.js dynamically if not already present
  if (typeof document !== 'undefined') {
    await new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        resolve();
      };
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }
  
  return typeof window !== 'undefined' ? window.pdfjsLib : null;
}

// Strictly check if a piece of text is PDF binary/dictionary code rather than human content
export function isPdfCodeToken(str) {
  if (!str || typeof str !== 'string') return true;
  const s = str.trim();
  if (s.length < 3) return true;
  
  // PDF Dictionary and Stream keywords
  const codePatterns = [
    /\/Length\b/i,
    /\/Filter\b/i,
    /\/FlateDecode\b/i,
    /\/Type\s*\/(Page|Catalog|Pages|Font|XObject|Group|Annot|Action|ObjStm|Metadata)/i,
    /\/MediaBox\b/i,
    /\/Resources\b/i,
    /\/Parent\s+\d+\s+\d+\s+R/i,
    /\/Contents\s+\d+\s+\d+\s+R/i,
    /\/XObject\b/i,
    /\/Subtype\b/i,
    /\/ColorSpace\b/i,
    /\/BitsPerComponent\b/i,
    /\/CreationDate\b/i,
    /\/ModDate\b/i,
    /\/Producer\b/i,
    /Quartz PDFContext/i,
    /\/Root\s+\d+\s+\d+\s+R/i,
    /\/Info\s+\d+\s+\d+\s+R/i,
    /\/ID\s*\[/i,
    /endobj\b/i,
    /endstream\b/i,
    /startxref\b/i,
    /xref\b/i,
    /<<[\s\S]*?>>/,
    /^\s*\/\w+\s+\d+\s+\d+\s+R\b/
  ];
  
  for (const pattern of codePatterns) {
    if (pattern.test(s)) return true;
  }
  
  // If the string contains multiple PDF slash tokens like /Type /Page /Parent
  const slashTokens = (s.match(/\/\w{2,}/g) || []).length;
  if (slashTokens >= 2) return true;
  
  // Check if string is predominantly non-human symbols
  const letterCount = (s.match(/[a-zA-Z]/g) || []).length;
  if (s.length > 10 && letterCount / s.length < 0.45) return true;
  
  return false;
}

export async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // 1. Primary: Use PDF.js engine
    const pdfjs = await ensurePdfJsLoaded();
    if (pdfjs) {
      try {
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        let pageTexts = [];
        const maxPages = Math.min(pdf.numPages, 25);
        
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
          try {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageStr = textContent.items
              .map(item => item.str)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            // Verify page text is clean human language, not PDF dictionary tokens
            if (pageStr && pageStr.length > 15 && !isPdfCodeToken(pageStr)) {
              pageTexts.push(`--- Page ${pageNum} ---\n${pageStr}`);
            }
          } catch (pageErr) {
            console.warn(`Skipping unreadable page ${pageNum}:`, pageErr);
          }
        }
        
        if (pageTexts.length > 0) {
          const fullExtracted = pageTexts.join('\n\n');
          const cleaned = cleanExtractedText(fullExtracted);
          if (cleaned.length > 50) {
            return cleaned;
          }
        }
      } catch (err) {
        console.warn("PDF.js text parsing error, falling back to clean text extraction:", err);
      }
    }

    // 2. Secondary: Clean text chunk extraction with strict code filtering
    const uint8 = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawBinary = decoder.decode(uint8);
    
    let extractedChunks = [];
    
    // Extract (Text) Tj blocks
    const tjMatches = rawBinary.match(/\(([^()]{3,500})\)\s*Tj/g) || [];
    for (const m of tjMatches) {
      const cleaned = m.replace(/^\(/, '').replace(/\)\s*Tj$/, '').trim();
      if (cleaned.length > 3 && !isPdfCodeToken(cleaned) && !/^\\[0-9]/.test(cleaned)) {
        extractedChunks.push(cleaned);
      }
    }
    
    // Extract [(T)(e)(x)(t)] TJ blocks
    const tjArrayMatches = rawBinary.match(/\[([^\]]{5,1000})\]\s*TJ/g) || [];
    for (const m of tjArrayMatches) {
      const inner = m.match(/\(([^()]+)\)/g) || [];
      const combined = inner.map(s => s.slice(1, -1)).join('');
      const trimmed = combined.trim();
      if (trimmed.length > 3 && !isPdfCodeToken(trimmed)) {
        extractedChunks.push(trimmed);
      }
    }
    
    if (extractedChunks.length > 3) {
      const joined = extractedChunks.join(' ');
      if (!isPdfCodeToken(joined) && joined.length > 50) {
        return cleanExtractedText(joined);
      }
    }

    throw new Error('No readable text was extracted from this PDF. It may be scanned; use the server OCR extractor or upload a text-based copy.');

  } catch (err) {
    console.error("Failed to extract PDF in browser:", err);
    throw err;
  }
}

export async function extractTextFromSingleDocument(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  
  if (ext === 'pdf') {
    return await extractTextFromPDF(file);
  }
  
  if (['txt', 'text', 'csv', 'json', 'md'].includes(ext)) {
    const text = cleanExtractedText(await file.text());
    if (!text) throw new Error(`No readable text found in ${file.name}.`);
    return text;
  }

  throw new Error(`Unsupported browser extraction type: .${ext}. Server extraction is required for this file.`);
}

export async function extractMultipleDocuments(files) {
  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const text = await extractTextFromSingleDocument(file);
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        return {
          filename: file.name,
          text: text,
          wordCount: wordCount,
          charCount: text.length
        };
      } catch (e) {
        return { filename: file.name, text: '', wordCount: 0, charCount: 0, error: e.message || 'Text extraction failed.' };
      }
    })
  );

  const combinedText = results.map((r, idx) =>
    r.text ? `=== [DOCUMENT ${idx + 1}: ${r.filename}] ===\n${r.text}` : ''
  ).filter(Boolean).join('\n\n');

  const totalWords = results.reduce((sum, r) => sum + r.wordCount, 0);
  const totalChars = results.reduce((sum, r) => sum + r.charCount, 0);

  return {
    files: results,
    combinedText: combinedText,
    totalWords: totalWords,
    totalChars: totalChars
  };
}

export function cleanExtractedText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    // Remove PDF object code patterns
    .replace(/\/Length\s+\d+[\s\S]*?\/Filter\s+\/\w+/gi, '')
    .replace(/\/Type\s*\/\w+/gi, '')
    .replace(/\/MediaBox\s*\[[^\]]*\]/gi, '')
    .replace(/\/Parent\s+\d+\s+\d+\s+R/gi, '')
    .replace(/\/Resources\s+\d+\s+\d+\s+R/gi, '')
    .replace(/\/Contents\s+\d+\s+\d+\s+R/gi, '')
    .replace(/Quartz PDFContext/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
