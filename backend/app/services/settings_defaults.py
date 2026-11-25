"""Default values for the settings table (see docs/Schema.md section 4.9)."""

# Placeholder ROI layout, the grid of the Live Kamera artboard: 3 columns by 2 rows in
# normalised coordinates (fractions of the frame width and height), numbered row by row.
# The top margin leaves room for the LIVE badge. Replaced during camera calibration; keep it
# equal to `defaultBoxes()` in the frontend (the reset button of the calibration card).
_COLUMNS_X = (0.04, 0.3533, 0.6667)
_ROWS_Y = (0.09, 0.53)
_REGION_W = 0.2933
_REGION_H = 0.415

DEFAULT_ROI_CONFIG = [
    {
        "position": row * 3 + col + 1,
        "x": _COLUMNS_X[col],
        "y": _ROWS_Y[row],
        "w": _REGION_W,
        "h": _REGION_H,
    }
    for row in range(2)
    for col in range(3)
]

DEFAULT_SETTINGS = {
    "ph_min": 5.5,
    "ph_max": 6.5,
    "ec_min": 1.5,
    "ec_max": 2.0,
    "temperature_min": 18,  # placeholder, to be validated
    "temperature_max": 26,  # placeholder, to be validated
    "analysis_interval_seconds": 10,
    "observation_store_interval_seconds": 60,
    "stabilizer_window": 5,
    "stabilizer_min_votes": 3,
    "sensor_stale_seconds": 120,
    "consensus_enabled": False,
    "roi_config": DEFAULT_ROI_CONFIG,
}
