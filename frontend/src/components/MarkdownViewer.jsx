import React from 'react';

/**
 * Rich, zero-dependency Markdown & Visual Breakdown renderer.
 * Formats academic summaries, lecture notes, slide breakdowns, and study cards.
 */
export default function MarkdownViewer({ content, className = '' }) {
  if (!content) return null;

  // Simple, robust parser for markdown blocks
  const parseMarkdown = (text) => {
    const lines = text.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeBuffer = [];
    let codeLang = '';
    let tableBuffer = [];
    let inTable = false;

    const flushTable = () => {
      if (tableBuffer.length === 0) return;
      const rows = tableBuffer.map(row => 
        row.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim())
      );
      if (rows.length > 0) {
        const headerRow = rows[0];
        const bodyRows = rows.slice(1).filter(r => !r.every(c => /^[-:]+$/.test(c)));
        elements.push(
          <div key={`table-${elements.length}`} className="my-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-primary-50 dark:bg-primary-950/40 text-primary-900 dark:text-primary-200 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {headerRow.map((cell, ci) => (
                    <th key={ci} className="py-2.5 px-4 font-bold">{renderInline(cell)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {bodyRows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">
                    {row.map((cell, ci) => (
                      <td key={ci} className="py-2 px-4 text-gray-700 dark:text-gray-300">{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableBuffer = [];
      inTable = false;
    };

    const flushCode = () => {
      if (codeBuffer.length === 0) return;
      elements.push(
        <div key={`code-${elements.length}`} className="my-3 rounded-xl overflow-hidden bg-gray-900 dark:bg-black/80 border border-gray-800 text-gray-100 text-xs font-mono shadow-md">
          {codeLang && (
            <div className="px-3 py-1.5 bg-gray-800/80 text-gray-400 text-[11px] font-semibold border-b border-gray-700/60 uppercase tracking-wider">
              {codeLang}
            </div>
          )}
          <pre className="p-4 overflow-x-auto leading-relaxed">
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        </div>
      );
      codeBuffer = [];
      codeLang = '';
      inCodeBlock = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          flushCode();
        } else {
          if (inTable) flushTable();
          inCodeBlock = true;
          codeLang = line.trim().slice(3).trim();
        }
        continue;
      }
      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        inTable = true;
        tableBuffer.push(line.trim());
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-2xl font-black text-gray-900 dark:text-white mt-6 mb-3 tracking-tight border-b pb-2 border-gray-200 dark:border-gray-800">
            {renderInline(line.slice(2))}
          </h1>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-xl font-bold text-primary-700 dark:text-primary-300 mt-5 mb-2.5 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-gradient-to-b from-primary-500 to-indigo-600 rounded-full inline-block"></span>
            {renderInline(line.slice(3))}
          </h2>
        );
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-base font-bold text-gray-800 dark:text-gray-200 mt-4 mb-1.5">
            {renderInline(line.slice(4))}
          </h3>
        );
        continue;
      }

      // Blockquotes / Callout cards
      if (line.startsWith('> ')) {
        elements.push(
          <div key={`quote-${i}`} className="my-2.5 p-3.5 bg-blue-50/80 dark:bg-blue-950/30 border-l-4 border-primary-500 rounded-r-xl text-gray-800 dark:text-gray-200 text-sm italic">
            {renderInline(line.slice(2))}
          </div>
        );
        continue;
      }

      // Horizontal rule
      if (line.trim() === '---' || line.trim() === '***') {
        elements.push(
          <hr key={`hr-${i}`} className="my-5 border-gray-200 dark:border-gray-800" />
        );
        continue;
      }

      // Bullet list items
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')) {
        const itemText = line.trim().replace(/^[-*•]\s+/, '');
        elements.push(
          <li key={`li-${i}`} className="ml-5 list-disc text-gray-700 dark:text-gray-300 text-sm my-1 leading-relaxed">
            {renderInline(itemText)}
          </li>
        );
        continue;
      }

      // Numbered list items
      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.push(
          <div key={`num-${i}`} className="flex items-start gap-2.5 my-1.5 text-sm text-gray-700 dark:text-gray-300">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-bold text-xs flex items-center justify-center">
              {numMatch[1]}
            </span>
            <span className="flex-1 pt-0.5 leading-relaxed">{renderInline(numMatch[2])}</span>
          </div>
        );
        continue;
      }

      // Regular paragraph
      if (line.trim()) {
        elements.push(
          <p key={`p-${i}`} className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed my-2">
            {renderInline(line)}
          </p>
        );
      }
    }

    if (inCodeBlock) flushCode();
    if (inTable) flushTable();

    return elements;
  };

  // Inline formatting: **bold**, *italic*, `code`
  const renderInline = (text) => {
    if (!text) return '';
    const parts = [];
    let remaining = text;
    let keyIdx = 0;

    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(<strong key={keyIdx++} className="font-bold text-gray-900 dark:text-white">{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(<em key={keyIdx++} className="italic text-gray-800 dark:text-gray-200">{token.slice(1, -1)}</em>);
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(<code key={keyIdx++} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-primary-600 dark:text-primary-400 rounded text-xs font-mono font-semibold">{token.slice(1, -1)}</code>);
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={`prose dark:prose-invert max-w-none ${className}`}>
      {parseMarkdown(content)}
    </div>
  );
}
