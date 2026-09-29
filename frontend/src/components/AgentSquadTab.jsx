import React from 'react';

export default function AgentSquadTab({ appState = {}, setActiveTab }) {
  const result = appState.pipelineData;
  const reviewStatus = result?.adversarial_review_status || 'not_run';
  const reviewedCount = result?.adversarial_reviewed_count || 0;
  const reviewedLabel = reviewStatus === 'complete'
    ? `AI reviewed ${reviewedCount} candidates`
    : reviewStatus === 'partial'
      ? `AI reviewed ${reviewedCount} candidates; review was partial`
      : 'No AI adversarial review completed';

  return (
    <div className="flex flex-col gap-6 h-full p-2 md:p-4 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Exam evidence review</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Review status and questions below come from the last exam-pipeline run. Review roles are handled by the configured provider; this page does not simulate separate agents.
        </p>
      </div>

      {!result ? (
        <div className="glass-card p-8 rounded-2xl border border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-300">No exam evidence pipeline has been run for this study session.</p>
          <button onClick={() => setActiveTab?.('predictor')} className="mt-4 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-bold">
            Open exam evidence pipeline
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Candidates', result.candidate_universe_count],
              ['Top evidence pool', result.top_200_count],
              ['Retained candidates', result.top_100_count],
              ['Final study set', result.final_top_25_count],
            ].map(([label, count]) => <div key={label} className="glass-card p-4 rounded-2xl border"><span className="block text-xs text-gray-500">{label}</span><strong className="text-xl">{count ?? 0}</strong></div>)}
          </div>

          <section className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <h3 className="font-bold">AI adversarial review</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{reviewedLabel}</p>
            {reviewStatus !== 'complete' && <p className="mt-2 text-xs text-gray-500">Configure a supported provider key and rerun the pipeline to request an AI review.</p>}
          </section>

          <div className="flex flex-col gap-3">
            {(result.top_25 || []).slice(0, 10).map((question, index) => (
              <article key={question.id ?? index} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold">{index + 1}. {question.question}</h3>
                  <span className="text-xs text-gray-500">Source evidence: {Math.round((question.evidence_score || 0) * 100)}/100</span>
                </div>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{question.current_material_evidence || 'No material evidence detail returned.'}</p>
                {question.adversarial_reviewed && (
                  <div className="mt-3 grid md:grid-cols-2 gap-3 text-xs">
                    <div><strong>Supporting:</strong> {(question.pros_evidence || []).join(' ') || 'No supporting note returned.'}</div>
                    <div><strong>Counter-evidence:</strong> {(question.cons_evidence || []).join(' ') || 'No counter-evidence returned.'}</div>
                  </div>
                )}
                {question.risk_analysis && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Risk: {question.risk_analysis}</p>}
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
