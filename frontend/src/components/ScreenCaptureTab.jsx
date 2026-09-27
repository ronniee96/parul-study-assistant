import React, { useRef, useState, useEffect } from 'react';
import { startScreenCapture, captureFrame, stopCapture, setupAutoCapture } from '../utils/screenCapture';
import { createPDFFromImages } from '../utils/pdfGenerator';

export default function ScreenCaptureTab({ appState, setAppState }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [captures, setCaptures] = useState(appState.captures || []);
  const [autoInterval, setAutoInterval] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    setAppState(prev => ({ ...prev, captures }));
  }, [captures, setAppState]);

  useEffect(() => {
    return () => {
      if (stream) stopCapture(stream);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [stream]);

  useEffect(() => {
    if (autoInterval > 0 && stream && videoRef.current) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setupAutoCapture(videoRef.current, autoInterval * 1000, (frame) => {
        setCaptures(prev => [...prev, frame]);
      });
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [autoInterval, stream]);

  const handleStart = async () => {
    try {
      const s = await startScreenCapture();
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      s.getVideoTracks()[0].onended = () => {
        setStream(null);
      };
    } catch (err) {
      console.error(err);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && stream) {
      const frame = captureFrame(videoRef.current);
      setCaptures(prev => [...prev, frame]);
    }
  };

  const handleDelete = (index) => {
    setCaptures(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownload = () => {
    if (captures.length > 0) {
      createPDFFromImages(captures, 'Captured_Slides');
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Screen Capture Tool</h2>
        <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-semibold">
          {captures.length} Frames
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 glass-card p-4 flex flex-col gap-4">
          <div className="bg-black rounded-xl overflow-hidden aspect-video relative flex items-center justify-center">
            {stream ? (
              <video ref={videoRef} autoPlay className="w-full h-full object-contain" />
            ) : (
              <div className="text-gray-500 flex flex-col items-center">
                <span className="text-4xl mb-2">💻</span>
                <p>No active capture</p>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {!stream ? (
              <button onClick={handleStart} className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors flex-1">
                Start Capture
              </button>
            ) : (
              <button onClick={() => { stopCapture(stream); setStream(null); }} className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors flex-1">
                Stop Capture
              </button>
            )}
            
            <button 
              onClick={handleCapture}
              disabled={!stream}
              className="px-6 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium disabled:opacity-50 flex-1"
            >
              Capture Frame
            </button>
          </div>
          
          <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="font-medium text-gray-700 dark:text-gray-300">Auto-Capture:</span>
            {[0, 3, 5, 7, 10].map(val => (
              <button 
                key={val}
                onClick={() => setAutoInterval(val)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${autoInterval === val ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              >
                {val === 0 ? 'Off' : `${val}s`}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-80 glass-card p-4 flex flex-col gap-4">
          <h3 className="font-bold text-gray-800 dark:text-gray-200">Captured Frames</h3>
          <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-2">
            {captures.map((cap, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <img src={cap} alt={`frame ${i}`} className="w-full h-auto object-cover" />
                <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">{i + 1}</div>
                <button 
                  onClick={() => handleDelete(i)}
                  className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button 
            onClick={handleDownload}
            disabled={captures.length === 0}
            className="w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium disabled:opacity-50 transition-colors"
          >
            Download as PDF
          </button>
          <button 
            disabled={captures.length === 0}
            className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50 transition-colors"
          >
            Send to Question Engine
          </button>
        </div>
      </div>
    </div>
  );
}
