import { jsPDF } from 'jspdf';

export function createPDFFromImages(images, title = 'Captured Slides') {
  const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
  images.forEach((imgData, i) => {
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 5, 5, 287, 200);
  });
  pdf.save(`${title.replace(/\\s+/g, '_')}.pdf`);
}

export function createQuestionPaperPDF(questions, metadata) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  // Header
  pdf.setFontSize(16);
  pdf.text('PARUL UNIVERSITY', 105, 15, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text(`Subject: ${metadata.subject || 'Subject'}`, 105, 25, { align: 'center' });
  pdf.text(`Total Marks: ${metadata.totalMarks || 60} | Time: ${metadata.time || '3 hrs'}`, 105, 32, { align: 'center' });
  
  let y = 45;
  questions.forEach((q, i) => {
    if (y > 270) { pdf.addPage(); y = 20; }
    pdf.setFontSize(11);
    const text = `${i + 1}. ${q.question} [${q.marks || 2} marks]`;
    const lines = pdf.splitTextToSize(text, 170);
    pdf.text(lines, 20, y);
    y += lines.length * 6 + 4;
    if (q.options) {
      q.options.forEach(opt => {
        if (y > 270) { pdf.addPage(); y = 20; }
        pdf.setFontSize(10);
        pdf.text(`    ${opt}`, 25, y);
        y += 5;
      });
      y += 3;
    }
  });
  pdf.save(`${metadata.subject || 'exam'}_predicted_paper.pdf`);
}

export function createAnswerGuidePDF(qnaList, metadata) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  pdf.setFontSize(16);
  pdf.text('Study Guide — Top Predicted Questions & Answers', 105, 15, { align: 'center' });
  pdf.setFontSize(10);
  pdf.text(`Subject: ${metadata.subject || 'Subject'} | Generated: ${new Date().toLocaleDateString()}`, 105, 22, { align: 'center' });
  
  let y = 35;
  qnaList.forEach((item, i) => {
    if (y > 250) { pdf.addPage(); y = 20; }
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    const qLines = pdf.splitTextToSize(`Q${i + 1}: ${item.question}`, 170);
    pdf.text(qLines, 20, y);
    y += qLines.length * 6 + 3;
    
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(10);
    const aLines = pdf.splitTextToSize(`Ans: ${item.answer}`, 170);
    pdf.text(aLines, 20, y);
    y += aLines.length * 5 + 3;
    
    if (item.key_points && item.key_points.length > 0) {
      pdf.setFontSize(9);
      pdf.text('Key Points:', 20, y);
      y += 5;
      item.key_points.forEach(kp => {
        if (y > 270) { pdf.addPage(); y = 20; }
        pdf.text(`  • ${kp}`, 25, y);
        y += 4;
      });
    }
    y += 8;
  });
  pdf.save(`${metadata.subject || 'study'}_answer_guide.pdf`);
}
