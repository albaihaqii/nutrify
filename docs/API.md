# API Reference

| Field                  | Value                                                                   |
| ---------------------- | ----------------------------------------------------------------------- |
| Product                | Nutrify                                                                 |
| Version                | 0.1 (draft)                                                             |
| Base URL (development) | `http://127.0.0.1:5000/api`                                             |
| Format                 | JSON over HTTP (except the camera and export endpoints)                 |
| Last updated           | 2026-11-19                                                              |
| Related                | [Architecture](Architecture.md), [Schema](Schema.md), [Rules](Rules.md) |

This document is the contract between the backend, the frontend, and the ESP32 firmware.
When an endpoint changes, update this file in the same pull request.

## 1. Conventions

| Topic        | Rule                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------- |
| Prefix       | Every endpoint lives under `/api`                                                         |
| Content type | `application/json` unless stated otherwise                                                |
| Field names  | `snake_case`                                                                              |
| Timestamps   | ISO 8601 in UTC with milliseconds, for example `2026-11-05T02:40:00.000Z`                 |
| Numbers      | Decimals are returned as JSON numbers (`6.12`), never strings                             |
| Units        | `ph` unitless, `ec` mS/cm, `tds_ppm` ppm, `temperature` degrees Celsius                   |
| Enumerations | English lowercase codes from [Schema](Schema.md) section 3                                |
| Language     | Responses contain codes, never Indonesian sentences. Exception: advice text is Indonesian |
| IDs          | Plants are addressed by `position` (1 to 6), everything else by numeric `id`              |

### 1.1 Authentication

| Client                          | Mechanism                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| Web app                         | `Authorization: Bearer <access_token>` obtained from `POST /api/auth/login`             |
| ESP32 sensor node               | `X-API-Key: <device key>` header                                                        |
| Camera stream in an `<img>` tag | `?token=<access_token>` query parameter (browsers cannot set headers on image requests) |

Access tokens expire after 12 hours. Version 1 has no refresh token; the web app asks the
user to log in again. Logout is performed client-side by discarding the token.

### 1.2 Roles and access

| Marker | Meaning                                      |
| ------ | -------------------------------------------- |
| Public | No authentication                            |
| Viewer | Any authenticated user (`viewer` or `admin`) |
| Admin  | `admin` role only                            |
| Device | Valid `X-API-Key` of an active device        |

### 1.3 Errors

All errors use one shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "ph must be between 0 and 14",
    "details": { "field": "ph" }
  }
}
```

`code` is a stable English identifier. `message` is for developers and logs. `details` is
optional. The frontend maps `code` to Indonesian text.

| HTTP | `code`                | When                                                                           |
| ---- | --------------------- | ------------------------------------------------------------------------------ |
| 400  | `bad_request`         | Malformed JSON or missing body                                                 |
| 401  | `unauthorized`        | Missing, expired, or invalid token or API key                                  |
| 401  | `invalid_credentials` | Wrong email or password at login                                               |
| 403  | `forbidden`           | Authenticated but not allowed (for example a viewer calling an admin endpoint) |
| 404  | `not_found`           | Resource does not exist                                                        |
| 405  | `method_not_allowed`  | HTTP method not supported for this path                                        |
| 409  | `conflict`            | Duplicate value (for example an email that already exists)                     |
| 413  | `payload_too_large`   | Upload over the size limit (10 MB)                                             |
| 422  | `validation_error`    | Body or query parameters failed validation                                     |
| 422  | `invalid_leaf`        | No leaf found in an uploaded photo (`POST /models/predict`)                    |
| 429  | `rate_limited`        | Too many requests (login attempts, advice generation)                          |
| 500  | `internal_error`      | Unexpected server error                                                        |
| 503  | `service_unavailable` | Dependency down (database, camera frame missing)                               |

### 1.4 Pagination and filtering

List endpoints that can grow large accept `page` (default 1) and `page_size` (default 20,
maximum 100) and return:

```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total": 0
}
```

Time filters use `from` and `to` (ISO 8601, UTC, both inclusive). Results are sorted newest
first unless stated otherwise.

## 2. Endpoint overview

| Group        | Method and path                   | Access |
| ------------ | --------------------------------- | ------ |
| Health       | `GET /health`                     | Public |
|              | `GET /status`                     | Viewer |
| Auth         | `POST /auth/login`                | Public |
|              | `GET /auth/me`                    | Viewer |
|              | `PUT /auth/password`              | Viewer |
| Users        | `GET /users`                      | Admin  |
|              | `POST /users`                     | Admin  |
|              | `PATCH /users/{id}`               | Admin  |
| Dashboard    | `GET /dashboard/summary`          | Viewer |
| Sensors      | `POST /sensor-readings`           | Device |
|              | `GET /sensor-readings/latest`     | Viewer |
|              | `GET /sensor-readings`            | Viewer |
| Plants       | `GET /plants`                     | Viewer |
|              | `GET /plants/{position}`          | Viewer |
| Observations | `GET /observations`               | Viewer |
|              | `PATCH /observations/{id}/label`  | Admin  |
| Dataset      | `GET /dataset/summary`            | Viewer |
|              | `GET /dataset/export`             | Admin  |
| Camera       | `GET /camera/status`              | Viewer |
|              | `GET /camera/stream`              | Viewer |
|              | `GET /camera/snapshot`            | Viewer |
|              | `POST /camera/captures`           | Admin  |
|              | `GET /camera/captures`            | Viewer |
|              | `GET /camera/captures/{id}/image` | Viewer |
| Models       | `GET /models`                     | Viewer |
|              | `GET /models/c45/tree`            | Viewer |
|              | `POST /models/predict`            | Viewer |
| Advice       | `GET /advice`                     | Viewer |
|              | `GET /advice/latest`              | Viewer |
|              | `GET /advice/rules`               | Viewer |
|              | `PUT /advice/rules/{code}`        | Admin  |
|              | `POST /advice/generate`           | Admin  |
| Alerts       | `GET /alerts`                     | Viewer |
|              | `POST /alerts/{id}/acknowledge`   | Viewer |
| Devices      | `GET /devices`                    | Admin  |
|              | `POST /devices`                   | Admin  |
|              | `PATCH /devices/{id}`             | Admin  |
|              | `POST /devices/{id}/rotate-key`   | Admin  |
| Settings     | `GET /settings`                   | Viewer |
|              | `PUT /settings`                   | Admin  |

The vision worker is not part of this HTTP API. It shares the backend service layer and writes
to the database and to `storage/frames/` directly (see [Architecture](Architecture.md)).

## 3. Health

### `GET /health`

Checks that the API and the database respond.

```json
{ "status": "ok", "database": "ok" }
```

Returns `503` with `{ "status": "degraded", "database": "error" }` when the database is
unreachable.

### `GET /status` (Viewer)

A cheap summary for the three status chips in the page header (Webcam, Sensor, Penasihat). The
header shows on every page and polls this endpoint, so it must be light and readable by
viewers. `GET /devices` is admin only and is not used for this.

```json
{
  "webcam": true,
  "sensor": true,
  "advisor": true,
  "checked_at": "2026-11-17T02:40:05.000Z"
}
```

| Field     | `true` when                                                                               |
| --------- | ----------------------------------------------------------------------------------------- |
| `webcam`  | The webcam device is switched on and its latest frame is newer than 10 seconds (the rule of `GET /camera/status`) |
| `sensor`  | An active sensor node was seen within `sensor_stale_seconds`                              |
| `advisor` | An LLM provider is configured and its last call succeeded; `false` means rules are in use |

## 4. Auth and users

### `POST /auth/login`

Request:

```json
{ "email": "admin@example.com", "password": "..." }
```

Response `200`:

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 43200,
  "user": {
    "id": 1,
    "name": "Admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

Errors: `401 invalid_credentials`, `403 forbidden` when the account is inactive, and
`429 rate_limited` after 5 failed attempts for the same email from the same address within
5 minutes (counted in memory, so it resets when the server restarts).

### `GET /auth/me`

Returns the current user: `{ "id", "name", "email", "role", "last_login_at" }`.

### `PUT /auth/password`

Request: `{ "current_password": "...", "new_password": "..." }`. Response `204`. The new password
must be at least 8 characters. A wrong `current_password` returns `422 validation_error` with
`details.field` set to `current_password`.

### `GET /users` (Admin)

Returns `{ "items": [ { "id", "name", "email", "role", "is_active", "last_login_at" } ] }`.

### `POST /users` (Admin)

Request: `{ "name", "email", "password", "role" }`. Response `201` with the created user.
Errors: `409 conflict` for a duplicate email.

`email` must be a valid address and is stored in lowercase; `password` is 8 to 128 characters;
`role` is `admin` or `viewer`. A password is never returned by any endpoint.

### `PATCH /users/{id}` (Admin)

Accepts any of `name`, `role`, `is_active`, `password`. An admin cannot deactivate or demote
their own account. Response `200` with the updated user.

The `email` cannot be changed. Send at least one field; an empty body returns `422
validation_error`. An admin who tries to deactivate or change the role of their own account gets
`403 forbidden`. A deactivated account cannot log in and its existing tokens stop working.

## 5. Sensors

### `POST /sensor-readings` (Device)

Sent by the ESP32 about every 5 seconds.

Request:

```json
{
  "ph": 6.12,
  "ec": 1.84,
  "temperature": 24.6,
  "recorded_at": "2026-11-05T02:40:00.000Z",
  "firmware_version": "0.1.0"
}
```

| Field              | Required | Validation                                                                            |
| ------------------ | -------- | ------------------------------------------------------------------------------------- |
| `ph`               | yes      | 0 to 14                                                                               |
| `ec`               | yes      | 0 to 10 (mS/cm)                                                                       |
| `temperature`      | yes      | -5 to 60 (Celsius); the DS18B20 error value `-127` is rejected                        |
| `recorded_at`      | no       | UTC; when omitted the server uses the receive time (the ESP32 has no real-time clock) |
| `firmware_version` | no       | Stored on the device row                                                              |

The server derives `tds_ppm = round(ec x 500)`, updates `devices.last_seen_at`, evaluates alert
rules, and stores the reading.

Response `201`:

```json
{ "id": 1042, "tds_ppm": 920, "received_at": "2026-11-05T02:40:00.412Z" }
```

Errors: `401 unauthorized` (bad key), `422 validation_error`.

Unknown body fields are ignored. `tds_ppm` is always derived by the server from `ec`
(`ec` x 500, rounded) and is never taken from the client. `recorded_at` is optional (defaults to
the server time) and is rejected with `422` when it is more than 5 minutes in the future. A missing
or invalid `X-API-Key`, or a key of an inactive device, returns `401 unauthorized`. A bearer token
is not accepted on this endpoint.

### `GET /sensor-readings/latest` (Viewer)

```json
{
  "id": 1042,
  "recorded_at": "2026-11-05T02:40:00.000Z",
  "received_at": "2026-11-05T02:40:00.412Z",
  "is_stale": false,
  "ph": { "value": 6.12, "status": "in_range" },
  "ec": { "value": 1.84, "status": "in_range", "unit": "mS/cm" },
  "tds_ppm": { "value": 920 },
  "temperature": { "value": 24.6, "status": "in_range", "unit": "celsius" }
}
```

`status` is `in_range`, `low`, or `high`, computed against the ranges in `settings`.
`is_stale` is true when the reading is older than `sensor_stale_seconds`. Returns `404 not_found`
when no reading exists yet.

`status` is `low`, `in_range`, or `high` against the ideal ranges in settings (limits included).
`is_stale` is `true` when `recorded_at` is older than `sensor_stale_seconds`. Returns `404
not_found` when no reading exists yet. `unit` appears only on `ec` and `temperature`.

### `GET /sensor-readings` (Viewer)

History for charts and the history page.

| Parameter    | Description                                                                             |
| ------------ | --------------------------------------------------------------------------------------- |
| `from`, `to` | Time window (default: last 24 hours)                                                    |
| `interval`   | `raw`, `1m`, `5m`, `1h` (default `5m`). Aggregated intervals return the mean per bucket |
| `metric`     | Optional: `ph`, `ec`, `tds_ppm`, `temperature`. When omitted, all are returned          |

Response:

```json
{
  "interval": "5m",
  "items": [
    {
      "time": "2026-11-05T02:35:00.000Z",
      "ph": 6.1,
      "ec": 1.83,
      "tds_ppm": 915,
      "temperature": 24.5
    }
  ]
}
```

Items are sorted oldest first (chart order). The server limits the result to 2,000 points and
returns `422 validation_error` when the window and interval would exceed it.

`from` and `to` are inclusive UTC timestamps (for example `2026-11-05T02:40:00Z`); `to`
defaults to now and `from` to 24 hours before `to`. `from` must be earlier than `to`. Time
buckets are aligned to UTC and each item's `time` is the start of its bucket. When `metric` is
given, each item contains only `time` and that metric. A window that would return more than
2,000 points returns `422 validation_error` with `details.field` set to `interval`.

## 6. Dashboard

### `GET /dashboard/summary` (Viewer)

One call that feeds the whole dashboard.

```json
{
  "sensors": { "...": "same shape as /sensor-readings/latest, or null" },
  "plants": [
    {
      "position": 1,
      "current_class": "normal",
      "current_since": "2026-11-05T01:10:00.000Z",
      "confidence": 0.94
    }
  ],
  "class_counts": {
    "normal": 4,
    "n_deficiency": 1,
    "fe_deficiency": 1,
    "unknown": 0
  },
  "open_alerts": 2,
  "system": {
    "sensor_node": {
      "status": "online",
      "last_seen_at": "2026-11-05T02:40:00.412Z"
    },
    "webcam": {
      "status": "online",
      "last_seen_at": "2026-11-05T02:40:03.000Z"
    },
    "last_analysis_at": "2026-11-05T02:40:00.000Z",
    "model_version": "c45-0.1.0"
  }
}
```

Device `status` is `online`, `offline`, or `never_seen`. A plant that has no result yet has
`current_class: null` and is counted as `unknown`.

## 7. Plants and observations

### `GET /plants` (Viewer)

Returns the six plants:

```json
{
  "items": [
    {
      "position": 1,
      "current_class": "normal",
      "current_since": "2026-11-05T01:10:00.000Z",
      "last_observation": {
        "id": 8800,
        "observed_at": "2026-11-05T02:40:00.000Z",
        "confidence": 0.94,
        "qc_status": "ok"
      }
    }
  ]
}
```

### `GET /plants/{position}` (Viewer)

Plant detail with the latest observation in full:

```json
{
  "position": 3,
  "current_class": "n_deficiency",
  "current_since": "2026-11-05T02:05:00.000Z",
  "latest_observation": {
    "id": 8802,
    "observed_at": "2026-11-05T02:40:00.000Z",
    "features": {
      "mean_r": 118.4,
      "mean_g": 160.2,
      "mean_b": 70.9,
      "leaf_area_ratio": 0.4123,
      "ph": 6.12,
      "ec": 1.84,
      "temperature": 24.6
    },
    "predicted_class": "n_deficiency",
    "stable_class": "n_deficiency",
    "confidence": 0.91,
    "rule_path": [
      { "feature": "mean_g", "operator": "<=", "threshold": 165.5 },
      { "feature": "mean_r", "operator": ">", "threshold": 112.0 }
    ],
    "qc_status": "ok",
    "model_version": "c45-0.1.0"
  },
  "latest_advice": { "...": "same shape as /advice items, or null" }
}
```

`rule_path` lists the conditions from the root of the decision tree to the leaf, so the UI can
explain the result. Errors: `404 not_found` for a position outside 1 to 6.

### `GET /observations` (Viewer)

| Parameter           | Description                                                                   |
| ------------------- | ----------------------------------------------------------------------------- |
| `plant`             | Position 1 to 6                                                               |
| `from`, `to`        | Time window                                                                   |
| `class`             | Filter by `stable_class`                                                      |
| `qc_status`         | Filter by QC status                                                           |
| `labeled`           | `true` or `false`                                                             |
| `has_image`         | `true`: only observations that have a stored frame (used by the Dataset page) |
| `page`, `page_size` | Pagination                                                                    |

Each item has the observation fields from [Schema](Schema.md) section 4.6 in the same nested
shape as `latest_observation` above, plus `plant_position`, `label_class`, `labeled_by`,
`labeled_at`, and `image`:

```json
"image": {
  "url": "/api/camera/captures/77/image",
  "roi": { "x": 0.08, "y": 0.12, "w": 0.2, "h": 0.3 }
}
```

`image` is `null` when the observation has no `capture_id`. `url` is the stored raw frame of
the capture (open it with `?token=` in an `<img>` tag). `roi` is this plant's region in that
frame as fractions (0 to 1) of the frame width and height, taken from the capture's
`roi_config` ([Schema](Schema.md) section 4.5), so it stays correct even if the calibration
changes later. The Dataset page crops the thumbnail in the browser with this region; the backend
does not store crops.

### `PATCH /observations/{id}/label` (Admin)

Sets or clears the manual ground-truth label used for the dataset.

Request: `{ "label_class": "n_deficiency" }` (use `null` to clear). Response `200` with the
updated observation. Records `labeled_by` and `labeled_at`.

## 8. Dataset

### `GET /dataset/summary` (Viewer)

```json
{
  "total_observations": 51800,
  "labeled": 420,
  "usable": 402,
  "by_class": { "normal": 250, "n_deficiency": 60, "fe_deficiency": 92 },
  "by_qc_status": {
    "ok": 402,
    "invalid_leaf": 10,
    "stale_sensor": 6,
    "needs_check": 2
  }
}
```

`usable` means `label_class IS NOT NULL AND qc_status = 'ok'`, the same rule as the export.

### `GET /dataset/export` (Admin)

Returns a CSV file (`text/csv`, `Content-Disposition: attachment; filename="nutrify-dataset-<date>.csv"`).

Columns: `Mean_R, Mean_G, Mean_B, pH, EC, Temperature, label`, then the traceability columns
`observation_id, plant_position, observed_at`. Optional parameters `from` and `to` limit the
window. See [Schema](Schema.md) section 7.

The export is the training path of version 2 ([ML](ML.md) section 7.5), where each row pairs
the leaf colour with the sensor values of the same moment. Version 1 is trained from the image
dataset described in [ML](ML.md) section 7.1 and does not use this export.

## 9. Camera

### `GET /camera/status` (Viewer)

```json
{
  "status": "online",
  "last_frame_at": "2026-11-05T02:40:03.000Z",
  "frame_age_seconds": 1.2,
  "resolution": { "width": 1280, "height": 720 }
}
```

`status` is `online` when the webcam device is switched on (Devices page) and the latest frame is
newer than 10 seconds, otherwise `offline`. When it is offline `resolution` is `null`, and
`last_frame_at` and `frame_age_seconds` are `null` only if no frame was ever written.

### `GET /camera/stream` (Viewer)

Live annotated video as `multipart/x-mixed-replace` (MJPEG). The worker draws the six regions
and the current status on each frame; the API only streams the latest stored frame.

Use it in the web app as `<img src="/api/camera/stream?token=<access_token>">`. Returns
`503 service_unavailable` when there is no frame newer than 10 seconds. The stream ends when the
frames stop coming.

### `GET /camera/snapshot` (Viewer)

Returns the latest annotated frame as a single `image/jpeg`.

### `POST /camera/captures` (Admin)

Saves the current **raw** frame (without the drawn regions and labels) to `storage/snapshots/`
and creates a `captures` row that also stores a copy of the current `roi_config`. Response `201`:

```json
{
  "id": 77,
  "captured_at": "2026-11-05T02:41:00.000Z",
  "image_url": "/api/camera/captures/77/image"
}
```

### `GET /camera/captures` (Viewer)

Paginated list: `{ "items": [ { "id", "captured_at", "image_url" } ], ... }`.

### `GET /camera/captures/{id}/image` (Viewer)

Returns the stored raw frame as `image/jpeg`. Accepts `?token=` for use in `<img>` tags.

## 10. Models

### `GET /models` (Viewer)

Reads `ml/models/registry.json`, which the training notebook writes. Version 1 has one primary
model (C4.5) and three comparators; the comparators exist only to be compared with it. The
primary model is the registry's `active_version`: changing that one value (for example to
`svm-0.1.0`) makes that model primary everywhere, with no code change.

```json
{
  "active_version": "c45-0.1.0",
  "trained_at": "2026-11-21T18:42:41",
  "test_size": 76,
  "features": ["mean_r", "mean_g", "mean_b"],
  "classes": ["normal", "n_deficiency", "fe_deficiency"],
  "models": [
    {
      "id": "c45",
      "version": "c45-0.1.0",
      "role": "primary",
      "metrics": { "accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1": 0.0 }
    },
    {
      "id": "svm",
      "version": "svm-0.1.0",
      "role": "comparator",
      "metrics": { "accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1": 0.0 }
    }
  ],
  "confusion": [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ]
}
```

- `trained_at` is written as the notebook saved it: local time, without a time zone.
- `features` is the feature list of the active model, in order, with the lowercase names used
  everywhere in the API. Version 1 uses colour features only (`mean_r`, `mean_g`, `mean_b`, and
  optionally `lab_l`, `lab_a`, `lab_b`); version 2 adds `ph`, `ec`, and `temperature`
  ([ML](ML.md) section 4).
- `models[].id` is one of `c45`, `svm`, `naive_bayes`, `random_forest`. `role` is `primary` for
  the active model and `comparator` for the others, whatever the `role` stored in the registry
  entry. The primary model comes first.
- Every metric is from 0 to 1, computed on the same test set of `test_size` rows. `precision`,
  `recall`, and `f1` are macro averages over the three classes.
- `confusion` belongs to the primary model, counted from the notebook's test predictions
  (`ml/reports/results/07_test_predictions.csv`). Rows are the actual class and columns the
  predicted class, both in the order of `classes`. It is `null` when that file is missing.
- Metric values above are placeholders; real values come from the registry after training.
  Before the first training the endpoint returns `404 not_found`, and the Models page shows an
  empty state.

### `GET /models/c45/tree` (Viewer)

Returns the trained C4.5 tree as nested nodes, for the rules list and the diagram on the Models
page. A node with `feature` is a split; a node with `class` is a leaf.

```json
{
  "version": "c45-0.1.0",
  "root": {
    "feature": "mean_g",
    "threshold": 165.5,
    "left": { "class": "n_deficiency", "samples": 60, "confidence": 0.91 },
    "right": { "class": "normal", "samples": 250, "confidence": 0.97 }
  }
}
```

`left` holds rows whose value is less than or equal to `threshold`; `right` holds the rest.
In a leaf, `samples` is the number of training rows that ended there and `confidence` is the
share of those rows that belong to `class` (the same definition as the observation
`confidence`). `feature` uses the lowercase names `mean_r`, `mean_g`, `mean_b`, `lab_l`,
`lab_a`, `lab_b`, `ph`, `ec`, and `temperature`; only the names in the active feature list
appear. The tree is the active model when that is C4.5, otherwise the first C4.5 in the
registry. Returns `404 not_found` before the first training.

### `POST /models/predict` (Viewer)

A what-if for the "Coba Prediksi" form: classify one photo of a single plant. Nothing is
stored.

Request: `multipart/form-data` with one file field, `image` (any format OpenCV reads, such as
JPEG or PNG, up to 10 MB).

Response `200`:

```json
{
  "class": "n_deficiency",
  "confidence": 0.84,
  "features": { "mean_r": 170.3, "mean_g": 160.3, "mean_b": 50.9 },
  "mask_area_ratio": 0.23,
  "comparators": [
    { "model_id": "svm", "class": "n_deficiency" },
    { "model_id": "naive_bayes", "class": "n_deficiency" },
    { "model_id": "random_forest", "class": "n_deficiency" }
  ]
}
```

The photo goes through the same pipeline as the training images ([ML](ML.md) section 3), set
from the `preprocessing` entry of the active model in the registry. `class` and `confidence`
come from the active (primary) model. `confidence` is the leaf purity for C4.5, the class
probability for Naive Bayes and Random Forest, and the share of a softmax over the decision
values for SVM; it is not a calibrated probability. Each comparator returns only its class.
`features` is the mean colour of the leaf pixels that the models used, and `mask_area_ratio` is
the share of the photo marked as leaf.

Errors: a missing, empty, or undecodable `image` returns `422 validation_error` with
`details.field` set to `image`. A photo in which no leaf is found (the segmentation fails the
quality check) returns `422 invalid_leaf`. A file over 10 MB returns `413 payload_too_large`.
Returns `404 not_found` before the first training.

Version 1 takes colour features only, so the sensor inputs of the "Coba Prediksi" form are
removed until version 2 ([ML](ML.md) section 2.1).

## 11. Advice

### `GET /advice` (Viewer)

| Parameter           | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| `source`            | `llm` or `rules`; leave out for both (Advisor page source tabs) |
| `plant`             | Position 1 to 6                                                 |
| `trigger`           | `plant_status` or `sensor_range`                                |
| `from`, `to`        | Time window                                                     |
| `page`, `page_size` | Pagination                                                      |

Item shape:

```json
{
  "id": 310,
  "created_at": "2026-11-05T02:41:00.000Z",
  "trigger": "plant_status",
  "plant_position": 3,
  "plant_class": "n_deficiency",
  "severity": "warning",
  "summary": "Tanaman pada lubang 3 menunjukkan tanda kekurangan nitrogen.",
  "likely_causes": ["Konsentrasi nutrisi (EC) terlalu rendah"],
  "suggested_actions": [
    "Naikkan konsentrasi nutrisi secara bertahap dan pantau EC"
  ],
  "source": "llm",
  "provider": "gemini",
  "model_name": "gemini-flash"
}
```

`summary`, `likely_causes`, and `suggested_actions` are Indonesian. `source` is `llm` or
`rules`; `rules` means the rule-based fallback produced the advice. `plant_position` is `null`
for advice about the reservoir as a whole (shown as "Tandon").

### `GET /advice/latest` (Viewer)

Query `plant` (optional). Returns the newest advice item, or `404 not_found` when none exists.
The web app treats that `404` as "no advice yet", not as an error.

### `GET /advice/rules` (Viewer)

The rule-based fallback advice. Each rule has a fixed condition in the backend
(`advisor/rules.py`) and suggested actions that an admin may edit.

```json
{
  "items": [
    {
      "code": "n_deficiency_in_range",
      "suggested_actions": [
        "Periksa konsentrasi larutan nutrisi",
        "Pantau selama 24 jam"
      ],
      "updated_at": null,
      "updated_by": null
    }
  ]
}
```

`code` is one of `n_deficiency_in_range`, `fe_deficiency`, `ph_out_of_range`,
`ec_out_of_range`, `temperature_out_of_range`, and `needs_check`. The response always lists all
six rules: a rule that was never edited returns its default actions from code, with
`updated_at` and `updated_by` set to `null`. Edited actions are stored in `advice_rules`
([Schema](Schema.md) section 4.10). The condition text is not part of the response: the web app
builds it from `code` and the ranges in `GET /settings`.

### `PUT /advice/rules/{code}` (Admin)

Replaces the suggested actions of one rule.

Request: `{ "suggested_actions": ["...", "..."] }`. Rules: 1 to 5 items, each a non-empty string
of at most 300 characters after trimming. Response `200` with the updated rule. Errors:
`404 not_found` for an unknown `code`, `422 validation_error` for invalid actions, and
`403 forbidden` for a viewer. The change applies to advice created after the save; stored
advice is not rewritten.

### `POST /advice/generate` (Admin)

Generates advice on demand for a plant or for the current sensor values.

Request: `{ "trigger": "plant_status", "plant": 3 }` or `{ "trigger": "sensor_range" }`.
Response `201` with the advice item. The advisor receives measured facts only and never decides
the plant class. Responses may be reused from the cache (same status and sensor band).
Limited to one request per plant per minute; otherwise `429 rate_limited`. The version 1 web
app has no button for this; advice is created by the backend when a plant status or sensor
condition triggers it.

## 12. Alerts

### `GET /alerts` (Viewer)

| Parameter                         | Description                                |
| --------------------------------- | ------------------------------------------ |
| `state`                           | `open`, `resolved`, `all` (default `open`) |
| `severity`                        | `info`, `warning`, `critical`              |
| `from`, `to`, `page`, `page_size` | Window and pagination                      |

Item shape:

```json
{
  "id": 55,
  "code": "sensor_out_of_range",
  "severity": "warning",
  "params": { "metric": "ph", "value": 7.1, "min": 5.5, "max": 6.5 },
  "plant_position": null,
  "device_code": "sensor-node-1",
  "created_at": "2026-11-05T02:30:00.000Z",
  "resolved_at": null,
  "acknowledged_by": null,
  "acknowledged_at": null
}
```

The frontend turns `code` and `params` into an Indonesian sentence.

### `POST /alerts/{id}/acknowledge` (Viewer)

Marks the alert as seen by the current user. Response `200` with the updated alert. Alerts
resolve automatically when the condition clears.

## 13. Devices

### `GET /devices` (Admin)

Items: `{ "id", "code", "name", "type", "firmware_version", "last_seen_at", "is_active",
"status" }`. API keys are never returned.

A device is `online` when it was seen within `sensor_stale_seconds` (default 120 seconds),
`offline` when older, and `never_seen` when it has never contacted the API.

### `POST /devices` (Admin)

Request: `{ "code": "sensor-node-2", "name": "Sensor node 2", "type": "sensor_node" }`.
Response `201` includes the generated key **once**:

```json
{ "id": 3, "code": "sensor-node-2", "api_key": "nfy_..." }
```

Only a hash is stored, so the key cannot be shown again.

Only `sensor_node` devices receive a key; for a `webcam` device `api_key` is `null`. A duplicate
`code` returns `409 conflict`. The code uses lowercase letters, digits, and hyphens (3 to 50
characters).

### `PATCH /devices/{id}` (Admin)

Accepts `name` and `is_active`. Deactivating a device makes its key stop working.

Send at least one field; an empty body returns `422 validation_error`.

### `POST /devices/{id}/rotate-key` (Admin)

Generates a new key, invalidates the old one, and returns the new key once, as in `POST /devices`.

Only devices that use a key can be rotated; a `webcam` returns `422 validation_error`.

## 14. Settings

### `GET /settings` (Viewer)

Returns every key from [Schema](Schema.md) section 4.9 as a flat object:

```json
{
  "ph_min": 5.5,
  "ph_max": 6.5,
  "ec_min": 1.5,
  "ec_max": 2.0,
  "temperature_min": 18,
  "temperature_max": 26,
  "analysis_interval_seconds": 10,
  "observation_store_interval_seconds": 60,
  "stabilizer_window": 5,
  "stabilizer_min_votes": 3,
  "sensor_stale_seconds": 120,
  "consensus_enabled": false,
  "roi_config": []
}
```

### `PUT /settings` (Admin)

Partial update: send only the keys to change. Unknown keys and invalid values return
`422 validation_error` and nothing is saved. Rules include `min < max` for each range,
`stabilizer_min_votes <= stabilizer_window`, and exactly six regions in `roi_config`, each
inside the frame. Response `200` with the full settings object. The worker re-reads settings
without a restart.

Values must have the exact JSON type (for example `consensus_enabled` is `true` or `false`, not a
string). Ranges: pH 0 to 14, EC 0 to 10, temperature -5 to 60, `sensor_stale_seconds` 10 to 3600.
Each `roi_config` region has a `position` from 1 to 6 (each used once) and stays inside the frame
(`x + w` and `y + h` not above 1).

## 15. Versioning and compatibility

- Version 1 has no URL version segment. A breaking change in a later version introduces
  `/api/v2` while `/api` keeps working for a transition period.
- Adding optional fields to a response is not a breaking change. Clients must ignore unknown
  fields.
- Removing or renaming a field, or changing its type or unit, is a breaking change.
