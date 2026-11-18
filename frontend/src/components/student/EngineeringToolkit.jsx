import React, { useState } from 'react';
import { motion } from 'framer-motion';

const MODULES = [
  { id: 'reynolds', label: 'Fluid Dynamics: Reynolds Number', formula: 'Re = (ρ * v * D) / μ' },
  { id: 'heat', label: 'Thermodynamics: Heat Conduction', formula: 'Q = (k * A * ΔT) / L' },
  { id: 'stress', label: 'Mechanics: Axial Stress & Strain', formula: 'σ = F / A, ε = ΔL / L' },
  { id: 'electrical', label: "Ohm's Law & DC Power", formula: 'V = I * R, P = V * I' }
];

export default function EngineeringToolkit() {
  const [selectedModule, setSelectedModule] = useState('reynolds');
  const [inputs, setInputs] = useState({
    density: 1000,
    velocity: 2.5,
    diameter: 0.05,
    viscosity: 0.001
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCalculate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/student/engineering/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: selectedModule,
          inputs: inputs
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Calculation failed.');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Error executing engineering formula.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200/40 dark:border-neutral-800/60">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>⚙️</span>
            <span>Engineering Formulas & Physical Calculations</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Solve fluid flow, thermodynamics, structural mechanics, and circuit physics with SI units and step-by-step derivations.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <span>📐</span>
          <span>SI Units Validated</span>
        </div>
      </div>

      {/* Module Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {MODULES.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => { setSelectedModule(m.id); setResult(null); }}
            className={`p-3 rounded-xl text-left border transition ${
              selectedModule === m.id
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                : 'bg-white/40 dark:bg-black/30 border-neutral-200/80 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
            }`}
          >
            <div className="text-xs font-bold">{m.label}</div>
            <div className="text-[11px] font-mono text-neutral-400 mt-1">{m.formula}</div>
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/30 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <span>✕</span>
          <span>{error}</span>
        </div>
      )}

      {/* Form based on module */}
      <form onSubmit={handleCalculate} className="space-y-4">
        {selectedModule === 'reynolds' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Fluid Density (ρ) [kg/m³]
              </label>
              <input
                type="number"
                value={inputs.density || 1000}
                onChange={(e) => setInputs({ ...inputs, density: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Flow Velocity (v) [m/s]
              </label>
              <input
                type="number"
                value={inputs.velocity || 2.5}
                onChange={(e) => setInputs({ ...inputs, velocity: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Pipe Diameter (D) [m]
              </label>
              <input
                type="number"
                value={inputs.diameter || 0.05}
                onChange={(e) => setInputs({ ...inputs, diameter: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Dynamic Viscosity (μ) [Pa·s]
              </label>
              <input
                type="number"
                value={inputs.viscosity || 0.001}
                step={0.0001}
                onChange={(e) => setInputs({ ...inputs, viscosity: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white/50 dark:bg-black/30 border border-neutral-200/80 dark:border-neutral-800 text-xs"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-white font-semibold text-sm shadow-lg shadow-amber-500/20 transition flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Calculating...</span>
            </>
          ) : (
            <>
              <span>⚙️</span>
              <span>Compute Engineering Result</span>
            </>
          )}
        </button>
      </form>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-white/60 dark:bg-black/40 border border-neutral-200/80 dark:border-neutral-800 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Calculation Output & Regime Assessment
            </h3>
            <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs">
              {result.regime || 'Regime Evaluated'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="text-xs text-neutral-400">Primary Numerical Value:</div>
            <div className="text-3xl font-mono font-extrabold text-amber-400">
              {result.value !== undefined ? result.value : result.reynolds_number} {result.units || ''}
            </div>
            {result.explanation && (
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed pt-2 border-t border-neutral-200 dark:border-neutral-800">
                {result.explanation}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
