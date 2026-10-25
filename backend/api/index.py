"""
Vercel Serverless Function Entry Point for Backend sub-project.
"""
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from main import app
except ImportError:
    from backend.main import app

handler = app
