"""Default values for the settings table (see docs/Schema.md section 4.9)."""

# Placeholder ROI layout: a 3 x 2 grid in normalised coordinates
# (fractions of the frame width and height), numbered row by row.
# Replaced during camera calibration.
_COLUMNS_X = (0.05, 0.37, 0.69)
_ROWS_Y = (0.08, 0.54)
_REGION_W = 0.26
_REGION_H = 0.38

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