const fs = require('fs');
const path = require('path');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Parul University Study Assistant - Backend Active</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 32px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    h1 { color: #38bdf8; margin-top: 0; font-size: 1.5rem; }
    p { color: #94a3b8; line-height: 1.5; }
    .status {
      display: inline-block;
      background: rgba(34, 197, 94, 0.2);
      color: #4ade80;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="status">● System Healthy</div>
    <h1>Parul University Study Assistant</h1>
    <p>Backend Service Active</p>
  </div>
</body>
</html>`;

const targetDirs = [
  path.join(__dirname, 'dist'),
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, '..', 'frontend', 'dist'),
  path.join(__dirname, '..', 'public')
];

for (const dir of targetDirs) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
  } catch (err) {
    console.warn(`Warning writing to ${dir}:`, err.message);
  }
}

console.log('Backend frontend stub built successfully.');
