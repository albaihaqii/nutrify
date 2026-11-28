"""Check the Gemini API key before the advisor uses it.

Usage: python scripts/check_gemini.py [model ...]
Reads GEMINI_API_KEY from backend/.env, lists the Flash models that key can use, then asks each
model (the ones given, or a default pair) one short question and prints the answer. The key is
sent in a header and never printed.
"""

import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import dotenv_values

BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash"]
QUESTION = "Jawab dalam satu kalimat bahasa Indonesia: apa itu hidroponik NFT?"
TIMEOUT_SECONDS = 30


def call(key: str, path: str, body: dict | None = None) -> dict:
    """GET (no body) or POST (JSON body) to the API and return the JSON answer."""
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(
        f"{BASE_URL}/{path}",
        data=data,
        headers={"x-goog-api-key": key, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        return json.load(response)


def error_message(error: urllib.error.HTTPError) -> str:
    """The message Google sent with an error, or just the status code."""
    try:
        return json.load(error)["error"]["message"]
    except (ValueError, KeyError, TypeError):
        return f"HTTP {error.code}"


def list_flash_models(key: str) -> None:
    models = call(key, "models?pageSize=200")["models"]
    names = sorted(
        model["name"].removeprefix("models/")
        for model in models
        if "flash" in model["name"] and "generateContent" in model["supportedGenerationMethods"]
    )
    print("Flash models this key can use:")
    for name in names:
        print(f"  {name}")


def ask(key: str, model: str) -> bool:
    started = time.monotonic()
    try:
        answer = call(
            key,
            f"models/{model}:generateContent",
            {"contents": [{"parts": [{"text": QUESTION}]}]},
        )
    except urllib.error.HTTPError as error:
        print(f"{model}: FAILED ({error.code}) {error_message(error)}")
        return False
    except (urllib.error.URLError, TimeoutError) as error:
        print(f"{model}: FAILED {error}")
        return False
    text = answer["candidates"][0]["content"]["parts"][0]["text"].strip()
    print(f"{model}: OK in {time.monotonic() - started:.1f} s\n  {text}")
    return True


def main() -> None:
    env_file = Path(__file__).resolve().parents[1] / "backend" / ".env"
    key = (dotenv_values(env_file).get("GEMINI_API_KEY") or "").strip()
    if not key:
        sys.exit(f"GEMINI_API_KEY is empty or missing in {env_file}")

    try:
        list_flash_models(key)
    except urllib.error.HTTPError as error:
        sys.exit(f"The key was refused ({error.code}): {error_message(error)}")
    except (urllib.error.URLError, TimeoutError) as error:
        sys.exit(f"Cannot reach the Gemini API: {error}")

    print()
    results = [ask(key, model) for model in sys.argv[1:] or DEFAULT_MODELS]
    sys.exit(0 if any(results) else 1)


if __name__ == "__main__":
    main()