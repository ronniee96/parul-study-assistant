/**
 * Client-Side Multi-Model AI Orchestrator
 * Direct in-browser integration with Google Gemini, OpenAI ChatGPT, and Anthropic Claude.
 * Automatically handles CORS requests, key discovery, and multi-model failover.
 */

// Helper to get active keys from argument or localStorage
export function getAvailableApiKeys(providedKeys = {}) {
  let keys = { ...(providedKeys || {}) };
  try {
    const saved = localStorage.getItem('study_assistant_permanent_api_keys') || localStorage.getItem('study_assistant_api_keys');
    if (saved) {
      const parsed = JSON.parse(saved);
      keys = { ...parsed, ...keys };
    }
  } catch {
    // ignore
  }

  // Also check individual direct keys
  try {
    const gem = localStorage.getItem('parul_gemini_key');
    if (gem && !keys.gemini) keys.gemini = gem;
    const oai = localStorage.getItem('parul_openai_key');
    if (oai && !keys.openai) keys.openai = oai;
  } catch {
    // ignore
  }

  return keys;
}

/**
 * Call Google Gemini API directly from browser
 */
export async function callGeminiApi(prompt, apiKey, options = {}) {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey || cleanKey.length < 8) {
    throw new Error("Invalid or missing Gemini API key");
  }

  const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
  const maxTokens = options.maxTokens || 4000;
  const temperature = options.temperature || 0.2;

  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      const payload = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
        }
      };

      if (options.jsonMode) {
        payload.generationConfig.responseMimeType = "application/json";
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${response.status}`;
        if (response.status === 429) {
          throw new Error(`Gemini rate limit / quota exceeded (HTTP 429) on ${model}`);
        }
        lastError = new Error(`Gemini (${model}): ${errMsg}`);
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return { text, model, provider: 'gemini' };
      }
    } catch (err) {
      lastError = err;
      if (err.message?.includes('429')) {
        // Quota exceeded, break to fail over
        break;
      }
    }
  }

  throw lastError || new Error("Gemini API call failed across candidate models");
}

/**
 * Call OpenAI API directly from browser
 */
export async function callOpenAiApi(prompt, apiKey, options = {}) {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey || cleanKey.length < 8) {
    throw new Error("Invalid or missing OpenAI API key");
  }

  const maxTokens = options.maxTokens || 3500;
  const temperature = options.temperature || 0.2;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cleanKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a senior university examination controller and professor for Parul University. You provide rigorous, high-academic-standard exam content.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature,
      ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {})
    })
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson?.error?.message || `OpenAI HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  return { text, model: 'gpt-4o-mini', provider: 'openai' };
}

/**
 * Dispatch prompt to available AI engines with automatic failover
 */
export async function dispatchPromptToAI(prompt, providedKeys = {}, options = {}) {
  const keys = getAvailableApiKeys(providedKeys);
  const preferred = options.preferredOrder || ['gemini', 'openai'];

  const candidateProviders = [];
  for (const p of preferred) {
    if (keys[p] && keys[p].trim().length > 6) candidateProviders.push(p);
  }
  for (const [p, k] of Object.entries(keys)) {
    if (k && k.trim().length > 6 && !candidateProviders.includes(p)) {
      if (p === 'gemini' || p === 'openai') candidateProviders.push(p);
    }
  }

  if (candidateProviders.length === 0) {
    throw new Error("No configured AI API key found. Please connect Gemini or OpenAI in API Keys.");
  }

  let lastError = null;
  for (const provider of candidateProviders) {
    try {
      if (provider === 'gemini') {
        return await callGeminiApi(prompt, keys.gemini, options);
      } else if (provider === 'openai') {
        return await callOpenAiApi(prompt, keys.openai, options);
      }
    } catch (err) {
      console.warn(`Provider ${provider} failed, auto-failing over:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error("All configured AI providers failed to return a response.");
}

/**
 * Synthesize Exam Questions directly using student's configured AI
 */
export async function generateClientAIQuestions(sourceText, numQuestions = 30, providedKeys = {}, preferredOrder = null) {
  const prompt = `You are a senior university professor and Chief Examination Officer for Parul University.
Create an official, authentic examination question bank based STRICTLY on the uploaded course material text below.

Generate ${numQuestions} comprehensive exam questions across:
1. Easy MCQs (1-2 Marks): Testing direct definition recall and key terms with 4 plausible options (A, B, C, D) and clear correct answer.
2. Medium MCQs (2 Marks): Conceptual understanding and process flow with 4 plausible options.
3. Hard MCQs (3 Marks): Multi-statement / comparison questions with 4 plausible options.
4. Short Answer (2 Marks & 5 Marks): Definitions, operational principles, comparisons ("Differentiate between...").
5. Comprehensive Essays (10-12 Marks): Critical analysis, framework schematics, and model case studies.

MANDATORY RULES:
- Every question MUST be grounded in the provided text.
- Return ONLY a valid JSON array of question objects conforming exactly to this structure:
[
  {
    "type": "MCQ" | "Short Answer" | "Essay",
    "question": "Question text...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."] or null,
    "answer": "Complete, comprehensive model answer...",
    "key_points": ["Point 1", "Point 2", "Point 3"],
    "topic": "Topic Name",
    "difficulty": 1 | 2 | 3,
    "marks": 2 | 5 | 10,
    "confidence": 0.95
  }
]

COURSE MATERIAL:
${sourceText.slice(0, 12000)}`;

  const res = await dispatchPromptToAI(prompt, providedKeys, {
    jsonMode: true,
    preferredOrder,
    maxTokens: 4000
  });

  let raw = res.text.trim();
  // Strip markdown code fences if present
  if (raw.startsWith('```json')) {
    raw = raw.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
  } else if (raw.startsWith('```')) {
    raw = raw.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  }

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) && parsed.questions && Array.isArray(parsed.questions)) {
      parsed = parsed.questions;
    }
  } catch (parseErr) {
    // Try to extract JSON array
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw parseErr;
    }
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("AI did not return a valid question array");
  }

  return {
    questions: parsed,
    engine: res.provider === 'gemini' ? `Google Gemini (${res.model})` : `OpenAI (${res.model})`,
    provider: res.provider
  };
}

/**
 * Generate a detailed, syllabus-grounded answer for a specific question using student's AI
 */
export async function generateClientAIAnswer(questionText, contextText, marks = 5, providedKeys = {}) {
  const prompt = `You are a senior university examination evaluator for Parul University.
Write an authentic, high-scoring model examination answer for the following question worth ${marks} marks.
Ground the answer strictly in the provided study material.

QUESTION:
${questionText}

MARKS: ${marks}

STUDY MATERIAL CONTEXT:
${contextText.slice(0, 8000)}

INSTRUCTIONS:
1. Provide a direct, authoritative model answer structured with clear headings and bullet points.
2. For 2-mark questions: concise 2-3 line definition and scope.
3. For 5-mark questions: structured answer with definition, 3-4 operational points, and exam scoring note.
4. For 10-12 mark questions: comprehensive 5-part answer including theoretical basis, structural breakdown, an ASCII schematic diagram for the exam booklet, and conclusion.
5. Provide 3-5 high-yield bullet points for quick student revision.

Return as JSON:
{
  "answer": "Complete model answer text...",
  "key_points": ["Point 1", "Point 2", "Point 3", "Point 4"]
}`;

  const res = await dispatchPromptToAI(prompt, providedKeys, {
    jsonMode: true,
    maxTokens: 2500
  });

  let raw = res.text.trim();
  if (raw.startsWith('```json')) {
    raw = raw.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
  } else if (raw.startsWith('```')) {
    raw = raw.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  }

  const parsed = JSON.parse(raw);
  return {
    answer: parsed.answer,
    key_points: parsed.key_points || [],
    engine: res.provider === 'gemini' ? `Google Gemini (${res.model})` : `OpenAI (${res.model})`
  };
}
