import os
import sys

# Ensure repo root is on sys.path to import backend package
CURRENT_DIR = os.path.dirname(__file__)
REPO_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, '..'))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

# Import the Flask app as a WSGI application for Vercel's @vercel/python
from backend.src.main import app as application  # noqa: E402

