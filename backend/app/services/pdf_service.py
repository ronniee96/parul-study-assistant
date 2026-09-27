import io
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.units import mm, inch
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.pdfgen import canvas as pdf_canvas
    from PIL import Image
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    logger.warning("reportlab not installed — PDF generation will be unavailable")


class PDFService:
    """Server-side PDF creation service"""
    
    def create_pdf_from_images(self, images: List[bytes], title: str = "Captured Slides") -> bytes:
        """Assemble uploaded images into a clean PDF"""
        if not REPORTLAB_AVAILABLE:
            raise RuntimeError("reportlab is required for PDF generation")
        
        buffer = io.BytesIO()
        c = pdf_canvas.Canvas(buffer, pagesize=landscape(A4))
        width, height = landscape(A4)
        
        c.setTitle(title)
        
        for img_bytes in images:
            try:
                img = Image.open(io.BytesIO(img_bytes))
                img_width, img_height = img.size
                
                # Scale to fit page with margins
                margin = 20
                available_w = width - 2 * margin
                available_h = height - 2 * margin
                
                scale = min(available_w / img_width, available_h / img_height)
                draw_w = img_width * scale
                draw_h = img_height * scale
                
                x = (width - draw_w) / 2
                y = (height - draw_h) / 2
                
                # Save temp image
                img_buffer = io.BytesIO()
                img.save(img_buffer, format='PNG')
                img_buffer.seek(0)
                
                from reportlab.lib.utils import ImageReader
                c.drawImage(ImageReader(img_buffer), x, y, draw_w, draw_h)
                c.showPage()
            except Exception as e:
                logger.error(f"Failed to add image to PDF: {e}")
                continue
        
        c.save()
        return buffer.getvalue()
    
    def create_question_paper_pdf(self, sections: List[Dict], metadata: Dict) -> bytes:
        """Create a formatted university-style question paper PDF"""
        if not REPORTLAB_AVAILABLE:
            raise RuntimeError("reportlab is required for PDF generation")
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                               leftMargin=25*mm, rightMargin=25*mm,
                               topMargin=20*mm, bottomMargin=20*mm)
        
        styles = getSampleStyleSheet()
        story = []
        
        # University header
        title_style = ParagraphStyle('Title', parent=styles['Title'],
                                     fontSize=18, spaceAfter=6,
                                     textColor=HexColor('#312e81'))
        story.append(Paragraph('PARUL UNIVERSITY', title_style))
        
        subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'],
                                        fontSize=14, alignment=TA_CENTER, spaceAfter=4)
        story.append(Paragraph('END-TERM EXAMINATION', subtitle_style))
        
        info_style = ParagraphStyle('Info', parent=styles['Normal'],
                                     fontSize=11, alignment=TA_CENTER, spaceAfter=12)
        subject = metadata.get('subject_name', 'Subject')
        marks = metadata.get('total_marks', 60)
        story.append(Paragraph(f'Subject: {subject} | Total Marks: {marks} | Time: 3 Hours', info_style))
        story.append(Spacer(1, 12))
        
        # Sections
        section_style = ParagraphStyle('Section', parent=styles['Heading2'],
                                       fontSize=13, textColor=HexColor('#667eea'),
                                       spaceAfter=8, spaceBefore=16)
        q_style = ParagraphStyle('Question', parent=styles['Normal'],
                                  fontSize=11, spaceAfter=8, leftIndent=15)
        
        q_num = 1
        for section in sections:
            section_name = section.get('name', 'Section')
            mks = section.get('marks_per_question', 2)
            total = section.get('total_marks', 0)
            story.append(Paragraph(f'{section_name} ({mks} marks each = {total} marks)', section_style))
            
            for q in section.get('questions', []):
                q_text = q.get('question', f'Question {q_num}')
                confidence = q.get('confidence', 0.5)
                conf_pct = int(confidence * 100)
                story.append(Paragraph(f'{q_num}. {q_text} [{mks} marks]', q_style))
                
                # MCQ options
                if q.get('options'):
                    opt_style = ParagraphStyle('Option', parent=styles['Normal'],
                                               fontSize=10, leftIndent=30, spaceAfter=2)
                    for opt in q['options']:
                        story.append(Paragraph(opt, opt_style))
                    story.append(Spacer(1, 4))
                
                q_num += 1
        
        doc.build(story)
        return buffer.getvalue()
    
    def create_answer_guide_pdf(self, answers: List[Dict], metadata: Dict) -> bytes:
        """Create a study guide PDF with all Q&A"""
        if not REPORTLAB_AVAILABLE:
            raise RuntimeError("reportlab is required for PDF generation")
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                               leftMargin=20*mm, rightMargin=20*mm,
                               topMargin=15*mm, bottomMargin=15*mm)
        
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle('Title', parent=styles['Title'],
                                     fontSize=16, textColor=HexColor('#667eea'))
        story.append(Paragraph('Study Guide — Top Predicted Questions \u0026 Answers', title_style))
        
        info = ParagraphStyle('Info', parent=styles['Normal'], fontSize=10, alignment=TA_CENTER, spaceAfter=20)
        subject = metadata.get('subject_name', 'Subject')
        story.append(Paragraph(f'Subject: {subject} | Generated: {datetime.now().strftime("%d %b %Y")}', info))
        
        q_style = ParagraphStyle('Q', parent=styles['Heading3'], fontSize=12,
                                  textColor=HexColor('#312e81'), spaceAfter=4)
        a_style = ParagraphStyle('A', parent=styles['Normal'], fontSize=10,
                                  spaceAfter=4, alignment=TA_JUSTIFY)
        kp_style = ParagraphStyle('KP', parent=styles['Normal'], fontSize=9,
                                   leftIndent=20, spaceAfter=2, textColor=HexColor('#4c3ecf'))
        
        for i, item in enumerate(answers):
            q_text = item.get('question', f'Question {i+1}')
            a_text = item.get('answer', 'Refer to study material.')
            key_points = item.get('key_points', [])
            marks = item.get('marks', 2)
            
            story.append(Paragraph(f'Q{i+1}: {q_text} [{marks} marks]', q_style))
            story.append(Paragraph(f'<b>Answer:</b> {a_text}', a_style))
            
            if key_points:
                story.append(Paragraph('<b>Key Points:</b>', kp_style))
                for kp in key_points:
                    story.append(Paragraph(f'• {kp}', kp_style))
            
            story.append(Spacer(1, 12))
        
        doc.build(story)
        return buffer.getvalue()
