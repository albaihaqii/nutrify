# Product Requirements Document (PRD)

| Field        | Value                    |
| ------------ | ------------------------ |
| Product      | Nutrify                  |
| Version      | 0.1 (draft)              |
| Status       | Draft                    |
| Author       | Faiq Raihan Albaihaqi    |
| Institution  | Politeknik Negeri Jember |
| Last updated | 2026-11-05               |

## 1. Overview

### 1.1 Purpose

Nutrify is a web-based monitoring system for a small NFT hydroponic prototype growing pakcoy
(Brassica rapa subsp. chinensis). It detects nitrogen (N) and iron (Fe) deficiency on each plant
in near real time, shows water-quality readings, and gives growers advice on what to check.

### 1.2 Problem

- Nutrient deficiency in hydroponics is usually noticed late, by eye, after yield is already affected.
- One shared nutrient tank feeds every plant, so a tank-level problem spreads to all plants.
- Visual symptoms are subtle and easy to confuse: Fe deficiency shows interveinal chlorosis on
  young leaves, while N deficiency shows uniform yellowing on old leaves.

### 1.3 Solution summary

1. A webcam watches the prototype (6 plant holes in a 3 x 2 grid) in a single frame.
2. An ESP32 reads tank pH, EC, and water temperature (DS18B20).
3. The backend crops each hole, extracts leaf colour features with OpenCV, and classifies each
   hole with a Decision Tree C4.5 model as `normal`, `n_deficiency`, or `fe_deficiency`.
4. An LLM advisor explains the situation and suggests actions. It never controls hardware.
5. A web dashboard (Bahasa Indonesia) presents live video, results, trends, and advice.

## 2. Goals and non-goals

### 2.1 Goals

- G1. Classify the condition of each of the 6 plant holes continuously from a single webcam.
- G2. Show tank pH, EC, TDS (ppm), and water temperature with history and status.
- G3. Provide understandable, actionable advice when a deficiency or out-of-range value appears.
- G4. Use C4.5 as the primary model and justify it against SVM, Naive Bayes, and Random Forest.
- G5. Let the system collect its own labelled dataset (image features plus sensor values).

### 2.2 Non-goals

- Automatic control of pumps, dosing, or any actuator. Advice only.
- Support for plants other than pakcoy, or for deficiencies other than N and Fe.
- Public deployment, multi-tenant accounts, or mobile apps.
- Training deep-learning vision models (an optional extension, not part of this scope).

## 3. Users and roles

| Role   | Description                                                  | Access                                              |
| ------ | ------------------------------------------------------------ | --------------------------------------------------- |
| admin  | Grower or researcher who operates the system                 | Full access, including settings, labelling, devices |
| viewer | Read-only observer (for example, a supervisor during a demo) | View dashboard, live camera, history, models        |

There is no self-registration and no password recovery flow. Accounts are created by an admin script.

## 4. System scope

### 4.1 Hardware

| Component                                           | Role                                                        |
| --------------------------------------------------- | ----------------------------------------------------------- |
| Miniature NFT rig, 6 holes (3 x 2), one shared tank | Physical prototype                                          |
| USB webcam, fixed above the rig                     | One frame covers all 6 holes                                |
| ESP32 sensor node                                   | Reads pH, EC, and DS18B20 temperature; sends data over HTTP |
| Host computer                                       | Runs backend, vision worker, MySQL, and serves the web app  |

### 4.2 Software

| Part                   | Responsibility                                                                  |
| ---------------------- | ------------------------------------------------------------------------------- |
| Frontend (React)       | Dashboard, live camera, history, dataset labelling, model comparison, settings  |
| Backend API (Flask)    | Authentication, data ingestion, queries, advice, alerts                         |
| Vision worker (Python) | Owns the webcam, crops holes, extracts features, classifies, stabilises results |
| Database (MySQL)       | Readings, observations, advice, alerts, settings, users                         |
| ML workspace           | Notebooks, training, evaluation, model artifacts                                |

## 5. Functional requirements

Priority uses MoSCoW: **M** must, **S** should, **C** could.

### 5.1 Authentication and access

| ID    | Requirement                                                                   | Priority |
| ----- | ----------------------------------------------------------------------------- | -------- |
| FR-01 | Users sign in with email and password and receive a token; sign out clears it | M        |
| FR-02 | Two roles (admin, viewer); write actions are blocked for viewer               | S        |
| FR-03 | Devices authenticate with an API key, not user login                          | M        |

### 5.2 Sensors

| ID    | Requirement                                                      | Priority |
| ----- | ---------------------------------------------------------------- | -------- |
| FR-10 | Accept pH, EC, and temperature readings from the ESP32           | M        |
| FR-11 | Derive TDS (ppm) from EC (ppm = EC x 500)                        | M        |
| FR-12 | Show latest values and history charts (1 hour, 24 hours, 7 days) | M        |
| FR-13 | Show a status badge per value against configurable ideal ranges  | M        |
| FR-14 | Export readings as CSV                                           | S        |

### 5.3 Vision and classification

| ID    | Requirement                                                                   | Priority |
| ----- | ----------------------------------------------------------------------------- | -------- |
| FR-20 | Stream the live webcam view in the web app                                    | M        |
| FR-21 | Let an admin calibrate the 6 hole regions on a reference frame                | M        |
| FR-22 | Preprocess each region with OpenCV and extract mean R, G, B of leaf pixels    | M        |
| FR-23 | Classify each hole with C4.5 using Mean R, G, B, pH, EC, and temperature      | M        |
| FR-24 | Stabilise results (majority of recent readings) before changing a hole status | M        |
| FR-25 | Overlay the 3 x 2 grid, status labels, and confidence on the video            | M        |
| FR-26 | Store periodic snapshots together with the sensor values at that time         | S        |
| FR-27 | Mark a hole as "needs check" when models disagree or leaf area is invalid     | S        |

### 5.4 Advisor

| ID    | Requirement                                                                           | Priority |
| ----- | ------------------------------------------------------------------------------------- | -------- |
| FR-30 | Generate advice with an LLM when a hole becomes deficient or a value leaves its range | M        |
| FR-31 | Fall back to a rule-based advice table when the LLM is unavailable                    | M        |
| FR-32 | Label every advice as a suggestion (never an automatic action) and show its source    | M        |
| FR-33 | Keep an advice history                                                                | S        |
| FR-34 | Provide a small question box answered from current system state                       | C        |

### 5.5 Models and dataset

| ID    | Requirement                                                                                                        | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-40 | Show a comparison of C4.5, SVM, Naive Bayes, and Random Forest (accuracy, precision, recall, F1, confusion matrix) | M        |
| FR-41 | Show the C4.5 tree or rules, and the rule path behind each prediction                                              | S        |
| FR-42 | Provide a manual prediction form for the six features                                                              | S        |
| FR-50 | Let an admin label stored snapshots (normal, N deficiency, Fe deficiency)                                          | S        |
| FR-51 | Export a labelled dataset as CSV in the column order: Mean_R, Mean_G, Mean_B, pH, EC, Temperature, label           | S        |

### 5.6 Alerts, devices, settings

| ID    | Requirement                                                            | Priority |
| ----- | ---------------------------------------------------------------------- | -------- |
| FR-60 | Raise alerts for out-of-range sensors, deficiency, and offline devices | M        |
| FR-61 | Send alerts to Telegram (pending decision)                             | C        |
| FR-70 | Show device status and last-seen time (webcam, ESP32)                  | S        |
| FR-71 | Configure ideal ranges, analysis interval, and stabiliser window       | M        |
| FR-72 | Light and dark theme                                                   | S        |

### 5.7 Dashboard

| ID    | Requirement                                                                        | Priority |
| ----- | ---------------------------------------------------------------------------------- | -------- |
| FR-80 | Four KPI cards: pH, EC, TDS (ppm), water temperature, each with status and trend   | M        |
| FR-81 | Plant condition panel: 3 x 2 map of holes with status and confidence, plus counts  | M        |
| FR-82 | Line chart of pH and EC with ideal bands; stacked chart of plant condition per day | M        |
| FR-83 | Latest advice card, recent alerts, and a table of recent observations              | M        |

## 6. Non-functional requirements

| ID     | Category        | Requirement                                                                                                                   |
| ------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 | Performance     | Dashboard data refreshes every 5 to 10 seconds by polling                                                                     |
| NFR-02 | Performance     | One analysis cycle (crop, features, classify, store) completes within 3 seconds on the host computer (target, to be measured) |
| NFR-03 | Reliability     | Sensor or webcam outages are detected and shown; the rest of the app keeps working                                            |
| NFR-04 | Reliability     | Advice still appears when the LLM is unavailable (rule-based fallback)                                                        |
| NFR-05 | Security        | Passwords are hashed; tokens expire; secrets live only in environment files                                                   |
| NFR-06 | Security        | Device endpoints require an API key; all inputs are validated                                                                 |
| NFR-07 | Usability       | All UI text is in Bahasa Indonesia; the layout is responsive (desktop first)                                                  |
| NFR-08 | Maintainability | Code, files, and documentation are in English; linting and tests run in CI                                                    |
| NFR-09 | Reproducibility | Training and evaluation can be rerun from notebooks and recorded parameters                                                   |

## 7. Domain rules (summary)

Details and sources are in `Domain.md`.

- Ideal pH: 5.5 to 6.5.
- Ideal EC: 1.5 to 2.0 mS/cm.
- Ideal water temperature: configurable (placeholder 18 to 26 C, to be validated with an expert).
- TDS (ppm) = EC (mS/cm) x 500.
- Classes: `normal`, `n_deficiency`, `fe_deficiency`.
- Model features: Mean_R, Mean_G, Mean_B, pH, EC, Temperature.

## 8. Data and machine learning requirements

- The production dataset is captured with the same webcam and lighting used at runtime.
  Photos taken with a phone are used only to develop the preprocessing pipeline.
- Train and test splits are made per plant (no leakage between images of the same plant).
- Reported metrics: accuracy, macro precision, macro recall, macro F1, per-class recall,
  confusion matrix, and a confidence interval.
- C4.5 is the primary model. If a comparator is clearly better on real data, this is reported
  honestly and discussed with the supervisor.
- Known limitation: nitrogen-deficient samples are scarce so far. More samples are needed
  before final evaluation.

## 9. Acceptance criteria

1. A new sensor reading appears on the dashboard within 10 seconds of being sent.
2. The live camera page shows video with a 3 x 2 overlay and a status for each of the 6 holes.
3. Changing a leaf in front of the camera changes that hole's status only after the stabiliser
   window is satisfied, and then triggers advice.
4. With the LLM disabled, a deficiency still produces advice from the rule table.
5. The model comparison page shows all four models evaluated on the same held-out data.
6. A labelled snapshot can be exported in the specified column order.
7. A viewer account cannot change settings, labels, or devices.

## 10. Constraints and assumptions

- Runs on a single Windows host computer with Laragon (MySQL), Python 3.10, and Node.js.
- The development timeline is about four weeks.
- Internet access is needed only for the LLM; everything else works on a local network.
- The webcam is fixed; moving it requires re-calibrating the hole regions.
- Lighting is controlled and camera exposure and white balance are locked.

## 11. Risks and mitigations

| Risk                                       | Impact                        | Mitigation                                                 |
| ------------------------------------------ | ----------------------------- | ---------------------------------------------------------- |
| Too few N-deficient samples                | Model cannot learn that class | Collect more data; report limits honestly                  |
| Dataset camera differs from runtime camera | Colour shift, poor accuracy   | Capture the final dataset with the runtime webcam          |
| Lighting changes                           | Unstable features             | Fixed light, locked exposure and white balance, stabiliser |
| Free LLM quota changes or ends             | No generated advice           | Provider-agnostic advisor layer and rule-based fallback    |
| Webcam handled by multiple processes       | Camera errors                 | Only the vision worker opens the webcam                    |
| Tight schedule                             | Unfinished scope              | MoSCoW priorities; build in vertical slices                |

## 12. Milestones

| Week | Focus                                                                           |
| ---- | ------------------------------------------------------------------------------- |
| 1    | Backend foundation, database, authentication, sensor ingestion, dashboard shell |
| 2    | Vision worker, hole calibration, C4.5 integration, live camera page             |
| 3    | Advisor, alerts, dataset labelling, model comparison page, firmware             |
| 4    | Testing, data collection and evaluation, documentation, polish                  |

## 13. Open questions

1. Is Telegram notification in scope (FR-61)?
2. What is the validated ideal range for water temperature?
3. Which webcam model and resolution will be used?
4. Which LLM provider will be used for the advisor (free tier or paid)?
5. Can the primary model change if a comparator performs better, given the project title names C4.5?

## 14. Glossary

| Term       | Meaning                                                            |
| ---------- | ------------------------------------------------------------------ |
| NFT        | Nutrient Film Technique, a hydroponic method                       |
| EC         | Electrical conductivity of the nutrient solution (mS/cm)           |
| TDS        | Total dissolved solids, in ppm; derived from EC                    |
| ROI        | Region of interest, here the area of one plant hole in the frame   |
| C4.5       | Decision tree algorithm using gain ratio                           |
| Stabiliser | Logic that changes a status only after several consistent readings |
