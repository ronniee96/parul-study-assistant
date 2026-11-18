import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  IconCpu,
  IconZap,
  IconCheck,
  IconX
} from './StudentIcons';

const MODULES = [
  {
    id: 'reynolds',
    title: 'Fluid Dynamics: Reynolds Number',
    formula: 'Re = (ρ · v · D) / μ',
    desc: 'Pipe flow turbulence, Darcy friction factor, and pressure loss gradient.'
  },
  {
    id: 'heat_transfer',
    title: 'Thermodynamics: Heat Conduction',
    formula: 'Q = (k · A · ΔT) / L',
    desc: 'Fourier steady-state heat conduction rate, heat flux, and thermal resistance.'
  },
  {
    id: 'stress_strain',
    title: 'Mechanics: Axial Stress & Strain',
    formula: 'σ = F / A , ε = ΔL / L',
    desc: 'Normal tensile/compressive stress, elastic elongation, and factor of safety.'
  },
  {
    id: 'ohms_law',
    title: "Ohm's Law & DC Power",
    formula: 'V = I · R , P = V · I',
    desc: 'Current draw, active power dissipation, and cumulative energy consumption.'
  }
];

export default function EngineeringToolkit() {
  const [selectedModule, setSelectedModule] = useState('reynolds');

  // Input states with scientific engineering defaults
  const [reynoldsInputs, setReynoldsInputs] = useState({
    density: 1000.0,
    velocity: 2.5,
    diameter: 0.05,
    viscosity: 0.001,
    length: 10.0,
    roughness: 0.045
  });

  const [heatInputs, setHeatInputs] = useState({
    thermal_conductivity: 237.0, // Aluminum
    area: 2.0,
    temp_difference: 40.0,
    thickness: 0.05,
    hours: 1.0
  });

  const [stressInputs, setStressInputs] = useState({
    force: 25000.0,
    area: 150.0, // mm²
    length: 1.2, // meters
    elastic_modulus: 200.0, // GPa (Structural Steel)
    yield_strength: 250.0 // MPa
  });

  const [ohmsInputs, setOhmsInputs] = useState({
    voltage: 230.0,
    resistance: 10.0,
    hours: 24.0
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const getActiveInputs = () => {
    switch (selectedModule) {
      case 'reynolds':
        return reynoldsInputs;
      case 'heat_transfer':
        return heatInputs;
      case 'stress_strain':
        return stressInputs;
      case 'ohms_law':
        return ohmsInputs;
      default:
        return reynoldsInputs;
    }
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payloadInputs = getActiveInputs();

    try {
      const res = await fetch('/api/v1/student/engineering/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calculation_type: selectedModule,
          module: selectedModule,
          inputs: payloadInputs,
          parameters: payloadInputs
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        let msg = 'Engineering calculation failed.';
        if (typeof errJson.detail === 'string') {
          msg = errJson.detail;
        } else if (Array.isArray(errJson.detail)) {
          msg = errJson.detail.map(d => d.msg || JSON.stringify(d)).join('; ');
        } else if (errJson.detail && typeof errJson.detail === 'object') {
          msg = errJson.detail.msg || JSON.stringify(errJson.detail);
        }
        throw new Error(msg);
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

      {/* Module Selector Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {MODULES.map(m => {
          const isSelected = selectedModule === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setSelectedModule(m.id);
                setResult(null);
                setError(null);
              }}
              className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/60 shadow-xs'
                  : 'bg-white/80 dark:bg-[#1c1c1e]/80 border-black/[0.08] dark:border-white/[0.12] hover:border-black/20 dark:hover:border-white/25'
              }`}
            >
              <div>
                <div className={`text-xs font-semibold tracking-tight ${isSelected ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-[#1d1d1f] dark:text-[#f5f5f7]'}`}>
                  {m.title}
                </div>
                <div className="text-[11px] font-mono font-medium text-[#86868b] dark:text-[#98989d] mt-1">
                  {m.formula}
                </div>
              </div>
              <p className="text-[11px] text-[#86868b] dark:text-[#98989d] line-clamp-2 mt-2 leading-relaxed">
                {m.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Error alert with clean string message */}
      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <IconX className="w-4 h-4 shrink-0" />
          <span>{String(error)}</span>
        </div>
      )}

      {/* Interactive Parameter Form */}
      <form onSubmit={handleCalculate} className="space-y-4">
        {/* MODULE 1: FLUID DYNAMICS (REYNOLDS) */}
        {selectedModule === 'reynolds' && (
          <div className="p-5 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] space-y-3">
            <div className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider mb-2">
              Fluid Dynamics & Pipe Flow Parameters
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Fluid Density (ρ) [kg/m³]
                </label>
                <input
                  type="number"
                  step="any"
                  value={reynoldsInputs.density}
                  onChange={(e) => setReynoldsInputs({ ...reynoldsInputs, density: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Flow Velocity (v) [m/s]
                </label>
                <input
                  type="number"
                  step="any"
                  value={reynoldsInputs.velocity}
                  onChange={(e) => setReynoldsInputs({ ...reynoldsInputs, velocity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Pipe Diameter (D) [m]
                </label>
                <input
                  type="number"
                  step="any"
                  value={reynoldsInputs.diameter}
                  onChange={(e) => setReynoldsInputs({ ...reynoldsInputs, diameter: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Viscosity (μ) [Pa·s]
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={reynoldsInputs.viscosity}
                  onChange={(e) => setReynoldsInputs({ ...reynoldsInputs, viscosity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Pipe Length (L) [m]
                </label>
                <input
                  type="number"
                  step="any"
                  value={reynoldsInputs.length}
                  onChange={(e) => setReynoldsInputs({ ...reynoldsInputs, length: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Roughness (ε) [mm]
                </label>
                <input
                  type="number"
                  step="any"
                  value={reynoldsInputs.roughness}
                  onChange={(e) => setReynoldsInputs({ ...reynoldsInputs, roughness: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* MODULE 2: THERMODYNAMICS: HEAT CONDUCTION */}
        {selectedModule === 'heat_transfer' && (
          <div className="p-5 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider">
                Fourier Conduction & Thermal Transmission Parameters
              </span>
              <span className="text-[11px] text-[#86868b] dark:text-[#98989d]">
                Formula: Q = (k · A · ΔT) / L
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Conductivity (k) [W/m·K]
                </label>
                <input
                  type="number"
                  step="any"
                  value={heatInputs.thermal_conductivity}
                  onChange={(e) => setHeatInputs({ ...heatInputs, thermal_conductivity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
                <div className="flex gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => setHeatInputs({ ...heatInputs, thermal_conductivity: 237 })}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Al (237)
                  </button>
                  <span className="text-[10px] text-[#86868b]">•</span>
                  <button
                    type="button"
                    onClick={() => setHeatInputs({ ...heatInputs, thermal_conductivity: 401 })}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Cu (401)
                  </button>
                  <span className="text-[10px] text-[#86868b]">•</span>
                  <button
                    type="button"
                    onClick={() => setHeatInputs({ ...heatInputs, thermal_conductivity: 50 })}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Steel (50)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Surface Area (A) [m²]
                </label>
                <input
                  type="number"
                  step="any"
                  value={heatInputs.area}
                  onChange={(e) => setHeatInputs({ ...heatInputs, area: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Temp Delta (ΔT) [K / °C]
                </label>
                <input
                  type="number"
                  step="any"
                  value={heatInputs.temp_difference}
                  onChange={(e) => setHeatInputs({ ...heatInputs, temp_difference: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Wall Thickness (L) [m]
                </label>
                <input
                  type="number"
                  step="any"
                  value={heatInputs.thickness}
                  onChange={(e) => setHeatInputs({ ...heatInputs, thickness: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Duration (t) [hours]
                </label>
                <input
                  type="number"
                  step="any"
                  value={heatInputs.hours}
                  onChange={(e) => setHeatInputs({ ...heatInputs, hours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* MODULE 3: MECHANICS: AXIAL STRESS & STRAIN */}
        {selectedModule === 'stress_strain' && (
          <div className="p-5 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider">
                Axial Stress, Strain & Elongation Parameters
              </span>
              <span className="text-[11px] text-[#86868b] dark:text-[#98989d]">
                Formulas: σ = F / A , ε = ΔL / L₀
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Applied Force (F) [N]
                </label>
                <input
                  type="number"
                  step="any"
                  value={stressInputs.force}
                  onChange={(e) => setStressInputs({ ...stressInputs, force: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Cross Section (A) [mm²]
                </label>
                <input
                  type="number"
                  step="any"
                  value={stressInputs.area}
                  onChange={(e) => setStressInputs({ ...stressInputs, area: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Original Length (L₀) [m]
                </label>
                <input
                  type="number"
                  step="any"
                  value={stressInputs.length}
                  onChange={(e) => setStressInputs({ ...stressInputs, length: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Young's Modulus (E) [GPa]
                </label>
                <input
                  type="number"
                  step="any"
                  value={stressInputs.elastic_modulus}
                  onChange={(e) => setStressInputs({ ...stressInputs, elastic_modulus: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
                <div className="flex gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => setStressInputs({ ...stressInputs, elastic_modulus: 200, yield_strength: 250 })}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Steel (200)
                  </button>
                  <span className="text-[10px] text-[#86868b]">•</span>
                  <button
                    type="button"
                    onClick={() => setStressInputs({ ...stressInputs, elastic_modulus: 70, yield_strength: 95 })}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Al (70)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Yield Strength (σ_y) [MPa]
                </label>
                <input
                  type="number"
                  step="any"
                  value={stressInputs.yield_strength}
                  onChange={(e) => setStressInputs({ ...stressInputs, yield_strength: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* MODULE 4: OHM'S LAW & DC POWER */}
        {selectedModule === 'ohms_law' && (
          <div className="p-5 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/80 border border-black/[0.08] dark:border-white/[0.12] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider">
                Electrical Circuit & Power Dissipation Parameters
              </span>
              <span className="text-[11px] text-[#86868b] dark:text-[#98989d]">
                Formulas: V = I · R , P = V · I
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Applied Voltage (V) [Volts]
                </label>
                <input
                  type="number"
                  step="any"
                  value={ohmsInputs.voltage}
                  onChange={(e) => setOhmsInputs({ ...ohmsInputs, voltage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Resistive Load (R) [Ohms (Ω)]
                </label>
                <input
                  type="number"
                  step="any"
                  value={ohmsInputs.resistance}
                  onChange={(e) => setOhmsInputs({ ...ohmsInputs, resistance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#86868b] dark:text-[#98989d] mb-1">
                  Operation Duration (t) [hours]
                </label>
                <input
                  type="number"
                  step="any"
                  value={ohmsInputs.hours}
                  onChange={(e) => setOhmsInputs({ ...ohmsInputs, hours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.12] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
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
              <span>Executing Scientific Computation...</span>
            </>
          ) : (
            <>
              <IconCpu className="w-4 h-4" />
              <span>Compute Engineering Result</span>
            </>
          )}
        </button>
      </form>

      {/* Scientific Results Display */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-sm space-y-5"
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div>
              <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {result.calculation || 'Scientific Calculation Output'}
              </h3>
              <div className="text-xs font-mono text-[#86868b] dark:text-[#98989d] mt-0.5">
                Formula: {result.formula}
              </div>
            </div>
            {result.regime && (
              <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-xs flex items-center gap-1.5">
                <IconCheck className="w-3.5 h-3.5" />
                <span>{result.regime}</span>
              </span>
            )}
          </div>

          {/* Primary Numerical Hero Card */}
          <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] space-y-1.5">
            <div className="text-xs text-[#86868b] dark:text-[#98989d]">Primary Computed Value:</div>
            <div className="text-3xl font-mono font-bold text-[#ff9500] dark:text-[#ff9f0a] tracking-tight">
              {typeof result.result === 'object' ? JSON.stringify(result.result) : `${result.result} ${result.units || ''}`}
            </div>
            {result.explanation && (
              <p className="text-xs text-[#1d1d1f] dark:text-[#f5f5f7] leading-relaxed pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                {result.explanation}
              </p>
            )}
          </div>

          {/* Breakdown Grid */}
          {result.breakdown && Object.keys(result.breakdown).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider">
                Scientific Breakdown & Derived Values
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {Object.entries(result.breakdown).map(([k, v]) => (
                  <div key={k} className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08]">
                    <div className="text-[11px] text-[#86868b] dark:text-[#98989d] truncate">{k}</div>
                    <div className="text-xs font-mono font-bold text-[#1d1d1f] dark:text-[#f5f5f7] mt-1">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Derivation Steps */}
          {result.steps && result.steps.length > 0 && (
            <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] space-y-1.5">
              <h4 className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7] uppercase tracking-wider">
                Step-by-Step Derivation
              </h4>
              <ul className="space-y-1 text-xs font-mono text-[#86868b] dark:text-[#98989d]">
                {result.steps.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Engineering Assumptions */}
          {result.assumptions && result.assumptions.length > 0 && (
            <div className="text-[11px] text-[#86868b] dark:text-[#98989d]">
              <strong>Engineering Assumptions:</strong> {result.assumptions.join(' • ')}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
