import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function UploadTab({ appState, setAppState }) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (f) => {
    if (f.size > 10 * 1024 * 1024) {
      alert("File too large (limit 10MB)");
      return;
    }
    setFile(f);
  };

  const processDocument = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/v1/process', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setAppState(prev => ({
        ...prev,
        uploadedFile: file,
        extractedText: data.extracted_text || 'Mock extracted text',
        results: data,
        stats: { ...prev.stats, pdfCount: prev.stats.pdfCount + 1 }
      }));
    } catch (err) {
      console.error(err);
      // Mock success for UI demo
      setTimeout(() => {
        setAppState(prev => ({
          ...prev,
          uploadedFile: file,
          stats: { ...prev.stats, pdfCount: prev.stats.pdfCount + 1 }
        }));
        setLoading(false);
      }, 1500);
      return;
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Upload Study Material</h2>
      
      <div 
        className={`flex-1 glass-card border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-colors duration-300
          ${isDragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-700'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl">📄</span>
        </div>
        <p className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">Drag and drop your file here</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Supports PDF, PPTX, DOCX, JPG up to 10MB</p>
        
        <input 
          type="file" 
          id="file-upload" 
          className="hidden" 
          onChange={handleFileInput}
          accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.jpg,.jpeg,.png"
        />
        <label 
          htmlFor="file-upload" 
          className="cursor-pointer px-6 py-3 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-white dark:text-gray-900 text-white rounded-xl font-medium transition-colors"
        >
          Browse Files
        </label>

        {file && (
          <div className="mt-8 w-full max-w-md p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="text-2xl">📎</span>
              <span className="font-medium truncate text-gray-800 dark:text-gray-200">{file.name}</span>
            </div>
            <button 
              onClick={processDocument}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shrink-0 flex items-center gap-2"
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              ) : 'Process'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
