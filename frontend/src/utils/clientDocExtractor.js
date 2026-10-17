// Client-side in-browser Document & PDF Extractor
// Extracts genuine human-readable text from user-uploaded PDFs, Word docs, PPTs, and text files

// Helper to ensure PDF.js is loaded with same-origin worker
export async function ensurePdfJsLoaded() {
  if (typeof window !== 'undefined' && window.pdfjsLib) {
    if (window.pdfjsLib.GlobalWorkerOptions && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    }
    return window.pdfjsLib;
  }
  
  // Try loading PDF.js dynamically from same-origin bundle first, then CDN fallback
  if (typeof document !== 'undefined') {
    await new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = '/pdf.min.js';
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        }
        resolve();
      };
      script.onerror = () => {
        // Fallback to CDN if local bundle is not reachable
        const cdnScript = document.createElement('script');
        cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        cdnScript.onload = () => {
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
          }
          resolve();
        };
        cdnScript.onerror = () => resolve();
        document.head.appendChild(cdnScript);
      };
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
        if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        }
        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(arrayBuffer),
          stopAtErrors: false
        });
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

    throw new Error(`No readable text could be extracted from "${file.name}". The document may be empty, image-only/scanned without OCR, or protected. Please ensure your PDF contains selectable digital text.`);

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
    try {
      const text = await file.text();
      const cleaned = cleanExtractedText(text);
      if (cleaned.length < 20) {
        throw new Error(`Insufficient text extracted from "${file.name}".`);
      }
      return cleaned;
    } catch (err) {
      throw new Error(`Failed to read "${file.name}": ${err.message}`);
    }
  }

  return await extractTextFromPDF(file);
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
          charCount: text.length,
          success: true
        };
      } catch (e) {
        console.warn(`Extraction failed for ${file.name}:`, e.message);
        return {
          filename: file.name,
          text: '',
          wordCount: 0,
          charCount: 0,
          success: false,
          error: e.message
        };
      }
    })
  );

  const successfulFiles = results.filter(r => r.success && r.text.length > 0);
  const combinedText = successfulFiles.map((r, idx) => 
    `=== [DOCUMENT ${idx + 1}: ${r.filename}] ===\n${r.text}`
  ).join('\n\n');

  const totalWords = successfulFiles.reduce((sum, r) => sum + r.wordCount, 0);
  const totalChars = successfulFiles.reduce((sum, r) => sum + r.charCount, 0);

  return {
    files: results,
    successfulFiles: successfulFiles,
    combinedText: combinedText,
    totalWords: totalWords,
    totalChars: totalChars,
    hasFailures: results.some(r => !r.success)
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
    .replace(/[^\x20-\x7E\n\t]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
