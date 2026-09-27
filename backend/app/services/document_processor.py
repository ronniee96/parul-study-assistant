"""
Document Processing Service
Handles text extraction from various file formats ethically
"""

import PyPDF2
import pdfplumber
import pptx
import docx
from PIL import Image
import pytesseract
import io
import os
from typing import Union, BinaryIO
import logging

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Service for extracting text from various document formats"""

    @staticmethod
    def extract_text_from_pdf(file_content: bytes) -> str:
        """Extract text from PDF file"""
        try:
            # Try pdfplumber first (better for complex layouts)
            with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                text = ""
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                return text.strip()
        except Exception as e:
            logger.warning(f"pdfplumber failed, trying PyPDF2: {str(e)}")
            try:
                # Fallback to PyPDF2
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text.strip()
            except Exception as e2:
                logger.error(f"Both PDF extraction methods failed: {str(e2)}")
                raise Exception(f"Unable to extract text from PDF: {str(e2)}")

    @staticmethod
    def extract_text_from_pptx(file_content: bytes) -> str:
        """Extract text from PowerPoint file"""
        try:
            presentation = pptx.Presentation(io.BytesIO(file_content))
            text = ""

            for slide_num, slide in enumerate(presentation.slides):
                text += f"\n--- Slide {slide_num + 1} ---\n"

                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        text += shape.text + "\n"

            return text.strip()
        except Exception as e:
            logger.error(f"Failed to extract text from PPTX: {str(e)}")
            raise Exception(f"Unable to extract text from PowerPoint: {str(e)}")

    @staticmethod
    def extract_text_from_docx(file_content: bytes) -> str:
        """Extract text from Word document"""
        try:
            doc = docx.Document(io.BytesIO(file_content))
            text = ""

            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"

            return text.strip()
        except Exception as e:
            logger.error(f"Failed to extract text from DOCX: {str(e)}")
            raise Exception(f"Unable to extract text from Word document: {str(e)}")

    @staticmethod
    def extract_text_from_image(file_content: bytes) -> str:
        """Extract text from image using OCR"""
        try:
            image = Image.open(io.BytesIO(file_content))
            text = pytesseract.image_to_string(image)
            return text.strip()
        except Exception as e:
            logger.error(f"Failed to extract text from image: {str(e)}")
            raise Exception(f"Unable to extract text from image: {str(e)}")

    @staticmethod
    def extract_text_from_txt(file_content: bytes) -> str:
        """Extract text from plain text file"""
        try:
            return file_content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                return file_content.decode('latin-1')
            except Exception as e:
                logger.error(f"Failed to decode text file: {str(e)}")
                raise Exception(f"Unable to read text file: {str(e)}")

    @classmethod
    def process_file(cls, file_content: bytes, filename: str) -> dict:
        """
        Process uploaded file and extract text based on file extension
        Returns dict with extracted text and metadata
        """
        file_extension = os.path.splitext(filename)[1].lower()

        try:
            if file_extension == '.pdf':
                text = cls.extract_text_from_pdf(file_content)
            elif file_extension in ['.ppt', '.pptx']:
                text = cls.extract_text_from_pptx(file_content)
            elif file_extension in ['.doc', '.docx']:
                text = cls.extract_text_from_docx(file_content)
            elif file_extension in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
                text = cls.extract_text_from_image(file_content)
            elif file_extension == '.txt':
                text = cls.extract_text_from_txt(file_content)
            else:
                raise ValueError(f"Unsupported file type: {file_extension}")

            if not text or len(text.strip()) < 10:
                raise ValueError("No meaningful text could be extracted from the file")

            return {
                "success": True,
                "text": text,
                "word_count": len(text.split()),
                "character_count": len(text),
                "file_type": file_extension,
                "filename": filename
            }

        except Exception as e:
            logger.error(f"Error processing file {filename}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "filename": filename
            }

# Example usage
if __name__ == "__main__":
    # This would be used in the actual API endpoints
    print("Document Processor Service Ready")
    print("Supported formats: PDF, PPT/PPTX, DOC/DOCX, TXT, JPG/PNG/BMP/TIFF")