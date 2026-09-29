import { jsPDF } from 'jspdf';

export function createPDFFromImages(images, title = 'Captured Slides') {
  if (!images || images.length === 0) {
    alert("No slides captured to export!");
    return;
  }
  const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
  images.forEach((imgData, i) => {
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 5, 5, 287, 200);
  });
  const cleanTitle = (title || 'Captured_Slides').replace(/\s+/g, '_');
  pdf.save(`${cleanTitle}.pdf`);
}

// Parul University Official MBA Mid-Term Examination Paper Generator (40 Marks)
export function createParulExamPDF(paperData = {}) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const subject = paperData.metadata?.subject || 'Course Syllabus';
  const university = paperData.metadata?.university || 'PARUL UNIVERSITY';
  const faculty = paperData.metadata?.faculty || 'FACULTY OF MANAGEMENT STUDIES, PARUL UNIVERSITY';
  const program = paperData.metadata?.program || 'University Examination';
  const examType = paperData.metadata?.examType || 'Mid-Term Examination';
  const subjectCode = paperData.metadata?.subjectCode || 'PU302';
  const semester = paperData.metadata?.semester || 'Semester: III';
  const time = paperData.metadata?.time || '1 hr 30 min';
  const totalMarks = paperData.metadata?.totalMarks || 40;

  const drawPageBorderAndHeader = (pageNumber) => {
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);

    // Enrollment No
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Enrollment No: ................................', 135, 12);

    // University Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(university, 105, 18, { align: 'center' });
    pdf.setFontSize(11);
    pdf.text(examType, 105, 24, { align: 'center' });
    pdf.setFontSize(9.5);
    pdf.text(faculty, 105, 30, { align: 'center' });

    // Metadata Table Box
    pdf.setLineWidth(0.2);
    pdf.rect(15, 34, 180, 16);
    pdf.line(15, 42, 195, 42);
    pdf.line(95, 34, 95, 50);
    pdf.line(145, 34, 145, 50);

    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${semester}`, 18, 39);
    pdf.text('Date:     --/--/2026', 98, 39);
    pdf.text(`Time:     ${time}`, 148, 39);

    pdf.text(`Subject Code:   ${subjectCode}`, 18, 47);
    pdf.text(`Subject Name:   ${subject.slice(0, 24)}`, 98, 47);
    pdf.text(`Total Marks:   ${totalMarks}`, 148, 47);

    // Instructions
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Instructions:', 15, 54);
    pdf.setFont('helvetica', 'normal');
    pdf.text('1. All questions are compulsory / as per rubric instructions.', 20, 58);
    pdf.text('2. Make suitable assumptions whenever necessary.', 20, 62);
    pdf.line(15, 64, 195, 64);

    // Page footer
    pdf.setFontSize(8);
    pdf.text(`Page ${pageNumber}`, 185, 285);
  };

  // Dynamic Multi-Section Renderer for 60M, 70M, 100M, Unit Test or Custom Blueprints
  if (paperData.renderedSections && (paperData.metadata?.totalMarks !== 40 || paperData.renderedSections.length !== 2)) {
    let currentPage = 1;
    drawPageBorderAndHeader(currentPage);
    let y = 71;

    paperData.renderedSections.forEach((sec, sIdx) => {
      if (y > 235) {
        pdf.addPage();
        currentPage++;
        drawPageBorderAndHeader(currentPage);
        y = 71;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(sec.title || sec.name || `SECTION – ${sIdx + 1}`, 105, y, { align: 'center' });
      y += 6;

      if (sec.qGroups && Array.isArray(sec.qGroups)) {
        sec.qGroups.forEach((grp) => {
          if (y > 240) {
            pdf.addPage();
            currentPage++;
            drawPageBorderAndHeader(currentPage);
            y = 71;
          }

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.text(grp.heading || 'Questions', 15, y);
          pdf.text(grp.marksTotal || '', 195, y, { align: 'right' });
          y += 3;

          // Table header
          pdf.rect(15, y, 180, 6);
          pdf.line(25, y, 25, y + 6);
          pdf.line(150, y, 150, y + 6);
          pdf.line(165, y, 165, y + 6);
          pdf.line(180, y, 180, y + 6);

          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.text('No.', 17, y + 4.2);
          pdf.text('Question', 28, y + 4.2);
          pdf.text('Marks', 152, y + 4.2);
          pdf.text('CO', 169, y + 4.2);
          pdf.text('BT', 184, y + 4.2);
          y += 6;

          (grp.items || []).forEach(item => {
            const qText = item.question || '';
            const lines = pdf.splitTextToSize(qText, 120);
            const rowH = Math.max(lines.length * 4.5 + 3, 8);

            if (y + rowH > 272) {
              pdf.addPage();
              currentPage++;
              drawPageBorderAndHeader(currentPage);
              y = 71;

              // Redraw Table header on new page
              pdf.rect(15, y, 180, 6);
              pdf.line(25, y, 25, y + 6);
              pdf.line(150, y, 150, y + 6);
              pdf.line(165, y, 165, y + 6);
              pdf.line(180, y, 180, y + 6);
              pdf.text('No.', 17, y + 4.2);
              pdf.text('Question', 28, y + 4.2);
              pdf.text('Marks', 152, y + 4.2);
              pdf.text('CO', 169, y + 4.2);
              pdf.text('BT', 184, y + 4.2);
              y += 6;
            }

            pdf.rect(15, y, 180, rowH);
            pdf.line(25, y, 25, y + rowH);
            pdf.line(150, y, 150, y + rowH);
            pdf.line(165, y, 165, y + rowH);
            pdf.line(180, y, 180, y + rowH);

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.text(item.no || 'i.', 17, y + 5);
            pdf.text(lines, 28, y + 4.5);
            pdf.text(String(item.marks || 2), 155, y + 5);
            pdf.text(item.co || 'CO1', 169, y + 5);
            pdf.text(item.bt || 'BT-1', 184, y + 5);
            y += rowH;
          });

          y += 5;
        });
      }

      y += 4;
    });

    const cleanUni = (paperData.metadata?.university || 'University').replace(/[^a-zA-Z0-9]/g, '_');
    pdf.save(`${cleanUni}_${subject.replace(/[^a-zA-Z0-9]/g, '_')}_Paper.pdf`);
    return;
  }

  // PAGE 1: SECTION A (Module 1 - Standard Parul 40M Mid-Term)
  drawPageBorderAndHeader(1);

  let y = 71;

  // Section A Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(paperData.sectionA?.title || 'SECTION – A (Module 1)', 105, y, { align: 'center' });
  y += 7;

  // Q1 Section A
  pdf.setFontSize(9);
  pdf.text(paperData.sectionA?.q1?.heading || 'Q1. Attempt Any One Question out of Two. (02 Mark Each)', 15, y);
  pdf.text('(02 Marks)', 180, y, { align: 'right' });
  y += 3;

  // Q1 Table Header
  pdf.rect(15, y, 180, 6);
  pdf.line(25, y, 25, y + 6);
  pdf.line(150, y, 150, y + 6);
  pdf.line(165, y, 165, y + 6);
  pdf.line(180, y, 180, y + 6);

  pdf.setFontSize(8);
  pdf.text('No.', 17, y + 4.2);
  pdf.text('Question', 28, y + 4.2);
  pdf.text('Marks', 152, y + 4.2);
  pdf.text('CO', 169, y + 4.2);
  pdf.text('BT (1/2/4)', 182, y + 4.2);
  y += 6;

  // Q1 Items
  const q1a = paperData.sectionA?.q1?.items || [];

  q1a.forEach(item => {
    const qText = item.question || item.q || '';
    const lines = pdf.splitTextToSize(qText, 120);
    const rowH = Math.max(lines.length * 4.5 + 3, 8);
    pdf.rect(15, y, 180, rowH);
    pdf.line(25, y, 25, y + rowH);
    pdf.line(150, y, 150, y + rowH);
    pdf.line(165, y, 165, y + rowH);
    pdf.line(180, y, 180, y + rowH);

    pdf.text(item.no || 'i.', 17, y + 5);
    pdf.text(lines, 28, y + 4.5);
    pdf.text(String(item.marks || 2), 155, y + 5);
    pdf.text(item.co || 'CO1', 169, y + 5);
    pdf.text(item.bt || 'BT-1', 184, y + 5);
    y += rowH;
  });

  y += 5;

  // Q2 Section A
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text(paperData.sectionA?.q2?.heading || 'Q2. Attempt Any Two Questions out of Three (6 Marks Each)', 15, y);
  pdf.text('(12 Marks)', 180, y, { align: 'right' });
  y += 3;

  // Q2 Table Header
  pdf.rect(15, y, 180, 6);
  pdf.line(25, y, 25, y + 6);
  pdf.line(150, y, 150, y + 6);
  pdf.line(165, y, 165, y + 6);
  pdf.line(180, y, 180, y + 6);

  pdf.setFontSize(8);
  pdf.text('No.', 17, y + 4.2);
  pdf.text('Question', 28, y + 4.2);
  pdf.text('Marks', 152, y + 4.2);
  pdf.text('CO', 169, y + 4.2);
  pdf.text('BT (1/2/4)', 182, y + 4.2);
  y += 6;

  const q2a = paperData.sectionA?.q2?.items || [];

  q2a.forEach(item => {
    const qText = item.question || item.q || '';
    const lines = pdf.splitTextToSize(qText, 120);
    const rowH = Math.max(lines.length * 4.5 + 3, 11);
    pdf.rect(15, y, 180, rowH);
    pdf.line(25, y, 25, y + rowH);
    pdf.line(150, y, 150, y + rowH);
    pdf.line(165, y, 165, y + rowH);
    pdf.line(180, y, 180, y + rowH);

    pdf.text(item.no || 'i.', 17, y + 5);
    pdf.text(lines, 28, y + 4.5);
    pdf.text(String(item.marks || 6), 155, y + 5);
    pdf.text(item.co || 'CO2', 169, y + 5);
    pdf.text(item.bt || 'BT-2', 184, y + 5);
    y += rowH;
  });

  y += 5;

  // Q3 Caselet Section A
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text(paperData.sectionA?.q3?.heading || 'Q3. Answer the following question based on Case let.', 15, y);
  pdf.text('(06 Marks)', 180, y, { align: 'right' });
  y += 3;

  const caseletA = paperData.sectionA?.q3?.caseletText || 'Case let analysis on course syllabus topics.';
  const caseLinesA = pdf.splitTextToSize(caseletA, 120);
  const rowHA = Math.max(caseLinesA.length * 4.5 + 4, 18);

  pdf.rect(15, y, 180, rowHA);
  pdf.line(25, y, 25, y + rowHA);
  pdf.line(150, y, 150, y + rowHA);
  pdf.line(165, y, 165, y + rowHA);
  pdf.line(180, y, 180, y + rowHA);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('i.', 17, y + 5);
  pdf.text(caseLinesA, 28, y + 4.5);
  pdf.text('6', 155, y + 5);
  pdf.text(paperData.sectionA?.q3?.co || 'CO3', 169, y + 5);
  pdf.text(paperData.sectionA?.q3?.bt || 'BT-6', 184, y + 5);


  // PAGE 2: SECTION B (Module 2)
  pdf.addPage();
  drawPageBorderAndHeader(2);

  y = 73;

  // Section B Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(paperData.sectionB?.title || 'SECTION – B (Module-2)', 105, y, { align: 'center' });
  y += 7;

  // Q1 Section B
  pdf.setFontSize(9);
  pdf.text(paperData.sectionB?.q1?.heading || 'Q1. Attempt Any One Question out of Two (02 Mark Each)', 15, y);
  pdf.text('(02 Marks)', 180, y, { align: 'right' });
  y += 3;

  // Q1 Table Header
  pdf.rect(15, y, 180, 6);
  pdf.line(25, y, 25, y + 6);
  pdf.line(150, y, 150, y + 6);
  pdf.line(165, y, 165, y + 6);
  pdf.line(180, y, 180, y + 6);

  pdf.setFontSize(8);
  pdf.text('No.', 17, y + 4.2);
  pdf.text('Question', 28, y + 4.2);
  pdf.text('Marks', 152, y + 4.2);
  pdf.text('CO', 169, y + 4.2);
  pdf.text('BT (3,5,6)', 181, y + 4.2);
  y += 6;

  const q1b = paperData.sectionB?.q1?.items || [];

  q1b.forEach(item => {
    const qText = item.question || item.q || '';
    const lines = pdf.splitTextToSize(qText, 120);
    const rowH = Math.max(lines.length * 4.5 + 3, 8);
    pdf.rect(15, y, 180, rowH);
    pdf.line(25, y, 25, y + rowH);
    pdf.line(150, y, 150, y + rowH);
    pdf.line(165, y, 165, y + rowH);
    pdf.line(180, y, 180, y + rowH);

    pdf.text(item.no || 'i.', 17, y + 5);
    pdf.text(lines, 28, y + 4.5);
    pdf.text(String(item.marks || 2), 155, y + 5);
    pdf.text(item.co || 'CO4', 169, y + 5);
    pdf.text(item.bt || 'BT-1', 184, y + 5);
    y += rowH;
  });

  y += 5;

  // Q2 Section B
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text(paperData.sectionB?.q2?.heading || 'Q2. Attempt Any Two Questions out of Three (6 Marks Each)', 15, y);
  pdf.text('(12 Marks)', 180, y, { align: 'right' });
  y += 3;

  // Q2 Table Header
  pdf.rect(15, y, 180, 6);
  pdf.line(25, y, 25, y + 6);
  pdf.line(150, y, 150, y + 6);
  pdf.line(165, y, 165, y + 6);
  pdf.line(180, y, 180, y + 6);

  pdf.setFontSize(8);
  pdf.text('No.', 17, y + 4.2);
  pdf.text('Question', 28, y + 4.2);
  pdf.text('Marks', 152, y + 4.2);
  pdf.text('CO', 169, y + 4.2);
  pdf.text('BT (3,5,6)', 181, y + 4.2);
  y += 6;

  const q2b = paperData.sectionB?.q2?.items || [];

  q2b.forEach(item => {
    const qText = item.question || item.q || '';
    const lines = pdf.splitTextToSize(qText, 120);
    const rowH = Math.max(lines.length * 4.5 + 3, 11);
    pdf.rect(15, y, 180, rowH);
    pdf.line(25, y, 25, y + rowH);
    pdf.line(150, y, 150, y + rowH);
    pdf.line(165, y, 165, y + rowH);
    pdf.line(180, y, 180, y + rowH);

    pdf.text(item.no || 'i.', 17, y + 5);
    pdf.text(lines, 28, y + 4.5);
    pdf.text(String(item.marks || 6), 155, y + 5);
    pdf.text(item.co || 'CO5', 169, y + 5);
    pdf.text(item.bt || 'BT-4', 184, y + 5);
    y += rowH;
  });

  y += 5;

  // Q3 Caselet Section B
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text(paperData.sectionB?.q3?.heading || 'Q3. Answer the following question based on Case let.', 15, y);
  pdf.text('(06 Marks)', 180, y, { align: 'right' });
  y += 3;

  const caseletB = paperData.sectionB?.q3?.caseletText || 'Case let analysis on Module 2 syllabus topics.';
  const caseLinesB = pdf.splitTextToSize(caseletB, 120);
  const rowHB = Math.max(caseLinesB.length * 4.5 + 4, 18);

  pdf.rect(15, y, 180, rowHB);
  pdf.line(25, y, 25, y + rowHB);
  pdf.line(150, y, 150, y + rowHB);
  pdf.line(165, y, 165, y + rowHB);
  pdf.line(180, y, 180, y + rowHB);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('i.', 17, y + 5);
  pdf.text(caseLinesB, 28, y + 4.5);
  pdf.text('6', 155, y + 5);
  pdf.text(paperData.sectionB?.q3?.co || 'CO6', 169, y + 5);
  pdf.text(paperData.sectionB?.q3?.bt || 'BT-6', 184, y + 5);

  pdf.save(`Parul_MidTerm_${subject.replace(/[^a-zA-Z0-9]/g, '_')}_Paper.pdf`);
}

export function createQuestionPaperPDF(questions, metadata = {}) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const subject = metadata?.subject || metadata?.subjectName || 'Course Syllabus';
  const totalMarks = metadata?.totalMarks;
  const time = metadata?.time;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(49, 46, 129);
  pdf.text('STUDY ASSISTANT — PRACTICE QUESTIONS', 105, 18, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.setTextColor(30, 41, 59);
  pdf.text(`Subject: ${subject}`, 105, 26, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  const paperMetadata = [totalMarks != null ? `Marks shown in uploaded profile: ${totalMarks}` : '', time ? `Duration shown in uploaded profile: ${time}` : ''].filter(Boolean).join(' | ');
  if (paperMetadata) pdf.text(paperMetadata, 105, 33, { align: 'center' });

  pdf.setDrawColor(200, 200, 200);
  pdf.line(15, 38, 195, 38);

  let y = 46;
  questions.forEach((q, i) => {
    if (y > 265) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    const qHeader = `Q${i + 1}. [Suggested ${q.marks ?? 2} Marks]`;
    pdf.text(qHeader, 15, y);
    y += 5;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(30, 41, 59);
    const qLines = pdf.splitTextToSize(q.question, 180);
    pdf.text(qLines, 15, y);
    y += qLines.length * 4.5 + 2;

    if (q.options && q.options.length > 0) {
      q.options.forEach(opt => {
        if (y > 275) {
          pdf.addPage();
          y = 20;
        }
        pdf.setFontSize(9);
        pdf.setTextColor(70, 70, 70);
        pdf.text(opt, 20, y);
        y += 4.5;
      });
      y += 2;
    }

    y += 4;
  });

  pdf.save(`${subject.replace(/[^a-zA-Z0-9]/g, '_')}_Question_Paper.pdf`);
}

export function createAnswerGuidePDF(qnaList, metadata = {}) {
  if (!qnaList || qnaList.length === 0) {
    alert("No answers available to export!");
    return;
  }
  const pdf = new jsPDF('p', 'mm', 'a4');
  const subject = metadata?.subject || metadata?.subjectName || 'Course Syllabus';

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(49, 46, 129);
  pdf.text('STUDY ASSISTANT — ANSWER GUIDE', 105, 18, { align: 'center' });

  pdf.setFontSize(11);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Subject: ${subject} | Generated: ${new Date().toLocaleDateString()}`, 105, 25, { align: 'center' });

  pdf.setDrawColor(200, 200, 200);
  pdf.line(15, 30, 195, 30);

  let y = 38;
  qnaList.forEach((item, i) => {
    if (y > 240) {
      pdf.addPage();
      y = 20;
    }

    // Question
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(30, 41, 59);
    const qText = `Q${i + 1}: ${item.question || item.q || ''} [${item.marks || 2} Marks]`;
    const qLines = pdf.splitTextToSize(qText, 180);
    pdf.text(qLines, 15, y);
    y += qLines.length * 5 + 3;

    // Answer
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(51, 65, 85);
    const ansText = item.answer || item.solution || 'Refer to study notes.';
    const aLines = pdf.splitTextToSize(`Ans: ${ansText}`, 180);
    pdf.text(aLines, 15, y);
    y += aLines.length * 4.5 + 3;

    // Key points
    if (item.key_points && item.key_points.length > 0) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8.5);
      pdf.setTextColor(79, 70, 229);
      item.key_points.forEach(kp => {
        if (y > 275) {
          pdf.addPage();
          y = 20;
        }
        const kpLines = pdf.splitTextToSize(`• ${kp}`, 175);
        pdf.text(kpLines, 18, y);
        y += kpLines.length * 4 + 1;
      });
    }

    y += 6;
  });

  pdf.save(`${subject.replace(/[^a-zA-Z0-9]/g, '_')}_Model_Answers.pdf`);
}
