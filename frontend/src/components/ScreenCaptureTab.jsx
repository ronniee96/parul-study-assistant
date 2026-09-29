import React, { useRef, useState, useEffect } from 'react';
import { startScreenCapture, captureFrame, stopCapture, setupAutoCapture, isFrameDifferent } from '../utils/screenCapture';
import { createPDFFromImages } from '../utils/pdfGenerator';
import MarkdownViewer from './MarkdownViewer';
import { apiFetch } from '../utils/apiClient';

export default function ScreenCaptureTab({ appState, setAppState, setActiveTab, apiKeys, openApiKeyModal }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [captures, setCaptures] = useState(appState.captures || []);
  const [autoInterval, setAutoInterval] = useState(0);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const intervalRef = useRef(null);
  const lastCapturedRef = useRef(null);

  useEffect(() => {
    if (captures !== appState.captures) {
      setAppState(prev => (prev.captures === captures ? prev : { ...prev, captures }));
    }
  }, [captures, appState.captures, setAppState]);

  useEffect(() => {
    return () => {
      if (stream) stopCapture(stream);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [stream]);

  // Setup auto-capture with dynamic intervals (including 1s for fast PDF scrolling)
  useEffect(() => {
    if (autoInterval > 0 && stream && videoRef.current) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      intervalRef.current = setupAutoCapture(
        videoRef.current,
        autoInterval * 1000,
        (frame) => {
          setCaptures(prev => [...prev, frame]);
        },
        { skipDuplicates }
      );
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [autoInterval, stream, skipDuplicates]);

  const handleStart = async () => {
    try {
      const s = await startScreenCapture();
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      s.getVideoTracks()[0].onended = () => {
        setStream(null);
        setAutoInterval(0);
      };
    } catch (err) {
      console.warn("Screen capture cancelled or unavailable:", err);
    }
  };

  const handleStop = () => {
    if (stream) stopCapture(stream);
    setStream(null);
    setAutoInterval(0);
  };

  const handleManualCapture = async () => {
    if (videoRef.current && stream) {
      const frame = captureFrame(videoRef.current);
      if (frame) {
        if (skipDuplicates && lastCapturedRef.current) {
          const different = await isFrameDifferent(frame, lastCapturedRef.current);
          if (!different) {
            alert("Duplicate frame detected: This slide looks identical to the previous capture. Scroll to the next slide to capture new content!");
            return;
          }
        }
        lastCapturedRef.current = frame;
        setCaptures(prev => [...prev, frame]);
      }
    }
  };

  const handleDelete = (index) => {
    setCaptures(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    if (window.confirm("Clear all captured frames?")) {
      setCaptures([]);
      setAnalysisResult(null);
      lastCapturedRef.current = null;
    }
  };

  const handleDownload = () => {
    if (captures.length > 0) {
      createPDFFromImages(captures, 'Captured_PDF_Slides');
    }
  };

  // AI Multimodal Analysis of Captured Slides
  const handleAnalyzeSlides = async () => {
    if (captures.length === 0) {
      alert("Please capture at least 1 slide or PDF page before analyzing!");
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisStatus(`Analyzing ${captures.length} captured slides with Multimodal AI...`);

    try {
      const configuredKeys = Object.fromEntries(Object.entries(apiKeys || {}).filter(([, key]) => typeof key === 'string' && key.trim().length > 5));

      const data = await apiFetch('/api/v1/process-captured-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: captures,
          api_keys: configuredKeys,
          preferred_order: ['gemini']
        })
      });

      if (data.success && data.notes?.trim()) {
        setAnalysisResult(data);
        
        // Update appState with generated notes and questions
        setAppState(prev => ({
          ...prev,
          extractedText: data.notes || prev.extractedText || '',
          summary: data.notes,
          questions: data.questions || [],
          rankedQuestions: data.questions || [],
          stats: {
            ...prev.stats,
            pdfCount: (prev.stats?.pdfCount || 0) + 1,
            questionCount: (data.questions || []).length,
            confidence: 0
          }
        }));

        setAnalysisStatus(`✓ Extracted source notes and ${data.questions?.length || 0} questions.`);
      } else {
        throw new Error(data.error || "Analysis failed");
      }
    } catch (err) {
      console.error("Slide analysis failed:", err);
      setAnalysisStatus(`Slide analysis failed: ${err.message || 'No source text was extracted.'}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full p-4 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>📸</span> Screen & PDF Slide Capture
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Capture PDF pages or presentation slides while scrolling • Text and questions are returned only after provider analysis succeeds
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full font-bold text-sm border border-purple-200 dark:border-purple-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <span>{captures.length} Frames Captured</span>
          </div>
          {captures.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-semibold px-2 py-1 rounded transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side: Video Preview & Controls */}
        <div className="flex-1 glass-card p-5 flex flex-col gap-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          {/* Live Video Surface */}
          <div className="bg-gray-950 rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center border border-gray-800 shadow-inner group">
            {stream ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                <div className="absolute top-3 left-3 bg-red-600/90 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  <span>LIVE CAPTURE ACTIVE</span>
                </div>
                {autoInterval > 0 && (
                  <div className="absolute top-3 right-3 bg-emerald-600/90 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                    <span>⚡ Auto-Capturing Every {autoInterval}s</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-400 flex flex-col items-center text-center p-6">
                <span className="text-5xl mb-3">🖥️</span>
                <h4 className="text-base font-bold text-gray-200">No Active Screen Stream</h4>
                <p className="text-xs text-gray-400 max-w-sm mt-1">
                  Click <b>"Start Capture"</b> below and choose your PDF Viewer window, PowerPoint presentation, or browser tab.
                </p>
              </div>
            )}
          </div>
          
          {/* Infinite Mirror Prevention Advice */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <span className="text-base shrink-0">💡</span>
            <div>
              <span className="font-bold">Prevent "Screen Reloading/Mirroring Loop":</span> When starting capture, choose your <b>PDF Reader Window</b>, <b>PowerPoint</b>, or an <b>External Tab</b> rather than "This Tab" or "Entire Screen" to avoid recursive display reflection.
            </div>
          </div>
          
          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {!stream ? (
              <button 
                onClick={handleStart} 
                className="px-6 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 flex-1"
              >
                <span>🎥</span> Start Capture (PDF / Window)
              </button>
            ) : (
              <button 
                onClick={handleStop} 
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 flex-1"
              >
                <span>⏹️</span> Stop Stream
              </button>
            )}
            
            <button 
              onClick={handleManualCapture}
              disabled={!stream}
              className="px-6 py-3 bg-gray-900 dark:bg-gray-100 hover:bg-black dark:hover:bg-white text-white dark:text-gray-900 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 flex-1"
            >
              <span>📸</span> Capture Frame (Space)
            </button>
          </div>
          
          {/* Continuous Auto-Capture Interval Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700/60">
            <div className="flex flex-col">
              <span className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <span>⏱️</span> Auto-Capture as you Scroll:
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Select <b>1s</b> to capture each page continuously as you manually scroll your PDF
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {[
                { val: 0, label: 'Off' },
                { val: 1, label: '1s' },
                { val: 2, label: '2s' },
                { val: 3, label: '3s' },
                { val: 5, label: '5s' },
                { val: 10, label: '10s' }
              ].map(({ val, label }) => (
                <button 
                  key={val}
                  onClick={() => setAutoInterval(val)}
                  disabled={!stream && val > 0}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    autoInterval === val 
                      ? 'bg-primary-600 text-white shadow-sm ring-2 ring-primary-400 dark:ring-primary-500' 
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                  } ${!stream && val > 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Duplicate Suppression Checkbox */}
          <div className="flex items-center gap-2.5 px-2 text-xs text-gray-600 dark:text-gray-300">
            <input 
              type="checkbox" 
              id="skipDuplicates" 
              checked={skipDuplicates} 
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500" 
            />
            <label htmlFor="skipDuplicates" className="cursor-pointer select-none">
              <b>Skip identical frames</b> — pauses capture when you stop scrolling so slides aren't duplicated
            </label>
          </div>
        </div>

        {/* Right Side: Captured Slides Grid & Analysis Actions */}
        <div className="w-full lg:w-96 glass-card p-5 flex flex-col gap-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-base">
              <span>🖼️</span> Captured Slides ({captures.length})
            </h3>
            {captures.length > 0 && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                Ready for AI
              </span>
            )}
          </div>

          {/* Frames Thumbnail Scroll Container */}
          <div className="h-72 overflow-y-auto grid grid-cols-2 gap-2.5 p-1 rounded-xl bg-gray-50/60 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800">
            {captures.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center text-center p-6 text-gray-400 dark:text-gray-500 h-full">
                <span className="text-3xl mb-1">📑</span>
                <p className="text-xs font-medium">No slides captured yet</p>
                <p className="text-[11px] text-gray-400 mt-1">Start capture and scroll your PDF to clip pages!</p>
              </div>
            ) : (
              captures.map((cap, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-black aspect-video shadow-sm">
                  <img src={cap} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute top-1 left-1 bg-black/75 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    Slide {i + 1}
                  </div>
                  <button 
                    onClick={() => handleDelete(i)}
                    title="Delete this slide"
                    className="absolute top-1 right-1 bg-red-600/90 text-white w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs shadow"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5 pt-2">
            <button 
              onClick={handleAnalyzeSlides}
              disabled={captures.length === 0 || analyzing}
              className={`w-full py-3 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                analyzing 
                  ? 'bg-indigo-400 dark:bg-indigo-600 cursor-wait' 
                  : analysisResult
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {analyzing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Analyzing {captures.length} Slides with AI...</span>
                </>
              ) : analysisResult ? (
                <>
                  <span>✓</span> Done! Re-analyze Slides
                </>
              ) : (
                <>
                  <span>🚀</span> Analyze Slides & Generate Questions
                </>
              )}
            </button>

            <button 
              onClick={handleDownload}
              disabled={captures.length === 0}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-sm border border-gray-300 dark:border-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>📥</span> Download Slide Deck as PDF
            </button>
          </div>

          {/* Status Message */}
          {analysisStatus && (
            <div className={`p-3 rounded-xl text-xs font-semibold ${
              analysisStatus.startsWith('✓') 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}>
              {analysisStatus}
            </div>
          )}
        </div>
      </div>

      {/* Analysis Result Card with Quick-Jumps */}
      {analysisResult && (
        <div className="glass-card p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-sm flex flex-col gap-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Slides Successfully Processed & Analyzed!
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                Generated <b>{analysisResult.questions?.length || 0} practice questions</b> from the captured slides.
              </p>
            </div>
            
            {/* Quick Action Navigation */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setActiveTab && setActiveTab('questions')}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>❓</span> Practice Questions Now
              </button>
              <button
                onClick={() => setActiveTab && setActiveTab('summary')}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>📝</span> View Lecture Notes
              </button>
              <button
                onClick={() => setActiveTab && setActiveTab('predictor')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>🎯</span> Predict Exam Paper
              </button>
            </div>
          </div>

          {/* Structured Notes Preview with MarkdownViewer */}
          {analysisResult.notes && (
            <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 max-h-80 overflow-y-auto">
              <MarkdownViewer content={analysisResult.notes} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
