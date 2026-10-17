import React from 'react';

export default function PrivacyPolicy({ onBack }) {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm text-gray-800 dark:text-gray-200">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
          <p className="text-xs text-gray-500 mt-1">Effective Date: October 2026 | Parul Study Assistant</p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-semibold cursor-pointer"
          >
            Back to Application
          </button>
        )}
      </div>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">1. Educational Data Processing & Architecture</h2>
          <p>
            Parul Study Assistant is an academic companion designed for exam preparation, active recall, and syllabus analysis.
            We prioritize student privacy and data sovereignty by designing all primary text extraction and question generation to execute locally within the student's browser session.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">2. Document Storage & Session Ephemerality</h2>
          <p>
            User-uploaded files (PDFs, DOCX, presentation slides, notes) are stored in client memory for the active study session.
            The platform does not sell, license, or index student documents into public training corpora.
            When you click "Reset Session" or close your browser tab, uploaded documents and generated questions in ephemeral memory are cleared.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">3. Third-Party AI API Keys & Provider Isolation</h2>
          <p>
            Students may optionally configure their own API credentials (e.g., Google Gemini, OpenAI, Anthropic, Groq).
            These credentials are saved exclusively within your local browser storage (<code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono text-xs">localStorage</code>).
            API keys are never transmitted to our servers or stored on remote databases. All requests utilizing user keys communicate directly with the respective AI provider under the user's account.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">4. Historical Exam Papers & Public Repository Cache</h2>
          <p>
            The platform accesses publicly available institutional metadata and historical university question papers from official institutional repository endpoints (e.g. Parul University DSpace).
            These public examination structures are cached strictly separated from student private uploads.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">5. Data Retention & Deletion Rights</h2>
          <p>
            Students have full control over their study data. Using the Settings tab, you can inspect your active session data, download all generated question papers and model answers, or permanently purge all local storage keys at any time.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">6. Contact & Academic Inquiries</h2>
          <p>
            For privacy inquiries, data requests, or academic compliance questions, contact the administration through the feedback channel in the Settings tab.
          </p>
        </section>
      </div>
    </div>
  );
}
