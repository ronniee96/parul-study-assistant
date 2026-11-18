/**
 * Student Academic Toolkit - Utility Helpers
 * Standardizes API error formatting to guarantee human-readable errors
 * and prevent raw Pydantic validation errors from ever showing as "[object Object]".
 * Includes zero-latency local scientific calculation fallbacks.
 */

export function formatApiError(errJson, fallback = 'Operation failed.') {
  if (!errJson) return fallback;

  // Check detail, message, or error properties
  const detail = errJson.detail || errJson.message || errJson.error;
  if (!detail) return fallback;

  // If already a clean string
  if (typeof detail === 'string') return detail;

  // If array of validation errors (Pydantic / FastAPI default)
  if (Array.isArray(detail)) {
    const messages = detail
      .map(item => {
        if (!item) return '';
        if (typeof item === 'string') return item;
        if (typeof item === 'object') {
          // Format field name and error message
          const field = Array.isArray(item.loc) ? item.loc.slice(1).join('.') : '';
          const msg = item.msg || item.message || JSON.stringify(item);
          return field ? `${field}: ${msg}` : msg;
        }
        return String(item);
      })
      .filter(Boolean);

    return messages.length > 0 ? messages.join('; ') : fallback;
  }

  // If single object
  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail);
  }

  return String(detail);
}

/**
 * High-performance client-side CSV Statistics Engine
 * Computes descriptive statistics (count, min, max, mean, median, std, variance, sum)
 * and generates spreadsheet formulas.
 */
export function computeLocalCsvAnalytics(rawCsv) {
  if (!rawCsv || typeof rawCsv !== 'string' || !rawCsv.trim()) {
    throw new Error('CSV text content is empty.');
  }

  // Robust line splitting
  const lines = rawCsv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error('CSV dataset must contain at least 1 header row and 1 data row.');
  }

  // Helper to split CSV row respecting simple quotes
  const parseLine = (line) => {
    const entries = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' || ch === "'") {
        inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        entries.push(cur.trim().replace(/^["']|["']$/g, ''));
        cur = '';
      } else {
        cur += ch;
      }
    }
    entries.push(cur.trim().replace(/^["']|["']$/g, ''));
    return entries;
  };

  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parsedRow = parseLine(lines[i]);
    if (parsedRow.some(val => val !== '')) {
      rows.push(parsedRow);
    }
  }

  if (rows.length === 0) {
    throw new Error('No data rows found in CSV.');
  }

  const columnStats = {};
  const numericCols = [];

  headers.forEach((colName, colIdx) => {
    const rawVals = rows.map(r => (r[colIdx] !== undefined ? r[colIdx] : ''));
    const numVals = [];

    rawVals.forEach(v => {
      const clean = String(v).replace(/[^\d.-]/g, '');
      const parsed = parseFloat(clean);
      if (!isNaN(parsed) && isFinite(parsed) && clean !== '') {
        numVals.push(parsed);
      }
    });

    // If at least 40% of rows are numeric or at least 2 numbers present
    if (numVals.length > 0 && (numVals.length >= rows.length * 0.4 || numVals.length >= 2)) {
      numericCols.push(colName);
      const sorted = [...numVals].sort((a, b) => a - b);
      const n = numVals.length;
      const sumVal = numVals.reduce((acc, x) => acc + x, 0);
      const meanVal = sumVal / n;
      const variance = n > 1
        ? numVals.reduce((acc, x) => acc + Math.pow(x - meanVal, 2), 0) / (n - 1)
        : 0;
      const stdDev = Math.sqrt(variance);
      const medianVal = n % 2 === 1
        ? sorted[Math.floor(n / 2)]
        : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
      const minVal = Math.min(...numVals);
      const maxVal = Math.max(...numVals);

      columnStats[colName] = {
        type: 'numeric',
        count: n,
        min: Number(minVal.toFixed(2)),
        max: Number(maxVal.toFixed(2)),
        mean: Number(meanVal.toFixed(2)),
        median: Number(medianVal.toFixed(2)),
        std: Number(stdDev.toFixed(2)),
        variance: Number(variance.toFixed(2)),
        sum: Number(sumVal.toFixed(2))
      };
    } else {
      columnStats[colName] = {
        type: 'categorical',
        count: rawVals.length,
        unique_values: new Set(rawVals).size,
        min: '-',
        max: '-',
        mean: '-',
        median: '-',
        std: '-',
        variance: '-',
        sum: '-'
      };
    }
  });

  const firstNumeric = numericCols[0] || headers[0] || 'A';
  const rowCount = rows.length;
  const suggestedFormulas = [
    { formula: `=AVERAGE(B2:B${rowCount + 1})`, explanation: `Compute arithmetic mean for ${firstNumeric} series.` },
    { formula: `=STDEV.S(B2:B${rowCount + 1})`, explanation: `Calculate sample standard deviation for ${firstNumeric}.` },
    { formula: `=MEDIAN(B2:B${rowCount + 1})`, explanation: `Compute 50th percentile median distribution.` },
    { formula: `=CORREL(B2:B${rowCount + 1}, C2:C${rowCount + 1})`, explanation: 'Evaluate Pearson correlation coefficient between numeric pairs.' },
    { formula: `=QUARTILE.INC(B2:B${rowCount + 1}, 3)`, explanation: `Compute 75th percentile upper quartile for ${firstNumeric}.` }
  ];

  return {
    id: `sheet_${Math.random().toString(36).substring(2, 10)}`,
    filename: 'data_sample.csv',
    row_count: rows.length,
    column_count: headers.length,
    headers,
    numeric_columns: numericCols,
    sample_preview: rows.slice(0, 8),
    statistics: columnStats,
    summary_stats: columnStats,
    suggested_formulas: suggestedFormulas
  };
}

/**
 * High-precision client-side Engineering Scientific Calculation Fallback
 */
export function computeLocalEngineeringFormula(module, inputs = {}) {
  switch (module) {
    case 'reynolds': {
      const rho = parseFloat(inputs.density ?? 998.0);
      const v = parseFloat(inputs.velocity ?? 2.5);
      const D = parseFloat(inputs.diameter ?? 0.05);
      const mu = parseFloat(inputs.viscosity ?? 0.001002);
      const L = parseFloat(inputs.pipe_length ?? 50.0);
      const eps = parseFloat(inputs.roughness ?? 0.000045);

      if (mu <= 0 || D <= 0) throw new Error('Dynamic viscosity and diameter must be positive.');
      const Re = (rho * v * D) / mu;

      let regime = 'Laminar Flow (Re < 2300)';
      let f = 64.0 / Math.max(1, Re);
      if (Re >= 4000) {
        regime = 'Fully Turbulent Flow (Re > 4000)';
        const term = eps / (3.7 * D) + 5.74 / Math.pow(Re, 0.9);
        f = 0.25 / Math.pow(Math.log10(term), 2);
      } else if (Re >= 2300) {
        regime = 'Transitional Flow (2300 <= Re <= 4000)';
        f = 0.032;
      }

      const deltaP = f * (L / D) * (0.5 * rho * Math.pow(v, 2));
      const A = (Math.PI * Math.pow(D, 2)) / 4.0;
      const Q = v * A;
      const P_pump = Q * deltaP;

      return {
        status: 'success',
        calculation: 'Reynolds Number & Pipe Flow Dynamics',
        module: 'reynolds',
        formula: 'Re = (ρ · v · D) / μ',
        result: Math.round(Re * 10) / 10,
        value: Math.round(Re * 10) / 10,
        reynolds_number: Math.round(Re * 10) / 10,
        units: 'Dimensionless',
        regime,
        breakdown: {
          'Reynolds Number (Re)': `${Re.toLocaleString(undefined, { maximumFractionDigits: 1 })} (Dimensionless)`,
          'Flow Regime': regime,
          'Darcy Friction Factor (f)': f.toFixed(5),
          'Pressure Drop (ΔP)': `${(deltaP / 1000).toFixed(2)} kPa (${deltaP.toFixed(1)} Pa over ${L}m)`,
          'Volumetric Flow Rate (Q)': `${(Q * 1000).toFixed(2)} L/s (${Q.toFixed(5)} m³/s)`,
          'Hydraulic Pumping Power': `${P_pump.toFixed(1)} W (${(P_pump / 745.7).toFixed(3)} HP)`
        },
        steps: [
          '1. Governing Formula: Re = (ρ · v · D) / μ',
          `2. Substitution: (${rho} kg/m³ × ${v} m/s × ${D} m) / ${mu} Pa·s`,
          `3. Computed Reynolds Number: ${Re.toLocaleString(undefined, { maximumFractionDigits: 1 })}`,
          `4. Regime Classification: ${regime}`,
          `5. Darcy friction factor f = ${f.toFixed(5)}`,
          `6. Pipe Head Loss ΔP = ${deltaP.toFixed(1)} Pa across ${L}m`
        ],
        explanation: `With Re = ${Math.round(Re).toLocaleString()}, momentum forces ${Re > 4000 ? 'overcome' : 'are balanced by'} viscous resistance.`,
        assumptions: ['Incompressible Newtonian fluid', 'Fully developed flow in circular pipe', 'Steady-state conditions']
      };
    }

    case 'heat_transfer': {
      const k = parseFloat(inputs.thermal_conductivity ?? 205.0);
      const A = parseFloat(inputs.area ?? 2.5);
      const deltaT = parseFloat(inputs.temp_difference ?? 50.0);
      const L = parseFloat(inputs.thickness ?? 0.02);

      if (L <= 0 || A <= 0) throw new Error('Material thickness and area must be positive.');
      const Q = (k * A * deltaT) / L;
      const q_flux = Q / A;
      const R_th = L / (k * A);
      const energy_kwh = (Q * 1.0) / 1000.0;

      return {
        status: 'success',
        calculation: 'Fourier 1D Steady-State Heat Conduction',
        module: 'heat_transfer',
        formula: 'Q = (k · A · ΔT) / L',
        result: Math.round(Q * 100) / 100,
        value: Math.round(Q * 100) / 100,
        units: 'W (Watts)',
        regime: 'Fourier Steady-State Thermal Conduction',
        breakdown: {
          'Conduction Heat Rate (Q)': `${Q.toLocaleString(undefined, { maximumFractionDigits: 1 })} W (${(Q / 1000).toFixed(2)} kW)`,
          'Conductive Heat Flux (q\'\')': `${q_flux.toLocaleString(undefined, { maximumFractionDigits: 1 })} W/m²`,
          'Thermal Resistance (R_th)': `${R_th.toFixed(6)} K/W`,
          'Thermal Energy Transferred': `${energy_kwh.toFixed(2)} kWh (over 1.0 hr)`,
          'Thermal Conductivity (k)': `${k} W/(m·K)`
        },
        steps: [
          '1. Fourier Formulation: Q = (k · A · ΔT) / L',
          `2. Substitute: (${k} W/m·K × ${A} m² × ${deltaT} K) / ${L} m`,
          `3. Conductive Heat Rate Q = ${Q.toLocaleString(undefined, { maximumFractionDigits: 1 })} Watts`,
          `4. Heat Flux q'' = Q / A = ${q_flux.toLocaleString(undefined, { maximumFractionDigits: 1 })} W/m²`,
          `5. Conductive Resistance R_th = ${R_th.toFixed(6)} K/W`
        ],
        explanation: `Under thermal gradient of ${deltaT} K across ${L * 1000}mm material (k=${k} W/m·K), conduction transfers ${(Q / 1000).toFixed(2)} kW.`,
        assumptions: ['One-dimensional steady-state conduction', 'Homogeneous isotropic material with constant k', 'Zero internal heat generation']
      };
    }

    case 'stress_strain': {
      const F = parseFloat(inputs.force ?? 25000.0);
      const A = parseFloat(inputs.area ?? 0.0005);
      const L0 = parseFloat(inputs.original_length ?? 1.2);
      const E_gpa = parseFloat(inputs.elastic_modulus ?? 200.0);
      const sigma_y = parseFloat(inputs.yield_strength ?? 250.0);

      if (A <= 0 || L0 <= 0 || E_gpa <= 0) throw new Error('Area, length, and modulus must be positive.');
      const sigma_pa = F / A;
      const sigma_mpa = sigma_pa / 1e6;
      const E_pa = E_gpa * 1e9;
      const epsilon = sigma_pa / E_pa;
      const deltaL = epsilon * L0;
      const deltaL_mm = deltaL * 1000.0;
      const FoS = sigma_y / Math.max(0.001, sigma_mpa);
      const U_energy = 0.5 * sigma_pa * epsilon * (A * L0);

      return {
        status: 'success',
        calculation: 'Axial Stress, Strain & Elastic Elongation',
        module: 'stress_strain',
        formula: 'σ = F / A,  ε = ΔL / L,  E = σ / ε',
        result: Math.round(sigma_mpa * 100) / 100,
        value: Math.round(sigma_mpa * 100) / 100,
        units: 'MPa',
        regime: FoS >= 1.0 ? 'Elastic Safe Region' : 'Plastic Deformation Risk',
        breakdown: {
          'Normal Axial Stress (σ)': `${sigma_mpa.toFixed(2)} MPa (${(sigma_pa / 1000).toFixed(1)} kPa)`,
          'Engineering Strain (ε)': `${epsilon.toExponential(4)} (${(epsilon * 100).toFixed(4)}%)`,
          'Total Elongation (ΔL)': `${deltaL_mm.toFixed(3)} mm (${(deltaL * 1e6).toFixed(1)} μm)`,
          'Factor of Safety (FoS)': `${FoS.toFixed(2)} (Yield: ${sigma_y} MPa)`,
          'Strain Energy Stored (U)': `${U_energy.toFixed(3)} Joules`
        },
        steps: [
          '1. Axial Stress: σ = F / A',
          `2. Substitute: ${F} N / ${A} m² = ${sigma_mpa.toFixed(2)} MPa`,
          `3. Hooke's Law Strain: ε = σ / E = ${epsilon.toExponential(4)}`,
          `4. Elongation: ΔL = ε × L₀ = ${deltaL_mm.toFixed(3)} mm`,
          `5. Factor of Safety: FoS = σ_yield / σ = ${FoS.toFixed(2)}`
        ],
        explanation: `Under tensile load ${F} N, normal stress reaches ${sigma_mpa.toFixed(2)} MPa (${FoS >= 1 ? 'within elastic limit' : 'exceeds yield'}).`,
        assumptions: ['Uniaxial tensile loading along centroidal axis', 'Linear elastic behavior (Hooke\'s Law holds)', 'Homogeneous prismatic cross-section']
      };
    }

    case 'ohms_law': {
      const V = parseFloat(inputs.voltage ?? 230.0);
      const R = parseFloat(inputs.resistance ?? 46.0);
      const hours = parseFloat(inputs.operating_hours ?? 24.0);

      if (R <= 0) throw new Error('Resistance must be positive.');
      const I = V / R;
      const P = V * I;
      const energy_kwh = (P * hours) / 1000.0;
      const heat_btu = P * 3.412142;

      return {
        status: 'success',
        calculation: "Ohm's Law & Electrical Power Dissipation",
        module: 'ohms_law',
        formula: 'I = V / R,  P = V · I = I² · R',
        result: Math.round(I * 100) / 100,
        value: Math.round(I * 100) / 100,
        units: 'A (Amperes)',
        regime: 'Ohmic Linear Conduction',
        breakdown: {
          'Current Draw (I)': `${I.toFixed(2)} A`,
          'Power Dissipation (P)': `${P.toLocaleString(undefined, { maximumFractionDigits: 1 })} W (${(P / 1000).toFixed(2)} kW)`,
          'Energy Consumed': `${energy_kwh.toFixed(2)} kWh (${(energy_kwh * 3.6).toFixed(1)} MJ over ${hours}h)`,
          'Heat Generation Rate': `${heat_btu.toLocaleString(undefined, { maximumFractionDigits: 1 })} BTU/hr`,
          'Equivalent Conductance (G)': `${(1.0 / R).toFixed(4)} S (Siemens)`
        },
        steps: [
          '1. Ohm\'s Law: I = V / R',
          `2. Substitute: ${V} V / ${R} Ω = ${I.toFixed(2)} A`,
          `3. Joule Heating: P = V × I = ${P.toLocaleString(undefined, { maximumFractionDigits: 1 })} W`,
          `4. Energy: E = P × t = ${energy_kwh.toFixed(2)} kWh`,
          `5. Thermal Dissipation: ${heat_btu.toLocaleString(undefined, { maximumFractionDigits: 1 })} BTU/hr`
        ],
        explanation: `At potential ${V} V across resistance ${R} Ω, steady current of ${I.toFixed(2)} A dissipates ${(P / 1000).toFixed(2)} kW.`,
        assumptions: ['Purely resistive load (DC or unity power factor AC)', 'Constant resistance independent of temperature', 'Negligible lead impedance']
      };
    }

    default:
      throw new Error(`Unknown engineering module: ${module}`);
  }
}

/**
 * Dynamic 3NF/BCNF Relational Database Schema Generator
 * Supports PostgreSQL, MySQL, and SQLite dialects with full referential integrity.
 */
export function computeLocalDatabaseSchema(requirements = '', engine = 'postgresql', normLevel = '3NF') {
  const req = String(requirements || '').toLowerCase();
  const targetEngine = String(engine || 'postgresql').toLowerCase();
  const isPostgres = targetEngine.includes('postgres');
  const isMysql = targetEngine.includes('mysql');
  const isSqlite = targetEngine.includes('sqlite');

  const pkInt = isPostgres
    ? 'SERIAL PRIMARY KEY'
    : isMysql
    ? 'INT AUTO_INCREMENT PRIMARY KEY'
    : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const tsType = isPostgres
    ? 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    : isMysql
    ? 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    : 'TEXT DEFAULT CURRENT_TIMESTAMP';
  const decType = (p = 10, s = 2) =>
    isSqlite ? 'REAL' : isPostgres ? `NUMERIC(${p},${s})` : `DECIMAL(${p},${s})`;
  const tableSuffix = isMysql ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;' : ';';

  let title = 'Relational Academic Schema';
  let tables = [];
  let ddl = '';
  let notes = [];

  if (
    req.includes('book') ||
    req.includes('commerce') ||
    req.includes('order') ||
    req.includes('shop') ||
    req.includes('store') ||
    req.includes('coupon') ||
    req.includes('cart')
  ) {
    title = 'Academic E-Commerce Bookstore Schema';
    tables = ['users', 'categories', 'textbooks', 'coupons', 'orders', 'order_items', 'course_reviews'];
    ddl = `-- Database Schema: ${title}
-- Target Dialect: ${targetEngine.toUpperCase()}
-- Normalization Form: ${normLevel} (Boyce-Codd / Third Normal Form)

-- 1. Users / Customers Entity
CREATE TABLE users (
    user_id ${pkInt},
    email VARCHAR(120) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    student_id VARCHAR(30) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'faculty', 'admin')),
    created_at ${tsType}
)${tableSuffix}

-- 2. Category Taxonomy
CREATE TABLE categories (
    category_id ${pkInt},
    name VARCHAR(80) NOT NULL UNIQUE,
    slug VARCHAR(80) NOT NULL UNIQUE,
    description TEXT
)${tableSuffix}

-- 3. Textbooks / Catalog Entity (1NF Atomic Attributes)
CREATE TABLE textbooks (
    textbook_id ${pkInt},
    title VARCHAR(200) NOT NULL,
    isbn VARCHAR(20) NOT NULL UNIQUE,
    author VARCHAR(120) NOT NULL,
    edition INT DEFAULT 1,
    price ${decType(10, 2)} NOT NULL CHECK (price >= 0),
    stock_quantity INT DEFAULT 0 CHECK (stock_quantity >= 0),
    category_id INT REFERENCES categories(category_id) ON DELETE RESTRICT,
    created_at ${tsType}
)${tableSuffix}

-- 4. Discount Coupons Entity
CREATE TABLE coupons (
    coupon_id ${pkInt},
    code VARCHAR(30) NOT NULL UNIQUE,
    discount_percent ${decType(5, 2)} NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
    min_order_amount ${decType(10, 2)} DEFAULT 0.00,
    valid_until ${tsType},
    is_active BOOLEAN DEFAULT TRUE
)${tableSuffix}

-- 5. Orders Header Entity (2NF/3NF Order Summary)
CREATE TABLE orders (
    order_id ${pkInt},
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    coupon_id INT REFERENCES coupons(coupon_id) ON DELETE SET NULL,
    order_status VARCHAR(25) DEFAULT 'pending' CHECK (order_status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
    subtotal ${decType(10, 2)} NOT NULL,
    discount_amount ${decType(10, 2)} DEFAULT 0.00,
    total_amount ${decType(10, 2)} NOT NULL,
    created_at ${tsType}
)${tableSuffix}

-- 6. Order Line Items Entity (Resolves M:N Between Orders & Textbooks)
CREATE TABLE order_items (
    order_item_id ${pkInt},
    order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    textbook_id INT NOT NULL REFERENCES textbooks(textbook_id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price ${decType(10, 2)} NOT NULL,
    UNIQUE (order_id, textbook_id)
)${tableSuffix}

-- 7. Course Reviews Entity
CREATE TABLE course_reviews (
    review_id ${pkInt},
    textbook_id INT NOT NULL REFERENCES textbooks(textbook_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at ${tsType},
    UNIQUE (textbook_id, user_id)
)${tableSuffix}

-- Performance & Foreign Key Indexes
CREATE INDEX idx_textbook_category ON textbooks(category_id);
CREATE INDEX idx_order_user ON orders(user_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_reviews_book ON course_reviews(textbook_id);`;

    notes = [
      '1NF Compliance: All attributes contain strictly atomic scalar values; multi-item orders decomposed into dedicated order_items relation.',
      '2NF Compliance: All non-key attributes in order_items (quantity, unit_price) are fully functionally dependent on the complete candidate key.',
      '3NF / BCNF Compliance: Transitive dependencies removed; discount rules isolated into coupons table, and user profiles isolated from order headers.',
      'Referential Integrity: Foreign keys configured with ON DELETE CASCADE for dependent order items and reviews, with ON DELETE RESTRICT preventing textbook catalog orphan records.'
    ];
  } else if (
    req.includes('hospital') ||
    req.includes('clinic') ||
    req.includes('patient') ||
    req.includes('doctor')
  ) {
    title = 'Clinical Health & Patient Management Schema';
    tables = ['departments', 'doctors', 'patients', 'appointments', 'prescriptions', 'billings'];
    ddl = `-- Database Schema: ${title}
-- Target Dialect: ${targetEngine.toUpperCase()}
-- Normalization Form: ${normLevel} (3NF / BCNF)

CREATE TABLE departments (
    department_id ${pkInt},
    name VARCHAR(100) NOT NULL UNIQUE,
    head_doctor VARCHAR(100)
)${tableSuffix}

CREATE TABLE doctors (
    doctor_id ${pkInt},
    full_name VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    department_id INT REFERENCES departments(department_id),
    consultation_fee ${decType(10, 2)} NOT NULL
)${tableSuffix}

CREATE TABLE patients (
    patient_id ${pkInt},
    full_name VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    blood_group VARCHAR(5),
    emergency_contact VARCHAR(20) NOT NULL,
    created_at ${tsType}
)${tableSuffix}

CREATE TABLE appointments (
    appointment_id ${pkInt},
    patient_id INT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    doctor_id INT NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    appointment_time ${tsType} NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    UNIQUE (doctor_id, appointment_time)
)${tableSuffix}

CREATE TABLE prescriptions (
    prescription_id ${pkInt},
    appointment_id INT NOT NULL REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    medication_name VARCHAR(150) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    duration_days INT NOT NULL CHECK (duration_days > 0)
)${tableSuffix}

CREATE TABLE billings (
    bill_id ${pkInt},
    appointment_id INT NOT NULL UNIQUE REFERENCES appointments(appointment_id),
    total_amount ${decType(10, 2)} NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    paid_at ${tsType}
)${tableSuffix}

CREATE INDEX idx_appointment_patient ON appointments(patient_id);
CREATE INDEX idx_appointment_doctor ON appointments(doctor_id);`;

    notes = [
      '1NF: Scalar atomic fields with unique primary identifiers for all entities.',
      '2NF: Zero partial dependencies on composite keys.',
      '3NF: Doctor consultation fee separated from appointment schedules; billing separated from clinical diagnoses.',
      'Concurrency: Unique constraint on (doctor_id, appointment_time) guarantees zero double-booking at DB level.'
    ];
  } else {
    // Academic course enrollment system
    title = 'Academic Course Enrollment & Syllabus Platform';
    tables = ['departments', 'faculty', 'students', 'courses', 'classrooms', 'course_schedules', 'enrollments'];
    ddl = `-- Database Schema: ${title}
-- Target Dialect: ${targetEngine.toUpperCase()}
-- Normalization Form: ${normLevel} (3NF / BCNF)

CREATE TABLE departments (
    department_id ${pkInt},
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    building VARCHAR(50),
    created_at ${tsType}
)${tableSuffix}

CREATE TABLE faculty (
    faculty_id VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    department_id INT REFERENCES departments(department_id) ON DELETE SET NULL,
    designation VARCHAR(50) DEFAULT 'Assistant Professor',
    created_at ${tsType}
)${tableSuffix}

CREATE TABLE students (
    student_id VARCHAR(20) PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    department_id INT REFERENCES departments(department_id) ON DELETE SET NULL,
    admission_year INT NOT NULL,
    current_cgpa ${decType(4, 2)} DEFAULT 0.00,
    created_at ${tsType}
)${tableSuffix}

CREATE TABLE courses (
    course_code VARCHAR(15) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    credits INT NOT NULL CHECK (credits > 0),
    department_id INT REFERENCES departments(department_id),
    faculty_id VARCHAR(20) REFERENCES faculty(faculty_id) ON DELETE SET NULL
)${tableSuffix}

CREATE TABLE classrooms (
    room_id VARCHAR(20) PRIMARY KEY,
    building VARCHAR(50) NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0)
)${tableSuffix}

CREATE TABLE course_schedules (
    schedule_id ${pkInt},
    course_code VARCHAR(15) NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,
    room_id VARCHAR(20) REFERENCES classrooms(room_id),
    day_of_week VARCHAR(10) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    UNIQUE (room_id, day_of_week, start_time)
)${tableSuffix}

CREATE TABLE enrollments (
    enrollment_id ${pkInt},
    student_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    course_code VARCHAR(15) NOT NULL REFERENCES courses(course_code),
    semester VARCHAR(10) NOT NULL,
    grade VARCHAR(2),
    UNIQUE (student_id, course_code, semester)
)${tableSuffix}

CREATE INDEX idx_student_dept ON students(department_id);
CREATE INDEX idx_enrollment_student ON enrollments(student_id);
CREATE INDEX idx_enrollment_course ON enrollments(course_code);
CREATE INDEX idx_course_dept ON courses(department_id);`;

    notes = [
      '1NF: Atomic scalar attributes throughout with composite key elimination.',
      '2NF: Full functional dependency on primary keys with zero partial dependencies.',
      '3NF: Transitive functional dependencies strictly eliminated via dedicated department and classroom entities.',
      'Referential Integrity: Explicit foreign key CASCADE and SET NULL rules with scheduling clash uniqueness.'
    ];
  }

  return {
    id: `db_${Math.random().toString(36).substring(2, 10)}`,
    title,
    engine: targetEngine,
    db_engine: targetEngine,
    sql_ddl: ddl,
    ddl_sql: ddl,
    tables,
    normalization_notes: notes
  };
}
