"""
Document Processing Service
Handles text extraction from various file formats ethically with lazy loading
"""

import io
import os
from typing import Union, BinaryIO
import logging

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Service for extracting text from various document formats with robust lazy loading"""

    @staticmethod
    def extract_text_from_pdf(file_content: bytes) -> str:
        """Extract text from PDF file"""
        # Try pdfplumber first
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                text = ""
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                if text.strip():
                    return text.strip()
        except Exception as e:
            logger.warning(f"pdfplumber extraction failed, falling back to PyPDF2: {e}")

        # Fallback to PyPDF2
        try:
            import PyPDF2
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
            text = ""
            for page in pdf_reader.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
            return text.strip()
        except Exception as e2:
            logger.error(f"Both PDF extraction methods failed: {e2}")
            raise Exception(f"Unable to extract text from PDF: {e2}")

    @staticmethod
    def extract_text_from_pptx(file_content: bytes) -> str:
        """Extract text from PowerPoint file"""
        try:
            import pptx
            presentation = pptx.Presentation(io.BytesIO(file_content))
            text = ""

            for slide_num, slide in enumerate(presentation.slides):
                text += f"\n--- Slide {slide_num + 1} ---\n"
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        text += shape.text + "\n"

            return text.strip()
        except Exception as e:
            logger.error(f"Failed to extract text from PPTX: {e}")
            raise Exception(f"Unable to extract text from PowerPoint: {e}")

    @staticmethod
    def extract_text_from_docx(file_content: bytes) -> str:
        """Extract text from Word document"""
        try:
            import docx
            doc = docx.Document(io.BytesIO(file_content))
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Failed to extract text from DOCX: {e}")
            raise Exception(f"Unable to extract text from Word document: {e}")

    @staticmethod
    def extract_text_from_image(file_content: bytes) -> str:
        """Extract text from image using OCR"""
        try:
            from PIL import Image
            import pytesseract
            image = Image.open(io.BytesIO(file_content))
            text = pytesseract.image_to_string(image)
            return text.strip()
        except Exception as e:
            logger.error(f"Failed to extract text from image: {e}")
            raise Exception(f"Unable to extract text from image: {e}")

    @staticmethod
    def extract_text_from_txt(file_content: bytes) -> str:
        """Extract text from plain text file"""
        try:
            return file_content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                return file_content.decode('latin-1')
            except Exception as e:
                logger.error(f"Failed to decode text file: {e}")
                raise Exception(f"Unable to read text file: {e}")

    @classmethod
    def process_file(cls, file_content: bytes, filename: str) -> dict:
        """
        Process uploaded file and extract text based on file extension
        Returns dict with extracted text and metadata
        """
        file_extension = os.path.splitext(filename)[1].lower()

        try:
            extractor = None
            if file_extension == '.pdf':
                extractor = cls.extract_text_from_pdf
            elif file_extension in ['.ppt', '.pptx']:
                extractor = cls.extract_text_from_pptx
            elif file_extension in ['.doc', '.docx']:
                extractor = cls.extract_text_from_docx
            elif file_extension in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
                extractor = cls.extract_text_from_image
            elif file_extension == '.txt':
                extractor = cls.extract_text_from_txt
            else:
                raise ValueError(f"Unsupported file type: {file_extension}")

            try:
                text = extractor(file_content)
            except Exception as e:
                logger.info(f"Primary extraction failed for {filename}; trying structured/OCR extraction: {e}")
                text = ""

            # Structured extraction includes OCR fallback for scans and per-page provenance.
            from app.services.document_intelligence import DocumentIntelligence
            doc_intel = DocumentIntelligence.extract_rich_document(file_content, filename)
            if len((text or '').strip()) < 10:
                text = doc_intel.get("full_text", "")
            if not text or len(text.strip()) < 10:
                raise ValueError(doc_intel.get("error") or "No readable text could be extracted from the file")

            return {
                "success": True,
                "text": text,
                "word_count": len(text.split()),
                "character_count": len(text),
                "file_type": file_extension,
                "filename": filename,
                "document_id": doc_intel.get("document_id"),
                "headings": doc_intel.get("headings", []),
                "topics": doc_intel.get("topics", []),
                "definitions": doc_intel.get("definitions", []),
                "formulas": doc_intel.get("formulas", []),
                "elements": doc_intel.get("elements", []),
                "total_pages": doc_intel.get("total_pages", 1),
                "pages": doc_intel.get("pages", [])
            }

        except Exception as e:
            logger.error(f"Error processing file {filename}: {e}")
            return {
                "success": False,
                "error": str(e),
                "filename": filename
            }
