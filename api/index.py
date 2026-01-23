import os
import sys

# Add the project root to sys.path
# This allows importing 'backend.app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app
