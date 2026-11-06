"""Simulate the sensor node by sending readings to the API (no hardware needed).

Usage (from the repository root, API running):
    python scripts/simulate_device.py --api-key nfy_xxx
    python scripts/simulate_device.py --api-key nfy_xxx --count 20 --interval 2 --scenario low_ph

The key can also be given with the NUTRIFY_DEVICE_KEY environment variable.
"""

import argparse
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request

# Ideal ranges: pH 5.5-6.5, EC 1.5-2.0 mS/cm, temperature 18-26 C (docs/Domain.md).
SCENARIOS = {
    "normal": {"ph": (5.8, 6.3), "ec": (1.6, 1.9), "temperature": (22.0, 25.0)},
    "low_ph": {"ph": (4.8, 5.3), "ec": (1.6, 1.9), "temperature": (22.0, 25.0)},
    "low_ec": {"ph": (5.8, 6.3), "ec": (0.8, 1.3), "temperature": (22.0, 25.0)},
    "hot": {"ph": (5.8, 6.3), "ec": (1.6, 1.9), "temperature": (28.0, 31.0)},
}


def make_reading(scenario: str) -> dict[str, float | str]:
    ranges = SCENARIOS[scenario]
    return {
        "ph": round(random.uniform(*ranges["ph"]), 2),
        "ec": round(random.uniform(*ranges["ec"]), 3),
        "temperature": round(random.uniform(*ranges["temperature"]), 1),
        "firmware_version": "simulator-0.1",
    }


def send(base_url: str, api_key: str, reading: dict) -> tuple[int, dict]:
    request = urllib.request.Request(
        f"{base_url}/sensor-readings",
        data=json.dumps(reading).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-API-Key": api_key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, json.load(error)


def main() -> int:
    parser = argparse.ArgumentParser(description="Send simulated sensor readings to Nutrify.")
    parser.add_argument("--base-url", default="http://127.0.0.1:5000/api")
    parser.add_argument("--api-key", default=os.environ.get("NUTRIFY_DEVICE_KEY"))
    parser.add_argument("--scenario", choices=sorted(SCENARIOS), default="normal")
    parser.add_argument("--count", type=int, default=5, help="number of readings to send")
    parser.add_argument("--interval", type=float, default=1.0, help="seconds between readings")
    args = parser.parse_args()

    if not args.api_key:
        print("Missing API key: use --api-key or set NUTRIFY_DEVICE_KEY.", file=sys.stderr)
        return 2

    failures = 0
    for number in range(1, args.count + 1):
        reading = make_reading(args.scenario)
        status, body = send(args.base_url, args.api_key, reading)
        print(f"[{number}/{args.count}] {status} {reading} -> {body}")
        if status != 201:
            failures += 1
        if number < args.count:
            time.sleep(args.interval)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())