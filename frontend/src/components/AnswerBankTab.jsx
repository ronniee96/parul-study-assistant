import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createAnswerGuidePDF } from '../utils/pdfGenerator';

const defaultAnswerSet = [
  {
    id: 1,
    question: "Explain the concept of Market Segmentation and its four core bases with examples.",
    confidence: 98,
    difficulty: 3,
    marks: 5,
    topic: "Market Segmentation & Targeting",
    answer: "Market Segmentation is the strategic process of dividing a broad heterogeneous consumer market into distinct homogeneous subsets based on shared characteristics, needs, or behaviors.\n\nFour Core Bases:\n1. Geographic Segmentation: Dividing markets by region, climate, or population density (e.g., winter apparel in northern climates vs tropical wear in coastal areas).\n2. Demographic Segmentation: Segmenting by age, income, education, occupation, and family life cycle (e.g., luxury automobiles targeted at high-net-worth professionals).\n3. Psychographic Segmentation: Segmenting based on social class, lifestyle, values, and personality traits (e.g., fitness apparel targeting health-conscious lifestyle consumers).\n4. Behavioral Segmentation: Segmenting by purchase occasion, brand loyalty, usage rate, and user status (e.g., frequent flyer loyalty tiers).",
    key_points: [
      "Heterogeneous market divided into homogeneous segments",
      "Four bases: Geographic, Demographic, Psychographic, Behavioral",
      "Enables targeted positioning and higher marketing ROI"
    ],
    word_count: 220
  },
  {
    id: 2,
    question: "Critically evaluate the Product Life Cycle (PLC) stages and discuss pricing strategies appropriate for each stage.",
    confidence: 96,
    difficulty: 4,
    marks: 12,
    topic: "Product Life Cycle & Pricing Strategy",
    answer: "The Product Life Cycle (PLC) framework traces the progression of a product through four fundamental stages: Introduction, Growth, Maturity, and Decline.\n\n1. Introduction Stage: Sales are low, production and R&D costs are high, and market awareness is minimal. Strategic Pricing: Price Skimming (setting high initial prices for innovative breakthrough products) or Penetration Pricing (setting low prices to rapidly gain market share).\n\n2. Growth Stage: Rapid sales acceleration, expanding distribution channels, and emergence of direct competitors. Strategic Pricing: Competitive or value-based pricing while establishing brand preference.\n\n3. Maturity Stage: Peak sales followed by market saturation and intense price competition. Strategic Pricing: Defensive pricing, discounting, bundle pricing, and product differentiation to retain market share.\n\n4. Decline Stage: Decreasing demand driven by technological obsolescence or shifting consumer tastes. Strategic Pricing: Harvesting strategies, discounting inventory, or divestment.",
    key_points: [
      "Four stages: Introduction, Growth, Maturity, Decline",
      "Skimming vs Penetration during Introduction",
      "Competitive pricing during Growth; Defensive pricing in Maturity",
      "Harvesting and cost reduction in Decline"
    ],
    word_count: 310
  },
  {
    id: 3,
    question: "Define Consumer Buying Behavior and illustrate the 5-stage decision-making process.",
    confidence: 95,
    difficulty: 3,
    marks: 5,
    topic: "Consumer Buying Behavior",
    answer: "Consumer Buying Behavior refers to the study of individuals, groups, or organizations and the processes they employ to select, secure, use, and dispose of products and services to satisfy their needs.\n\nThe 5-Stage Decision-Making Process:\n1. Problem / Need Recognition: The consumer recognizes a difference between their actual state and desired state, triggered by internal or external stimuli.\n2. Information Search: Seeking data through personal, commercial, public, or experiential sources.\n3. Evaluation of Alternatives: Assessing competing brand alternatives using evaluative criteria and attribute weights.\n4. Purchase Decision: The actual decision to execute the purchase, subject to attitudes of others and unanticipated situational factors.\n5. Post-Purchase Behavior: Evaluating satisfaction or experiencing cognitive dissonance, which drives future repurchase and word-of-mouth.",
    key_points: [
      "5 distinct stages: Need Recognition, Search, Evaluation, Purchase, Post-Purchase",
      "Internal vs external stimuli triggering needs",
      "Post-purchase cognitive dissonance management"
    ],
    word_count: 240
  },
  {
    id: 4,
    question: "Analyze the 7Ps Services Marketing Mix with relevant industry applications.",
    confidence: 94,
    difficulty: 4,
    marks: 10,
    topic: "Services Marketing & 7Ps",
    answer: "Unlike physical goods governed by the traditional 4Ps, services possess unique characteristics: intangibility, inseparability, variability, and perishability. Hence, the expanded 7Ps mix is applied:\n\n1. Product: Core benefit plus supplementary service elements (e.g., airline transportation plus entertainment).\n2. Price: Complex pricing models including yield management, off-peak discounting, and dynamic pricing.\n3. Place: Service delivery channels (physical branches, digital platforms, omnichannel integration).\n4. Promotion: Educational marketing and tangible cues to reduce perceived consumer risk.\n5. People: Front-line staff, customer support, and training that directly shape customer perception.\n6. Process: Workflow, automation, and wait-time management (e.g., mobile check-in).\n7. Physical Evidence: Ambient environment, decor, cleanliness, and digital UX that provide tangible proof of service quality.",
    key_points: [
      "Expands standard 4Ps to account for service intangibility and variability",
      "3 Service-specific Ps: People, Process, Physical Evidence",
      "Direct link between employee satisfaction and customer experience"
    ],
    word_count: 280
  },
  {
    id: 5,
    question: "What is Brand Equity? Explain David Aaker's Brand Equity Model.",
    confidence: 93,
    difficulty: 4,
    marks: 5,
    topic: "Brand Equity & Positioning",
    answer: "Brand Equity represents the commercial value that derives from consumer perception of the brand name of a particular product or service, rather than from the product itself.\n\nDavid Aaker's Model identifies 5 Core Asset Dimensions:\n1. Brand Loyalty: The degree of customer attachment and retention, creating recurring cash flows.\n2. Brand Awareness: Recognition and recall anchored in the consumer's memory structure.\n3. Perceived Quality: Customer's subjective assessment of overall superiority relative to alternatives.\n4. Brand Associations: Attributes, emotional connections, and symbols linked to the brand in memory.\n5. Other Proprietary Brand Assets: Trademarks, patents, and distribution channel relationships that prevent direct imitation.",
    key_points: [
      "Value premium generated by a recognized brand name",
      "5 Aaker dimensions: Loyalty, Awareness, Perceived Quality, Associations, Proprietary Assets",
      "Transforms commoditized goods into premium assets"
    ],
    word_count: 230
  }
];

export default function AnswerBankTab({ appState, setAppState, setActiveTab, apiKeys, openApiKeyModal }) {
  const [expandedId, setExpandedId] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [generating, setGenerating] = useState(false);

  // Use answers from appState if available
  const activeAnswers = useMemo(() => {
    if (appState.rankedQuestions && appState.rankedQuestions.length > 0) {
      return appState.rankedQuestions;
    }
    if (appState.answers && appState.answers.length > 0) {
      return appState.answers;
    }
    if (appState.questions && appState.questions.length > 0) {
      return appState.questions.slice(0, 25);
    }
    return defaultAnswerSet;
  }, [appState.rankedQuestions, appState.answers, appState.questions]);

  const filteredAnswers = useMemo(() => {
    if (!searchQuery.trim()) return activeAnswers;
    const query = searchQuery.toLowerCase();
    return activeAnswers.filter(a => 
      a.question?.toLowerCase().includes(query) ||
      a.answer?.toLowerCase().includes(query) ||
      a.topic?.toLowerCase().includes(query)
    );
  }, [activeAnswers, searchQuery]);

  const handleGenerateAnswersFromMaterial = async () => {
    setGenerating(true);
    try {
      const questionsToSolve = appState.questions?.length ? appState.questions.slice(0, 25) : [];
      const res = await fetch('/api/v1/generate-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questionsToSolve,
          source_text: appState.extractedText || "Software engineering methodologies, SOLID design principles, architectural patterns",
          api_keys: apiKeys
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.answers && data.answers.length > 0) {
          setAppState(prev => ({
            ...prev,
            answers: data.answers,
            stats: { ...prev.stats, answerCount: data.answers.length }
          }));
        }
      }
    } catch (e) {
      console.warn("Failed to generate answers:", e);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!activeAnswers || activeAnswers.length === 0) {
      alert("No answers available to export!");
      return;
    }
    createAnswerGuidePDF(activeAnswers, {
      subject: appState.uploadedFile?.name?.replace(/\.[^/.]+$/, "") || "Top 25 Predicted Exam Solutions"
    });
  };

  const copyToClipboard = (item) => {
    const text = `Question: ${item.question}\n\nModel Answer:\n${item.answer}\n\nKey Points:\n${(item.key_points || []).map(k => `• ${k}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    alert("Model Answer copied to clipboard!");
  };

  return (
    <div className="flex flex-col gap-6 h-full p-2 md:p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>✅</span> Answer Bank — Model Solutions & Key Points
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Exam-ready structured solutions tailored for the top predicted questions with scoring guidelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {appState.extractedText && (
            <button
              onClick={handleGenerateAnswersFromMaterial}
              disabled={generating}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-2 text-sm cursor-pointer disabled:opacity-50"
            >
              {generating ? '🔄 Generating Solutions...' : '⚡ Generate from My Slides'}
            </button>
          )}

          <button 
            onClick={handleDownload} 
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-2 text-sm cursor-pointer"
          >
            📥 Download Complete Study Guide (PDF)
          </button>
        </div>
      </div>

      {/* Search and count bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <span>Displaying:</span>
          <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-bold">
            {filteredAnswers.length} Model Answers
          </span>
        </div>

        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search answers, keywords, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Answers list */}
      <div className="flex flex-col gap-4">
        {filteredAnswers.map((ans, idx) => (
          <div 
            key={ans.id || idx} 
            className="glass-card overflow-hidden border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            {/* Clickable Card Header */}
            <div 
              className="p-5 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors flex justify-between items-center gap-4"
              onClick={() => setExpandedId(expandedId === ans.id ? null : ans.id)}
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2.5 mb-2">
                  <span className="font-extrabold text-sm text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-2.5 py-0.5 rounded">
                    Q{idx + 1}
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${ans.confidence >= 90 ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400'}`}>
                    🎯 {ans.confidence}% Exam Likelihood
                  </span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded font-medium">
                    [{ans.marks || 5} Marks]
                  </span>
                  {ans.topic && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      📁 {ans.topic}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base md:text-lg text-gray-900 dark:text-gray-100 leading-snug">
                  {ans.question}
                </h3>
              </div>

              <div className="ml-2 text-cyan-600 dark:text-cyan-400 font-bold text-sm shrink-0 flex items-center gap-1">
                <span>{expandedId === ans.id ? 'Hide' : 'View Answer'}</span>
                <span>{expandedId === ans.id ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Expanded Answer Content */}
            <AnimatePresence>
              {expandedId === ans.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-100 dark:border-gray-800 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-900"
                >
                  <div className="p-5 flex flex-col gap-4">
                    {/* Model Answer Body */}
                    <div className="bg-white dark:bg-gray-800/80 p-4 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-inner">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                        <span>💡</span> Model Exam Answer for Maximum Marks:
                      </h4>
                      <p className="text-gray-800 dark:text-gray-200 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-normal">
                        {ans.answer || ans.correct_answer || "Refer to study material for detailed solution."}
                      </p>
                    </div>

                    {/* Key points to remember */}
                    {ans.key_points && ans.key_points.length > 0 && (
                      <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
                          <span>📌</span> Key Concepts Examiner Looks For:
                        </h4>
                        <ul className="list-disc pl-5 text-sm text-gray-800 dark:text-gray-200 flex flex-col gap-1.5 font-medium">
                          {ans.key_points.map((kp, kIdx) => (
                            <li key={kIdx}>{kp}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Bottom Actions */}
                    <div className="flex flex-wrap justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700 gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        Target Exam Length: ~{ans.word_count || ((ans.marks || 5) * 40)} words ({ans.marks || 5} Marks)
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => copyToClipboard(ans)}
                          className="text-xs px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          📋 Copy Solution
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
