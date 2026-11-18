import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  IconCpu,
  IconZap,
  IconX
} from './StudentIcons';

const MODULES = [
  { id: 'reynolds', label: 'Fluid Dynamics (Reynolds Number)', formula: 'Re = (ρ · v · D) / μ' },
  { id: 'bernoulli', label: 'Bernoulli Pressure Drop', formula: 'P₁ + ½ρv₁² = P₂ + ½ρv₂²' },
  { id: 'heat_transfer', label: 'Fourier Conduction Heat Rate', formula: 'q = -k · A · (dT/dx)' },
  { id: 'stress_strain', label: 'Hooke Tensile Stress & Strain', formula: 'σ = E · ε' }
];

export default function EngineeringToolkit() {
  const [selectedModule, setSelectedModule] = useState('reynolds');
  const [inputs, setInputs] = useState({
    density: 1000,
    velocity: 2.5,
    diameter: 0.05,
    viscosity: 0.001
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
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
          parameters: inputs
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Engineering calculation failed.');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Calculation error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Apple Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ff9500]/10 text-[#ff9500] dark:text-[#ff9f0a] flex items-center justify-center shrink-0">
              <IconCpu className="w-4 h-4" />
            </div>
            <span>Engineering Formulas & Physical Calculations</span>
          </h2>
          <p className="text-xs text-[#86868b] dark:text-[#98989d] mt-1">
            Solve fluid flow, thermodynamics, structural mechanics, and circuit physics with SI units and step-by-step derivations.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#ff9500]/10 border border-[#ff9500]/20 text-[#ff9500] dark:text-[#ff9f0a] text-xs font-medium">
          <IconZap className="w-4 h-4" />
          <span>SI Units Validated</span>
        </div>
      </div>

      {/* Module Selector Bento Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {MODULES.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => { setSelectedModule(m.id); setResult(null); }}
            className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
              selectedModule === m.id
                ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-sm'
                : 'bg-white/80 dark:bg-[#1c1c1e]/80 border-black/[0.08] dark:border-white/[0.12] text-[#1d1d1f] dark:text-[#f5f5f7] hover:border-black/20 dark:hover:border-white/25'
            }`}
          >
            <div className="text-xs font-semibold">{m.label}</div>
            <div className={`text-[11px] font-mono mt-1 ${selectedModule === m.id ? 'text-white/80' : 'text-[#86868b] dark:text-[#98989d]'}`}>
              {m.formula}
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <IconX className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form based on module */}
      <form onSubmit={handleCalculate} className="space-y-4">
        {selectedModule === 'reynolds' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                Fluid Density (ρ) [kg/m³]
              </label>
              <input
                type="number"
                value={inputs.density || 1000}
                onChange={(e) => setInputs({ ...inputs, density: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#ff9500]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                Flow Velocity (v) [m/s]
              </label>
              <input
                type="number"
                value={inputs.velocity || 2.5}
                onChange={(e) => setInputs({ ...inputs, velocity: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#ff9500]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                Pipe Diameter (D) [m]
              </label>
              <input
                type="number"
                value={inputs.diameter || 0.05}
                onChange={(e) => setInputs({ ...inputs, diameter: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#ff9500]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                Dynamic Viscosity (μ) [Pa·s]
              </label>
              <input
                type="number"
                value={inputs.viscosity || 0.001}
                step={0.0001}
                onChange={(e) => setInputs({ ...inputs, viscosity: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#ff9500]"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-[#ff9500] hover:bg-[#e68600] text-white font-medium text-sm shadow-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Calculating...</span>
            </>
          ) : (
            <>
              <IconCpu className="w-4 h-4" />
              <span>Compute Engineering Result</span>
            </>
          )}
        </button>
      </form>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Calculation Output & Regime Assessment
            </h3>
            <span className="px-3 py-1 rounded-full bg-[#ff9500]/10 border border-[#ff9500]/20 text-[#ff9500] dark:text-[#ff9f0a] font-semibold text-xs">
              {result.regime || 'Regime Evaluated'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
            <div className="text-xs text-[#86868b] dark:text-[#98989d]">Primary Numerical Value:</div>
            <div className="text-3xl font-mono font-bold text-[#ff9500] dark:text-[#ff9f0a] tracking-tight">
              {result.value !== undefined ? result.value : result.reynolds_number} {result.units || ''}
            </div>
            {result.explanation && (
              <p className="text-xs text-[#86868b] dark:text-[#98989d] leading-relaxed pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                {result.explanation}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
