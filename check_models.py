
import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GENAI_API_KEY")

if not api_key:
    # prompt user if not in env for test
    print("No key found in env")
    exit()

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
try:
    response = requests.get(url)
    if response.status_code == 200:
        models = response.json().get('models', [])
        print("Available Models:")
        for m in models:
            if 'generateContent' in m.get('supportedGenerationMethods', []):
                print(f"- {m['name']}")
    else:
        print(f"Error: {response.status_code} {response.text}")
except Exception as e:
    print(e)
