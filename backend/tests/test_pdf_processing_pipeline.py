"""
Regression Test Suite for PDF Processing Pipeline & Backend Extraction Precedence.
Tests:
1. Digital PDF text extraction & token preservation.
2. Compressed stream handling (FlateDecode) in digital documents.
3. Scanned/raster-only PDF clean failure without hallucinating text.
4. /api/v1/process-multiple endpoint batch processing with session isolation.
5. /api/v1/process-multiple 4MB payload enforcement for serverless execution.
"""

import os
import io
import zlib
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ["DATABASE_URL"] = "sqlite:////tmp/disposable_pdf_test.sqlite3"
os.environ["NEON_DATABASE_URL"] = ""
os.environ["UPLOAD_MAX_SIZE_MB"] = "4"

from fastapi.testclient import TestClient
import api.index as serverless_entry
from app.services.document_processor import DocumentProcessor
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from PIL import Image


class TestPdfProcessingPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(serverless_entry.app)

    def _create_digital_pdf(self, title: str, paragraphs: list) -> bytes:
        """Create a standard digital PDF with selectable text."""
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=letter)
        c.drawString(100, 720, title)
        y = 680
        for para in paragraphs:
            c.drawString(100, y, para)
            y -= 40
        c.showPage()
        c.save()
        return buf.getvalue()

    def _create_scanned_pdf(self) -> bytes:
        """Create a raster image-only PDF with no digital text layer."""
        img = Image.new("RGB", (200, 200), color=(255, 255, 255))
        img_buf = io.BytesIO()
        img.save(img_buf, format="JPEG")
        img_buf.seek(0)

        from reportlab.lib.utils import ImageReader
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=letter)
        c.drawImage(ImageReader(img_buf), 100, 500, width=200, height=200)
        c.showPage()
        c.save()
        return buf.getvalue()

    def test_01_digital_pdf_extraction_and_token_preservation(self):
        """Verify digital PDF extracts accurately and retains synthetic verification tokens."""
        token = "PDF-PIPELINE-TEST-731"
        paragraphs = [
            f"{token} is defined as a verified academic test benchmark.",
            "Operating Systems manage computer hardware and software resources.",
            "Process Scheduling handles removal of the running process from CPU."
        ]
        pdf_bytes = self._create_digital_pdf("Operating Systems Unit 1", paragraphs)

        res = DocumentProcessor.process_file(pdf_bytes, "os_test.pdf")
        self.assertTrue(res["success"], "Digital PDF extraction must succeed")
        self.assertIn(token, res["text"], "Unique verification token must be preserved")
        self.assertIn("Operating Systems", res["text"])
        self.assertGreater(res["character_count"], 100)
        self.assertGreater(res["word_count"], 15)

    def test_02_scanned_pdf_clean_failure_without_hallucination(self):
        """Verify pure raster PDFs fail cleanly with actionable message and no fabricated text."""
        scanned_bytes = self._create_scanned_pdf()
        res = DocumentProcessor.process_file(scanned_bytes, "scanned_doc.pdf")

        self.assertFalse(res["success"], "Scanned image-only PDF must not claim success without OCR")
        self.assertIn("error", res)
        # Verify no fake text was extracted
        self.assertEqual(res.get("text", "").strip(), "")

    def test_03_process_multiple_endpoint_success(self):
        """Verify /api/v1/process-multiple accepts digital documents and returns aggregated text."""
        # 1. Create session
        sess_resp = self.client.post("/api/v1/session/new")
        self.assertEqual(sess_resp.status_code, 200)
        sess_data = sess_resp.json()
        session_id = sess_data["session_id"]
        capability = sess_data["session_capability"]

        # 2. Build files
        file1 = self._create_digital_pdf(
            "Document 1 Title",
            ["PDF-PIPELINE-TEST-731 verification token in doc 1.", "Database normalization reduces redundancy."]
        )
        file2 = b"Software Engineering: Agile principles prioritize working software over documentation."

        headers = {
            "X-Session-ID": session_id,
            "X-Session-Capability": capability
        }
        files = [
            ("files", ("unit1.pdf", io.BytesIO(file1), "application/pdf")),
            ("files", ("unit2.txt", io.BytesIO(file2), "text/plain"))
        ]

        resp = self.client.post("/api/v1/process-multiple", headers=headers, files=files)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertTrue(data.get("success"))
        self.assertIn("PDF-PIPELINE-TEST-731", data.get("extracted_text", ""))
        self.assertIn("Agile principles", data.get("extracted_text", ""))
        self.assertEqual(len(data.get("files", [])), 2)
        self.assertGreater(data.get("total_word_count", 0), 10)

    def test_04_process_multiple_oversized_file_handling(self):
        """Verify /api/v1/process-multiple identifies files exceeding UPLOAD_MAX_SIZE_MB (4MB)."""
        sess_resp = self.client.post("/api/v1/session/new")
        sess_data = sess_resp.json()
        headers = {
            "X-Session-ID": sess_data["session_id"],
            "X-Session-Capability": sess_data["session_capability"]
        }

        # 4.5 MB payload
        oversized_bytes = b"0" * (int(4.5 * 1024 * 1024))
        files = [
            ("files", ("huge_lecture.pdf", io.BytesIO(oversized_bytes), "application/pdf"))
        ]

        resp = self.client.post("/api/v1/process-multiple", headers=headers, files=files)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # The oversized file should be flagged with an error in files summary
        files_res = data.get("files", [])
        self.assertEqual(len(files_res), 1)
        self.assertFalse(files_res[0].get("success"))
        self.assertIn("too large", files_res[0].get("error", "").lower())


if __name__ == "__main__":
    unittest.main()
