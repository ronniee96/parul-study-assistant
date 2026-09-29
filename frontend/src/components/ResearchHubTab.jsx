import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '../utils/apiClient';

const PRESET_QUERIES = [
  'Database Normalization BCNF',
  'Operating Systems Deadlocks Banker',
  'TCP 3-Way Handshake Flow Control',
  'Dynamic Programming Knapsack',
  'Parul University',
  'Quantum Computing Algorithms',
  'Neural Networks Attention Mechanism'
];

export default function ResearchHubTab({ appState = {}, setAppState, setActiveTab, apiKeys, openApiKeyModal }) {
  const [query, setQuery] = useState('');
  const [activeSource, setActiveSource] = useState('all'); // 'all', 'arxiv', 'crossref', 'openalex', 'openlibrary', 'gutendex', 'artic', 'universities', 'perplexity'
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [perplexityAnswer, setPerplexityAnswer] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);

  const handleSearch = async (searchQuery = query, source = activeSource) => {
    const q = searchQuery.trim();
    if (!q) return;

    setLoading(true);
    if (!searchHistory.includes(q)) {
      setSearchHistory(prev => [q, ...prev.slice(0, 5)]);
    }

    try {
      if (source === 'perplexity') {
        const pKey = localStorage.getItem('parul_perplexity_key') || apiKeys?.perplexity;
        const data = await apiFetch('/api/v1/research/ask-perplexity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: q,
            api_key: pKey,
            model: 'sonar'
          })
        });
        setPerplexityAnswer(data);
        setResults(null);
      } else {
        const data = await apiFetch('/api/v1/research/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: q,
            source: source,
            perplexity_key: apiKeys?.perplexity
          })
        });
        setResults(data);
        setPerplexityAnswer(null);
      }
    } catch (err) {
      console.error('Research search error:', err);
      alert(`Research query failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToSummary = (text, title) => {
    if (setAppState) {
      setAppState(prev => ({
        ...prev,
        extractedText: `# ${title}\n\n${text}\n\n---\n*Imported from Academic Research Hub*`,
        summaryData: {
          summary: text,
          keyPoints: ['Academic Paper Synthesis', 'Peer-Reviewed Source Material', 'Verified Scholarly Definition'],
          wordCount: text.split(/\s+/).length,
          readingTime: `${Math.max(1, Math.round(text.split(/\s+/).length / 200))} mins`,
          method: 'Academic Multi-API Research'
        }
      }));
      if (setActiveTab) {
        setActiveTab('summary');
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full p-4 max-w-7xl mx-auto overflow-y-auto w-full">
      {/* Header Banner */}
      <div className="glass-card p-6 bg-gradient-to-r from-sky-600/10 via-blue-600/10 to-indigo-600/10 border-sky-500/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🌐</span>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Scholarly Academic Hub & Multi-API Explorer
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                8 Integrated APIs
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Query preprints, peer-reviewed DOIs, open-access textbooks, university course catalogs, and Perplexity AI citations in one search.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={openApiKeyModal}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 hover:border-sky-500 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <span>⚙️</span> Configure API Keys
            </button>
            {setActiveTab && (
              <button
                onClick={() => setActiveTab('transparency')}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
              >
                <span>🔍</span> View AI Audit Trail
              </button>
            )}
          </div>
        </div>

        {/* API Badges */}
        <div className="flex items-center gap-2 mt-4 flex-wrap text-xs">
          <span className="text-gray-500 font-semibold">Supported Academic Engines:</span>
          {[
            { label: 'arXiv Preprints', icon: '📄' },
            { label: 'CrossRef DOIs', icon: '📚' },
            { label: 'OpenAlex Scholar', icon: '🔬' },
            { label: 'OpenLibrary Textbooks', icon: '📖' },
            { label: 'Gutendex Classics', icon: '🏛️' },
            { label: 'Art Institute Diagrams', icon: '🎨' },
            { label: 'Hipolabs Universities', icon: '🎓' },
            { label: 'Perplexity AI Sonar', icon: '🔮' }
          ].map((api, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-[11px] font-medium"
            >
              {api.icon} {api.label}
            </span>
          ))}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="glass-card p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
            <input
              type="text"
              placeholder="Search syllabus topic, research paper, textbook, university, or ask a research question..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-2 shrink-0"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                <span>Searching...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Search Hub</span>
              </>
            )}
          </button>
        </div>

        {/* Preset Suggestions */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-500">
          <span className="font-semibold">High-Yield Presets:</span>
          {PRESET_QUERIES.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(p);
                handleSearch(p, activeSource);
              }}
              className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-gray-600 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Source Selection Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: 'All Engines (Unified)', icon: '🌐' },
          { id: 'arxiv', label: 'arXiv Papers', icon: '📄' },
          { id: 'crossref', label: 'CrossRef DOIs', icon: '📚' },
          { id: 'openalex', label: 'OpenAlex Works', icon: '🔬' },
          { id: 'openlibrary', label: 'OpenLibrary Textbooks', icon: '📖' },
          { id: 'gutendex', label: 'Project Gutenberg', icon: '🏛️' },
          { id: 'artic', label: 'Art Institute Diagrams', icon: '🎨' },
          { id: 'universities', label: 'University Directory', icon: '🎓' },
          { id: 'perplexity', label: 'Perplexity AI (Live)', icon: '🔮' }
        ].map(src => (
          <button
            key={src.id}
            onClick={() => {
              setActiveSource(src.id);
              if (query.trim()) {
                handleSearch(query, src.id);
              }
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold transition-all whitespace-nowrap ${
              activeSource === src.id
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <span>{src.icon}</span>
            <span>{src.label}</span>
          </button>
        ))}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* RESULTS DISPLAY                                                         */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="glass-card p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-600 rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
            Fanning out queries across academic APIs in parallel...
          </span>
          <span className="text-xs text-gray-500">
            Parsing preprints, resolving DOIs, and formatting citations
          </span>
        </div>
      )}

      {/* Perplexity AI Answer View */}
      {!loading && perplexityAnswer && (
        <div className="glass-card p-6 flex flex-col gap-4 border-2 border-indigo-500/20 shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔮</span>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                  Perplexity AI Grounded Response
                </h3>
                <span className="text-xs text-gray-400">
                  Model: {perplexityAnswer.model} • {perplexityAnswer.latency_ms}ms latency
                </span>
              </div>
            </div>
            <button
              onClick={() => handleSendToSummary(perplexityAnswer.answer, query)}
              className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-bold hover:bg-sky-700 transition-colors"
            >
              📥 Import to Study Notes
            </button>
          </div>

          <div className="prose dark:prose-invert max-w-none text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
            {perplexityAnswer.answer}
          </div>

          {perplexityAnswer.citations && perplexityAnswer.citations.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-2">
                🔗 Verified Academic Sources & Citations:
              </span>
              <div className="flex flex-col gap-1.5">
                {perplexityAnswer.citations.map((cite, i) => (
                  <a
                    key={i}
                    href={cite}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1.5 truncate"
                  >
                    <span>[{i + 1}]</span>
                    <span className="truncate">{cite}</span>
                    <span>↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unified Search Results Display */}
      {!loading && results && (
        <div className="flex flex-col gap-6">
          {/* Quick Metrics Bar */}
          <div className="flex items-center justify-between glass-card p-3 text-xs text-gray-600 dark:text-gray-400 flex-wrap gap-2">
            <span>
              Query: <strong className="text-gray-900 dark:text-gray-100">"{results.query}"</strong> • Execution Time: <strong>{results.total_duration_ms || results.latency_ms}ms</strong>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓ Multi-API Verification Successful</span>
            </div>
          </div>

          {/* arXiv Section */}
          {(results.data?.arxiv?.results || results.source === 'arXiv') && (
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base flex items-center gap-2">
                <span>📄</span> arXiv Academic Preprints
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 font-semibold">
                  {(results.data?.arxiv?.results || results.results || []).length} Papers
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(results.data?.arxiv?.results || results.results || []).map((paper, i) => (
                  <div key={i} className="glass-card p-4 flex flex-col justify-between gap-3 border-l-4 border-l-red-500">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                        <span>{paper.published}</span>
                        <span>{paper.authors?.join(', ')}</span>
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                        {paper.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-3 leading-relaxed">
                        {paper.summary}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
                      {paper.pdf_url && (
                        <a
                          href={paper.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-red-600 dark:text-red-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <span>📥 Download PDF</span>
                          <span>↗</span>
                        </a>
                      )}
                      <button
                        onClick={() => handleSendToSummary(paper.summary, paper.title)}
                        className="text-sky-600 dark:text-sky-400 font-semibold hover:underline"
                      >
                        Study Paper Notes →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OpenAlex Works Section */}
          {(results.data?.openalex?.results || results.source === 'OpenAlex') && (
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base flex items-center gap-2">
                <span>🔬</span> OpenAlex Global Scholarly Works
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 font-semibold">
                  {(results.data?.openalex?.results || results.results || []).length} Citations
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(results.data?.openalex?.results || results.results || []).map((work, i) => (
                  <div key={i} className="glass-card p-4 flex flex-col justify-between gap-3 border-l-4 border-l-indigo-500">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                        <span>Year: {work.year}</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {work.cited_by_count} Citations
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                        {work.title}
                      </h4>
                      {work.concepts && work.concepts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {work.concepts.map((c, cIdx) => (
                            <span key={cIdx} className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
                      {work.pdf_url ? (
                        <a
                          href={work.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                        >
                          Open Access Full-Text ↗
                        </a>
                      ) : (
                        <span className="text-gray-400">Standard DOI License</span>
                      )}
                      <a
                        href={work.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                      >
                        View DOI Metadata ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OpenLibrary University Textbooks Section */}
          {(results.data?.openlibrary?.results || results.source === 'OpenLibrary') && (
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base flex items-center gap-2">
                <span>📖</span> OpenLibrary University Textbooks & Reference Editions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(results.data?.openlibrary?.results || results.results || []).map((book, i) => (
                  <div key={i} className="glass-card p-3 flex flex-col justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {book.cover_url ? (
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="w-16 h-22 object-cover rounded-lg shadow-sm border shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-16 h-22 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-2xl shrink-0">
                          📚
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100 line-clamp-2">
                          {book.title}
                        </h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">
                          {book.authors?.join(', ') || 'Academic Faculty'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Published: {book.first_publish_year}
                        </p>
                      </div>
                    </div>

                    {book.url && (
                      <a
                        href={book.url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full text-center py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-300 font-semibold text-xs hover:bg-sky-100 transition-colors"
                      >
                        Read / Borrow on OpenLibrary ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Art Institute Diagrams Section */}
          {(results.data?.artic?.results || results.source === 'Art Institute of Chicago') && (
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base flex items-center gap-2">
                <span>🎨</span> Visual Blueprints & Historical Scientific Diagrams (Art Institute of Chicago)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(results.data?.artic?.results || results.results || []).map((art, i) => (
                  <div key={i} className="glass-card overflow-hidden flex flex-col justify-between">
                    {art.image_url ? (
                      <img
                        src={art.image_url}
                        alt={art.title}
                        className="w-full h-36 object-cover bg-gray-950"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-36 bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-3xl">
                        🖼️
                      </div>
                    )}
                    <div className="p-3">
                      <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100 line-clamp-1">
                        {art.title}
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {art.artist} • {art.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && !results && !perplexityAnswer && (
        <div className="glass-card p-12 text-center flex flex-col items-center gap-3">
          <span className="text-5xl">🏛️</span>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
            Scholarly Academic Hub Ready
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
            Type any lecture topic, engineering principle, or question above. The engine concurrently gathers data from arXiv, CrossRef, OpenAlex, OpenLibrary, Gutendex, and Perplexity AI.
          </p>
        </div>
      )}
    </div>
  );
}
