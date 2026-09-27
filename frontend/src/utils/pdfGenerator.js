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

export function createQuestionPaperPDF(questions, metadata = {}) {
  if (!questions || questions.length === 0) {
    alert("No questions to export!");
    return;
  }
  const pdf = new jsPDF('p', 'mm', 'a4');
  const subject = metadata?.subject || 'Course Exam';
  const totalMarks = metadata?.totalMarks || 60;
  const time = metadata?.time || '3 Hours';

  // University Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('PARUL UNIVERSITY', 105, 18, { align: 'center' });

  pdf.setFontSize(12);
  pdf.text('END-TERM PREDICTED EXAMINATION', 105, 26, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Subject: ${subject}   |   Total Marks: ${totalMarks}   |   Time: ${time}`, 105, 33, { align: 'center' });
  pdf.setLineWidth(0.5);
  pdf.line(20, 37, 190, 37);

  let y = 46;
  questions.forEach((q, i) => {
    if (y > 260) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    const qHeader = `Q${i + 1}. [${q.marks || 2} Marks] [Confidence: ${q.confidence || 90}%]`;
    pdf.text(qHeader, 20, y);
    y += 5;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const qText = q.question || 'Question';
    const lines = pdf.splitTextToSize(qText, 170);
    pdf.text(lines, 20, y);
    y += lines.length * 5 + 2;

    if (q.options && Array.isArray(q.options) && q.options.length > 0) {
      q.options.forEach(opt => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(`    ${opt}`, 24, y);
        y += 5;
      });
      y += 2;
    }
    y += 4;
  });

  const cleanSubject = subject.replace(/\s+/g, '_');
  pdf.save(`Parul_${cleanSubject}_Questions.pdf`);
}

export function createAnswerGuidePDF(qnaList, metadata = {}) {
  if (!qnaList || qnaList.length === 0) {
    alert("No answers available to export!");
    return;
  }
  const pdf = new jsPDF('p', 'mm', 'a4');
  const subject = metadata?.subject || 'Comprehensive Study Guide';

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text('PARUL UNIVERSITY — AI STUDY GUIDE & ANSWERS', 105, 18, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Subject: ${subject}   |   Top 25 Predicted Questions & Model Solutions`, 105, 26, { align: 'center' });
  pdf.setLineWidth(0.5);
  pdf.line(20, 30, 190, 30);

  let y = 38;
  qnaList.forEach((item, i) => {
    if (y > 240) {
      pdf.addPage();
      y = 20;
    }

    // Question
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(30, 41, 59); // slate-800
    const qHeader = `Question ${i + 1}: ${item.question}`;
    const qLines = pdf.splitTextToSize(qHeader, 170);
    pdf.text(qLines, 20, y);
    y += qLines.length * 5 + 3;

    // Answer
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(51, 65, 85); // slate-700
    const answerText = item.answer || item.correct_answer || 'Refer to study material for detailed solution.';
    const aHeader = `Model Answer: ${answerText}`;
    const aLines = pdf.splitTextToSize(aHeader, 170);
    pdf.text(aLines, 20, y);
    y += aLines.length * 5 + 3;

    // Key points
    if (item.key_points && Array.isArray(item.key_points) && item.key_points.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(79, 70, 229); // indigo-600
      pdf.text('Key Points for Full Marks:', 22, y);
      y += 4;

      pdf.setFont('helvetica', 'normal');
      item.key_points.forEach(kp => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        const kpLines = pdf.splitTextToSize(`• ${kp}`, 165);
        pdf.text(kpLines, 25, y);
        y += kpLines.length * 4.5;
      });
      y += 2;
    }

    pdf.setTextColor(0, 0, 0);
    pdf.setDrawColor(226, 232, 240); // slate-200
    pdf.line(20, y, 190, y);
    y += 6;
  });

  const cleanSubject = subject.replace(/\s+/g, '_');
  pdf.save(`Parul_${cleanSubject}_Answers_Guide.pdf`);
}
