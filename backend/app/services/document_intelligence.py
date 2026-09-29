"""
Document Intelligence Service
Deep extraction and normalization of academic documents (PDF, PPTX, DOCX, Images/OCR, TXT).
Extracts headings, modules, definitions, concepts, formulas, processes, tables, comparisons,
and maintains exact source provenance (document_id, page_number, section, element_type, snippet).
"""

import io
import os
import re
import uuid
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class DocumentIntelligence:
    """Extracts granular academic elements and provenance from course materials"""

    # Academic element regex patterns
    DEFINITION_PATTERNS = [
        re.compile(r'\b([A-Z][A-Za-z0-9\s\-]{2,50})\s+(?:is defined as|refers to|means|is described as|is the process of|is designated as)\s+([^.\n]{15,300}\.?)', re.IGNORECASE),
        re.compile(r'^\s*(?:Definition\s*[:\-]\s*)?([A-Z][A-Za-z0-9\s\-\(\)]{2,45})\s*:\s*([^.\n]{15,300}\.?)', re.MULTILINE),
        re.compile(r'\bDefinition\s*[:\-]\s*([^.\n]{15,300}\.?)', re.IGNORECASE),
    ]

    FORMULA_PATTERNS = [
        re.compile(r'([A-Za-z0-9\s\-_]{2,30})\s*=\s*([^;\n]{3,80})'),
        re.compile(r'\b(?:Formula|Equation)\s*[:\-]?\s*([^\n]{5,100})', re.IGNORECASE),
        re.compile(r'\b(?:BEP|P/V\s*Ratio|EOQ|Contribution|Margin of Safety|Variance|Standard Deviation|ROI|NPV|IRR)\b[^\n]*=[^\n]*', re.IGNORECASE),
    ]

    PROCESS_KEYWORDS = [
        'steps', 'process', 'stages', 'procedure', 'lifecycle', 'workflow',
        'phase 1', 'phase 2', 'step 1', 'step 2', 'algorithm', 'methodology'
    ]

    COMPARISON_KEYWORDS = [
        'difference between', 'distinguish between', 'differentiate', 'compare and contrast',
        'comparison between', 'versus', ' vs ', 'vs.'
    ]

    ADV_DISADV_KEYWORDS = [
        'advantage', 'disadvantage', 'merit', 'demerit', 'limitation', 'benefit', 'drawback'
    ]

    @classmethod
    def extract_rich_document(cls, file_content: bytes, filename: str, document_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Parses document into pages/slides, extracts structured elements,
        and constructs a NormalizedAcademicDocument dictionary with provenance.
        """
        doc_id = document_id or f"doc_{uuid.uuid4().hex[:8]}"
        ext = os.path.splitext(filename)[1].lower()
        pages_content = []

        if ext not in {'.pdf', '.ppt', '.pptx', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.txt'}:
            return {
                "success": False, "document_id": doc_id, "filename": filename,
                "file_type": ext, "total_pages": 0, "word_count": 0,
                "character_count": 0, "headings": [], "topics": [],
                "definitions": [], "formulas": [], "elements": [],
                "full_text": "", "pages": [],
                "error": f"Unsupported file type: {ext or '(no extension)'}"
            }

        try:
            if ext == '.pdf':
                pages_content = cls._extract_pages_pdf(file_content)
            elif ext in ['.ppt', '.pptx']:
                pages_content = cls._extract_pages_pptx(file_content)
            elif ext in ['.doc', '.docx']:
                pages_content = cls._extract_pages_docx(file_content)
            elif ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
                pages_content = cls._extract_pages_image(file_content)
            else:
                pages_content = cls._extract_pages_txt(file_content)
        except Exception as e:
            logger.error(f"Error extracting pages for {filename}: {e}")
            pages_content = []

        pages_content = [page for page in pages_content if page.get("text", "").strip()]
        if not pages_content:
            return {
                "success": False,
                "document_id": doc_id,
                "filename": filename,
                "file_type": ext,
                "total_pages": 0,
                "word_count": 0,
                "character_count": 0,
                "headings": [],
                "topics": [],
                "definitions": [],
                "formulas": [],
                "elements": [],
                "full_text": "",
                "pages": [],
                "error": "No readable text was extracted from this document."
            }

        # Analyze pages and extract structured academic elements
        full_text_parts = []
        all_elements = []
        headings = []
        topics = set()
        definitions = []
        formulas = []

        for p in pages_content:
            p_num = p["page_number"]
            p_text = p["text"]
            full_text_parts.append(f"--- [Page/Slide {p_num}] ---\n{p_text}")

            # 1. Heading detection
            page_headings = cls._detect_headings(p_text)
            headings.extend(page_headings)
            for h in page_headings:
                topics.add(h)

            # 2. Extract definitions
            defs = cls._extract_definitions(p_text, doc_id, filename, p_num)
            definitions.extend(defs)
            all_elements.extend(defs)

            # 3. Extract formulas
            forms = cls._extract_formulas(p_text, doc_id, filename, p_num)
            formulas.extend(forms)
            all_elements.extend(forms)

            # 4. Extract processes
            procs = cls._extract_processes(p_text, doc_id, filename, p_num)
            all_elements.extend(procs)

            # 5. Extract comparisons
            comps = cls._extract_comparisons(p_text, doc_id, filename, p_num)
            all_elements.extend(comps)

            # 6. Extract advantages/disadvantages
            advs = cls._extract_advantages(p_text, doc_id, filename, p_num)
            all_elements.extend(advs)

            # 7. Extract general key concept paragraphs
            concepts = cls._extract_concepts(p_text, doc_id, filename, p_num)
            all_elements.extend(concepts)

        combined_text = "\n\n".join(full_text_parts)
        words = combined_text.split()

        return {
            "success": True,
            "document_id": doc_id,
            "filename": filename,
            "file_type": ext,
            "total_pages": len(pages_content),
            "word_count": len(words),
            "character_count": len(combined_text),
            "headings": list(dict.fromkeys(headings))[:50],
            "topics": list(topics)[:40],
            "definitions": definitions,
            "formulas": formulas,
            "comparisons": [e for e in all_elements if e.get("element_type") == "comparison"],
            "processes": [e for e in all_elements if e.get("element_type") == "process"],
            "elements": all_elements,
            "full_text": combined_text,
            "pages": pages_content
        }

    # ── Page-Level Readers ─────────────────────────────────────────────

    @classmethod
    def _extract_pages_pdf(cls, content: bytes) -> List[Dict[str, Any]]:
        if b"%PDF-" not in content[:1024]:
            logger.warning("PDF header was not found near the start of the document")
            return []

        pages = []
        # Try PyPDF2
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            for i, page in enumerate(reader.pages):
                txt = page.extract_text() or ""
                if txt.strip():
                    pages.append({"page_number": i + 1, "text": txt.strip()})
        except Exception as e:
            logger.warning(f"PyPDF2 failed: {e}")

        # If pages empty or failed, try pdfplumber or OCR
        if not pages:
            try:
                import pdfplumber
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    for i, page in enumerate(pdf.pages):
                        txt = page.extract_text() or ""
                        if txt.strip():
                            pages.append({"page_number": i + 1, "text": txt.strip()})
            except Exception as e:
                logger.warning(f"pdfplumber failed: {e}")

        # If still empty (e.g. scanned PDF), try OCR on images if available
        if not pages:
            pages = cls._ocr_pdf_pages(content)

        return pages

    @classmethod
    def _ocr_pdf_pages(cls, content: bytes) -> List[Dict[str, Any]]:
        """Fallback OCR for scanned PDFs"""
        try:
            from PIL import Image
            import pytesseract
            # If pdf2image is available
            try:
                from pdf2image import convert_from_bytes
                images = convert_from_bytes(content, first_page=1, last_page=5)
                pages = []
                for idx, img in enumerate(images):
                    txt = pytesseract.image_to_string(img)
                    pages.append({"page_number": idx + 1, "text": txt.strip()})
                if pages:
                    return pages
            except Exception:
                pass
        except Exception as e:
            logger.warning(f"OCR failed: {e}")
        return []

    @classmethod
    def _extract_pages_pptx(cls, content: bytes) -> List[Dict[str, Any]]:
        pages = []
        try:
            import pptx
            prs = pptx.Presentation(io.BytesIO(content))
            for idx, slide in enumerate(prs.slides):
                texts = []
                for shape in slide.shapes:
                    if hasattr(shape, "text") and shape.text:
                        texts.append(shape.text.strip())
                joined = "\n".join(texts)
                if joined:
                    pages.append({"page_number": idx + 1, "text": joined})
        except Exception as e:
            logger.error(f"PPTX extraction error: {e}")
        return pages

    @classmethod
    def _extract_pages_docx(cls, content: bytes) -> List[Dict[str, Any]]:
        pages = []
        try:
            import docx
            doc = docx.Document(io.BytesIO(content))
            # Approximate pages by paragraph chunks (every 6 paragraphs ~ 1 page)
            paras = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
            chunk_size = 6
            for i in range(0, max(len(paras), 1), chunk_size):
                chunk = paras[i:i + chunk_size]
                pages.append({"page_number": (i // chunk_size) + 1, "text": "\n".join(chunk)})
        except Exception as e:
            logger.error(f"DOCX extraction error: {e}")
        return pages

    @classmethod
    def _extract_pages_image(cls, content: bytes) -> List[Dict[str, Any]]:
        try:
            from PIL import Image
            import pytesseract
            img = Image.open(io.BytesIO(content))
            txt = pytesseract.image_to_string(img)
            return [{"page_number": 1, "text": txt.strip()}] if txt.strip() else []
        except Exception as e:
            logger.warning(f"Image OCR error: {e}")
            return []

    @classmethod
    def _extract_pages_txt(cls, content: bytes) -> List[Dict[str, Any]]:
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            text = content.decode('latin-1', errors='ignore')
        paragraphs = text.split("\n\n")
        chunk_size = 8
        pages = []
        for i in range(0, max(len(paragraphs), 1), chunk_size):
            chunk = paragraphs[i:i + chunk_size]
            pages.append({"page_number": (i // chunk_size) + 1, "text": "\n\n".join(chunk)})
        return pages

    # ── Grammatical & Academic Extractors ──────────────────────────────

    @classmethod
    def _detect_headings(cls, text: str) -> List[str]:
        headings = []
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        for line in lines:
            # All caps heading
            if line.isupper() and 4 < len(line) < 60:
                headings.append(line.title())
            # Numbered headings e.g. "1. Introduction to Marginal Costing" or "Unit-2: Budgetary Control"
            elif re.match(r'^(?:Unit|Module|Chapter|\d+\.|\d+\.\d+)\s+([A-Za-z0-9\s\-:]{3,60})', line, re.IGNORECASE):
                headings.append(line)
            # Short lines ending with colon
            elif line.endswith(':') and len(line) < 50:
                headings.append(line[:-1].strip())
        return headings

    @classmethod
    def _extract_definitions(cls, text: str, doc_id: str, filename: str, page_num: int) -> List[Dict[str, Any]]:
        defs = []
        for pat in cls.DEFINITION_PATTERNS:
            for match in pat.finditer(text):
                groups = match.groups()
                if len(groups) >= 2 and groups[0] and groups[1]:
                    term = groups[0].strip()
                    meaning = groups[1].strip()
                elif len(groups) == 1 and groups[0]:
                    meaning = groups[0].strip()
                    term = meaning.split()[0] if meaning else "Concept"
                else:
                    continue

                if 2 < len(term) < 50 and len(meaning) > 15:
                    defs.append({
                        "id": f"{doc_id}_def_{uuid.uuid4().hex[:6]}",
                        "element_type": "definition",
                        "title": term,
                        "content": f"{term} is defined as {meaning}",
                        "page_number": page_num,
                        "document_id": doc_id,
                        "filename": filename,
                        "provenance": {
                            "document_id": doc_id,
                            "filename": filename,
                            "page_number": page_num,
                            "section_heading": term,
                            "content_type": "definition",
                            "snippet": f"{term}: {meaning[:100]}..."
                        }
                    })
        return defs

    @classmethod
    def _extract_formulas(cls, text: str, doc_id: str, filename: str, page_num: int) -> List[Dict[str, Any]]:
        forms = []
        for pat in cls.FORMULA_PATTERNS:
            for match in pat.finditer(text):
                matched_str = match.group(0).strip()
                if 5 < len(matched_str) < 120 and ('=' in matched_str or 'formula' in matched_str.lower()):
                    title = match.group(1).strip() if match.groups() else "Formula"
                    forms.append({
                        "id": f"{doc_id}_form_{uuid.uuid4().hex[:6]}",
                        "element_type": "formula",
                        "title": title[:40],
                        "content": matched_str,
                        "page_number": page_num,
                        "document_id": doc_id,
                        "filename": filename,
                        "provenance": {
                            "document_id": doc_id,
                            "filename": filename,
                            "page_number": page_num,
                            "section_heading": title[:40],
                            "content_type": "formula",
                            "snippet": matched_str
                        }
                    })
        return forms

    @classmethod
    def _extract_processes(cls, text: str, doc_id: str, filename: str, page_num: int) -> List[Dict[str, Any]]:
        elements = []
        paras = text.split("\n\n")
        for para in paras:
            p_lower = para.lower()
            if any(kw in p_lower for kw in cls.PROCESS_KEYWORDS):
                lines = [l.strip() for l in para.split("\n") if l.strip()]
                first_line = lines[0] if lines else "Process Flow"
                elements.append({
                    "id": f"{doc_id}_proc_{uuid.uuid4().hex[:6]}",
                    "element_type": "process",
                    "title": first_line[:50],
                    "content": para.strip(),
                    "page_number": page_num,
                    "document_id": doc_id,
                    "filename": filename,
                    "provenance": {
                        "document_id": doc_id,
                        "filename": filename,
                        "page_number": page_num,
                        "section_heading": first_line[:40],
                        "content_type": "process",
                        "snippet": para[:120]
                    }
                })
        return elements

    @classmethod
    def _extract_comparisons(cls, text: str, doc_id: str, filename: str, page_num: int) -> List[Dict[str, Any]]:
        elements = []
        paras = text.split("\n\n")
        for para in paras:
            p_lower = para.lower()
            if any(kw in p_lower for kw in cls.COMPARISON_KEYWORDS):
                first_line = para.split("\n")[0][:50]
                elements.append({
                    "id": f"{doc_id}_comp_{uuid.uuid4().hex[:6]}",
                    "element_type": "comparison",
                    "title": first_line,
                    "content": para.strip(),
                    "page_number": page_num,
                    "document_id": doc_id,
                    "filename": filename,
                    "provenance": {
                        "document_id": doc_id,
                        "filename": filename,
                        "page_number": page_num,
                        "section_heading": first_line,
                        "content_type": "comparison",
                        "snippet": para[:120]
                    }
                })
        return elements

    @classmethod
    def _extract_advantages(cls, text: str, doc_id: str, filename: str, page_num: int) -> List[Dict[str, Any]]:
        elements = []
        paras = text.split("\n\n")
        for para in paras:
            p_lower = para.lower()
            if any(kw in p_lower for kw in cls.ADV_DISADV_KEYWORDS):
                first_line = para.split("\n")[0][:50]
                elements.append({
                    "id": f"{doc_id}_adv_{uuid.uuid4().hex[:6]}",
                    "element_type": "advantage_disadvantage",
                    "title": first_line,
                    "content": para.strip(),
                    "page_number": page_num,
                    "document_id": doc_id,
                    "filename": filename,
                    "provenance": {
                        "document_id": doc_id,
                        "filename": filename,
                        "page_number": page_num,
                        "section_heading": first_line,
                        "content_type": "advantage_disadvantage",
                        "snippet": para[:120]
                    }
                })
        return elements

    @classmethod
    def _extract_concepts(cls, text: str, doc_id: str, filename: str, page_num: int) -> List[Dict[str, Any]]:
        elements = []
        paras = [p.strip() for p in re.split(r'\n{2,}', text) if len(p.strip()) > 60]
        for p in paras:
            first_sent = p.split('.')[0].strip()
            if 15 < len(first_sent) < 70 and not any(k in first_sent.lower() for k in ['page', 'slide', 'copyright']):
                elements.append({
                    "id": f"{doc_id}_concept_{uuid.uuid4().hex[:6]}",
                    "element_type": "concept",
                    "title": first_sent,
                    "content": p,
                    "page_number": page_num,
                    "document_id": doc_id,
                    "filename": filename,
                    "provenance": {
                        "document_id": doc_id,
                        "filename": filename,
                        "page_number": page_num,
                        "section_heading": first_sent[:40],
                        "content_type": "concept",
                        "snippet": p[:120]
                    }
                })
        return elements
