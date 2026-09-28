import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function APIKeyModal({ isOpen, onClose, apiKeys, onSaveApiKeys }) {
  const [keys, setKeys] = useState(apiKeys || { gemini: '', openai: '', claude: '' });
  const [priority, setPriority] = useState('gemini');
  const [testing, setTesting] = useState(null);
  const [testStatus, setTestStatus] = useState({});

  if (!isOpen) return null;

  const handleChange = (provider, value) => {
    setKeys(prev => ({ ...prev, [provider]: value }));
  };

  const handleSave = () => {
    onSaveApiKeys(keys, priority);
    onClose();
  };

  const testKey = async (provider) => {
    const key = keys[provider]?.trim();
    if (!key) {
      alert(`Please enter a ${provider.toUpperCase()} key first!`);
      return;
    }

    setTesting(provider);
    setTestStatus(prev => ({ ...prev, [provider]: 'testing' }));

    try {
      const res = await fetch('/api/v1/test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.valid) {
          setTestStatus(prev => ({ ...prev, [provider]: 'valid' }));
        } else if (data.rate_limited) {
          setTestStatus(prev => ({ ...prev, [provider]: 'rate_limited' }));
          alert(`Notice: ${data.message}`);
        } else {
          setTestStatus(prev => ({ ...prev, [provider]: 'invalid' }));
          alert(`Test Result: ${data.message}`);
        }
      } else {
        setTestStatus(prev => ({ ...prev, [provider]: 'invalid' }));
      }
    } catch (e) {
      setTestStatus(prev => ({ ...prev, [provider]: 'invalid' }));
    } finally {
      setTesting(null);
    }
  };

  const activeCount = Object.values(keys).filter(k => k && k.trim().length > 5).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span>🔑</span> Connect AI Engines & Smart Auto-Switcher
            </h3>
            <p className="text-xs text-blue-100 mt-1">
              Connect Google Gemini, OpenAI ChatGPT, and Anthropic Claude. The app automatically switches engines when one hits rate limits or quota runs out!
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-gray-800 dark:text-gray-200">
          {/* Status Alert */}
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <span>
                <strong>Smart Failover Active:</strong> {activeCount > 0 ? `${activeCount} Engine(s) Connected` : 'No keys saved yet (Running in local Academic mode)'}
              </span>
            </div>
            {activeCount > 1 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold text-[11px]">
                ✓ Auto-Switching Ready
              </span>
            )}
          </div>

          {/* Provider 1: Google Gemini */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <span className="font-bold text-sm">Google Gemini API</span>
                <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold px-2 py-0.5 rounded">
                  Recommended & Free
                </span>
              </div>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Get Free Gemini Key ↗
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={keys.gemini || ''}
                onChange={(e) => handleChange('gemini', e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                onClick={() => testKey('gemini')}
                disabled={testing === 'gemini'}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
              >
                {testing === 'gemini' ? 'Testing...' : (testStatus.gemini === 'valid' ? '✓ Valid' : 'Verify')}
              </button>
            </div>
          </div>

          {/* Provider 2: OpenAI ChatGPT */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧠</span>
                <span className="font-bold text-sm">OpenAI ChatGPT API</span>
                <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium px-2 py-0.5 rounded">
                  GPT-4o / GPT-4o-mini
                </span>
              </div>
              <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Get OpenAI Key ↗
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="sk-proj-..."
                value={keys.openai || ''}
                onChange={(e) => handleChange('openai', e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                onClick={() => testKey('openai')}
                disabled={testing === 'openai'}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
              >
                {testing === 'openai' ? 'Testing...' : 'Verify'}
              </button>
            </div>
          </div>

          {/* Provider 3: Anthropic Claude */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔮</span>
                <span className="font-bold text-sm">Anthropic Claude API</span>
                <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium px-2 py-0.5 rounded">
                  Claude 3.5 Sonnet / Haiku
                </span>
              </div>
              <a 
                href="https://console.anthropic.com/settings/keys" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Get Claude Key ↗
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="sk-ant-api03-..."
                value={keys.claude || ''}
                onChange={(e) => handleChange('claude', e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                onClick={() => testKey('claude')}
                disabled={testing === 'claude'}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
              >
                {testing === 'claude' ? 'Testing...' : 'Verify'}
              </button>
            </div>
          </div>

          {/* Primary Model Priority */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800 text-xs">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Primary Starting Engine (Will auto-switch on rate limit):
            </span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gemini">1. Gemini → 2. OpenAI → 3. Claude</option>
              <option value="openai">1. OpenAI → 2. Gemini → 3. Claude</option>
              <option value="claude">1. Claude → 2. Gemini → 3. OpenAI</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-100 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            🔒 Keys are stored securely in your browser's private local storage.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
            >
              Save & Activate Auto-Switcher
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
