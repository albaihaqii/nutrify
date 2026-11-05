# Design

| Field         | Value                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| Product       | Nutrify                                                                                                   |
| Version       | 0.1 (draft)                                                                                               |
| Design source | [`assets/design/nutrify-ui-design.html`](assets/design/nutrify-ui-design.html) (one canvas, 16 artboards) |
| Images        | [`assets/design/`](assets/design/) (16 PNG, numbered in artboard order)                                   |
| UI language   | Indonesian (strings live in `frontend/src/locales/id.ts`)                                                 |
| Last updated  | 2026-11-05                                                                                                |
| Related       | [PRD](PRD.md), [API](API.md), [Rules](Rules.md), [Schema](Schema.md)                                      |

This document turns the visual design into implementation rules: tokens, layout, component
mapping, screen-to-API mapping, and interface states. The PNG files are the visual reference.
Where this document and a PNG disagree, this document is corrected first, then the code.

## 1. Artboards

The HTML source opens in any browser and shows all 16 artboards. The PNG files show the same
screens.

| #   | Artboard                        | Viewport | Image                                                                |
| --- | ------------------------------- | -------- | -------------------------------------------------------------------- |
| 01  | Dashboard, light                | 1440     | [01-dashboard-light.png](assets/design/01-dashboard-light.png)       |
| 02  | Live camera, light              | 1440     | [02-live-camera-light.png](assets/design/02-live-camera-light.png)   |
| 03  | Dashboard, dark                 | 1440     | [03-dashboard-dark.png](assets/design/03-dashboard-dark.png)         |
| 04  | Live camera, dark               | 1440     | [04-live-camera-dark.png](assets/design/04-live-camera-dark.png)     |
| 05  | Dashboard, mobile               | 390      | [05-dashboard-mobile.png](assets/design/05-dashboard-mobile.png)     |
| 06  | Live camera, mobile             | 390      | [06-live-camera-mobile.png](assets/design/06-live-camera-mobile.png) |
| 07  | Login (initial and error state) | 1440     | [07-login.png](assets/design/07-login.png)                           |
| 08  | Plants                          | 1440     | [08-plants.png](assets/design/08-plants.png)                         |
| 09  | Reservoir sensors               | 1440     | [09-reservoir-sensors.png](assets/design/09-reservoir-sensors.png)   |
| 10  | History                         | 1440     | [10-history.png](assets/design/10-history.png)                       |
| 11  | Dataset                         | 1440     | [11-dataset.png](assets/design/11-dataset.png)                       |
| 12  | Models and evaluation           | 1440     | [12-models-evaluation.png](assets/design/12-models-evaluation.png)   |
| 13  | Advisor                         | 1440     | [13-advisor.png](assets/design/13-advisor.png)                       |
| 14  | Devices                         | 1440     | [14-devices.png](assets/design/14-devices.png)                       |
| 15  | Settings                        | 1440     | [15-settings.png](assets/design/15-settings.png)                     |
| 16  | Tokens and component inventory  | 1440     | [16-tokens-components.png](assets/design/16-tokens-components.png)   |

Only Dashboard and Live camera have dark and mobile versions. All other pages follow the same
tokens and the same responsive rules (section 5), and are built to work in both themes and on
mobile even though they have no separate artboard.

## 2. Design principles

- **One accent.** A single green primary colour for actions and focus. Colour elsewhere is
  reserved for status.
- **Status is never colour alone.** Every status uses colour, an icon, and a text label.
  Uncertain or offline states use a dashed outline.
- **Numbers are tabular.** Sensor values use tabular figures so columns do not jitter.
- **Advice is labelled as advice.** Every advice block states its source (LLM or fallback rules)
  and that the system takes no automatic action.
- **Placeholders are visible.** Illustrative values in the design are marked `[PLACEHOLDER]` or
  `[CONTOH]`; they are replaced by real data and are never shown as real results (section 9).

## 3. Design tokens

Themes are CSS variables, switched by a class on the root element (light, dark, or system).
Names below are the design names; section 3.2 maps them to shadcn/ui variables.

### 3.1 Colour

| Token     | Light     | Dark      | Use                                  |
| --------- | --------- | --------- | ------------------------------------ |
| `--bg`    | `#F5F6F3` | `#0F1512` | Page background                      |
| `--card`  | `#FFFFFF` | `#17201B` | Surfaces                             |
| `--fg`    | `#15201B` | `#E8EEEA` | Main text                            |
| `--mut`   | `#56635C` | `#9DAAA3` | Labels, helper text                  |
| `--bd`    | `#E1E5E0` | `#26332C` | Borders, dividers                    |
| `--soft`  | `#EEF1ED` | `#1E2923` | Hover, tabs track, skeleton          |
| `--pri`   | `#1F6B50` | `#5FC49A` | Primary accent: buttons, active line |
| `--onpri` | `#FFFFFF` | `#0B1A13` | Text on primary                      |
| `--ring`  | `#1F6B50` | `#5FC49A` | Focus ring                           |
| `--vid`   | `#18241E` | `#0A100D` | Video panel background               |

Status colours (background and foreground pairs for badges and plant cells):

| Status | Meaning              | `--*-b` light | `--*-f` light | `--*-b` dark | `--*-f` dark |
| ------ | -------------------- | ------------- | ------------- | ------------ | ------------ |
| `ok`   | Normal, ideal        | `#E3F3EA`     | `#14633F`     | `#173A2A`    | `#7FD9A8`    |
| `n`    | N deficiency         | `#FDF0D5`     | `#8A4B00`     | `#3D2D0C`    | `#F2C46B`    |
| `fe`   | Fe deficiency        | `#EEE8FB`     | `#5B33B0`     | `#2B2350`    | `#BBA6F5`    |
| `ck`   | Needs check, offline | `#ECEEED`     | `#46504A`     | `#252D29`    | `#B6C0BA`    |
| `lo`   | Sensor below range   | `#E4EEFB`     | `#1D4F9A`     | `#172E52`    | `#8DB8F5`    |
| `hi`   | Sensor above range   | `#FBE6E4`     | `#A12A22`     | `#4A1E1B`    | `#F5A39C`    |

Chart and marker colours:

| Token    | Light     | Dark      | Use                                       |
| -------- | --------- | --------- | ----------------------------------------- |
| `--c-ok` | `#2E9E6B` | `#4CC38A` | Normal bars and borders, ideal-range zone |
| `--c-n`  | `#E0A030` | `#F0B64A` | N deficiency                              |
| `--c-fe` | `#8B6BDB` | `#A48BF0` | Fe deficiency                             |
| `--c-ck` | `#9AA5A0` | `#8A968F` | Needs check, offline                      |
| `--c-ec` | `#2A6FBF` | `#7DB1F2` | EC line (pH uses the primary colour)      |

### 3.2 Mapping to shadcn/ui variables

| Design token         | shadcn/ui variable                          |
| -------------------- | ------------------------------------------- |
| `--bg`               | `--background`                              |
| `--fg`               | `--foreground`                              |
| `--card`             | `--card`, `--popover`                       |
| `--fg` on `--card`   | `--card-foreground`, `--popover-foreground` |
| `--mut`              | `--muted-foreground`                        |
| `--soft`             | `--muted`, `--accent`, `--secondary`        |
| `--bd`               | `--border`, `--input`                       |
| `--pri`              | `--primary`                                 |
| `--onpri`            | `--primary-foreground`                      |
| `--ring`             | `--ring`                                    |
| `--hi-f` on `--hi-b` | `--destructive` and its foreground          |

The status, chart, and video tokens have no shadcn equivalent and are added as extra variables
(for example `--status-ok-bg`, `--status-ok-fg`, `--chart-ec`), exposed to Tailwind as theme
colours. The template defines colours in OKLCH; hex values may be used directly or converted,
as long as light and dark both come from this table.

### 3.3 Typography

Font: **Inter** (400, 500, 600, 700). Sensor values use `font-variant-numeric: tabular-nums`.

| Role                     | Size             | Weight | Example                    |
| ------------------------ | ---------------- | ------ | -------------------------- |
| Page title               | 24 px            | 700    | Dashboard                  |
| KPI value                | 34 px            | 700    | 6,1                        |
| Card title               | 15 px            | 600    | Kondisi Tanaman            |
| Body                     | 14 px            | 400    | Data terakhir 1 menit lalu |
| Label, badge             | 12 px            | 600    | Defisiensi N               |
| Section label in sidebar | 11 px, uppercase | 600    | UTAMA                      |

Number format in the UI is Indonesian: decimal comma (`6,1`), thousands separator dot
(`1.440`). Use `Intl.NumberFormat('id-ID')` in one shared helper.

### 3.4 Radius and spacing

| Token                      | Value                   |
| -------------------------- | ----------------------- |
| Radius sm / md / lg / full | 6 / 8 / 12 / pill       |
| Spacing scale              | 4, 8, 16, 24, 32, 48 px |

Cards: radius 12, padding 20, 1 px border, no heavy shadow. Buttons and inputs: radius 8,
minimum height 40 px (small buttons 32 px). Badges and chips: full radius.

## 4. Layout

### 4.1 Application shell (desktop)

| Region  | Rule                                                                                       |
| ------- | ------------------------------------------------------------------------------------------ |
| Sidebar | 248 px wide, grouped navigation, collapsible, user card at the bottom                      |
| Header  | At least 64 px: breadcrumb, search (`Ctrl+K`), status chips, theme toggle, user menu       |
| Content | 24 px padding, 24 px gap between blocks                                                    |
| Grids   | 4 columns for KPI cards, 3 for plant map and similar, 2/1 splits for chart plus side panel |

Sidebar navigation (group, label, route, icon):

| Group      | Label            | Route          | Icon (design) |
| ---------- | ---------------- | -------------- | ------------- |
| Utama      | Dashboard        | `/`            | home          |
| Utama      | Live Kamera      | `/live-camera` | camera        |
| Utama      | Tanaman          | `/plants`      | leaf          |
| Data       | Sensor Tandon    | `/sensors`     | gauge         |
| Data       | Riwayat          | `/history`     | clock         |
| Data       | Dataset          | `/dataset`     | database      |
| Kecerdasan | Model & Evaluasi | `/models`      | tree          |
| Kecerdasan | Penasihat        | `/advisor`     | sparkle       |
| Sistem     | Perangkat        | `/devices`     | cpu           |
| Sistem     | Pengaturan       | `/settings`    | sliders       |

Icons come from lucide (the icon set used by shadcn/ui); the design icons map one-to-one.

Header status chips show Webcam, Sensor, and Advisor state as a dot plus text (`online`, or an
outlined dot for offline).

### 4.2 Mobile (390 px)

- The sidebar becomes a sheet opened from a menu button.
- KPI cards stack in a 2-column grid; plant map keeps 3 x 2.
- Time-range tabs shorten (`1J`, `24J`, `7H`).
- Tables scroll horizontally inside their card, never the page.
- Side panels (context, advice) stack under the main panel.
- Touch targets stay at least 40 px.

## 5. Status vocabulary

The UI shows four plant statuses. Three come from the model, one from quality control.

| UI status     | Indonesian label | Source (API)                                | Icon  | Style            |
| ------------- | ---------------- | ------------------------------------------- | ----- | ---------------- |
| Normal        | Normal           | `stable_class = normal`                     | check | `ok`, solid      |
| N deficiency  | Defisiensi N     | `stable_class = n_deficiency`               | alert | `n`, solid       |
| Fe deficiency | Defisiensi Fe    | `stable_class = fe_deficiency`              | drop  | `fe`, solid      |
| Needs check   | Perlu Dicek      | `qc_status = needs_check` or `invalid_leaf` | help  | `ck`, **dashed** |
| No result yet | Belum ada data   | `current_class = null`                      | none  | `ck`, dashed     |

Sensor values use `in_range` (label "Ideal"), `low` ("Rendah"), `high` ("Tinggi") with the
`ok`, `lo`, `hi` pairs. Device state uses `online` and `offline` (dashed).

Plant labels are `L1` to `L6` ("Lubang" 1 to 6), built from `position`.

Advice severity labels: `info` shows "Info", `warning` shows "Sedang", `critical` shows
"Tinggi" (proposed mapping; the design shows "Sedang").

## 6. Screens

Each screen lists its contents, the API calls it needs ([API](API.md)), and who can use it.
All pages handle loading, empty, error, and stale states (section 8).

| Screen                | Route          | Main content                                                                                                                                                                                                                                                            | API                                                                                                                                                               | Access                                  |
| --------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Login                 | `/login`       | Email and password form; error state "Gagal masuk"                                                                                                                                                                                                                      | `POST /auth/login`                                                                                                                                                | Public                                  |
| Dashboard             | `/`            | 4 KPI cards (pH, EC, TDS, water temperature) with ideal-range bar and change vs 1 hour ago; pH and EC chart with ideal band and 1h/24h/7d tabs; plant status map and counts; daily status chart; latest advice; latest alerts; latest observations; model accuracy card | `GET /dashboard/summary`, `GET /sensor-readings`, `GET /advice/latest`, `GET /alerts`, `GET /observations`, `GET /models`                                         | Viewer                                  |
| Live camera           | `/live-camera` | Annotated video with 6 regions; snapshot, pause, fullscreen; time of last analysis; sensor context; C4.5 result and rule path per plant; comparator agreement; advice                                                                                                   | `GET /camera/stream`, `GET /camera/status`, `POST /camera/captures`, `GET /plants`, `GET /plants/{position}`, `GET /sensor-readings/latest`, `GET /advice/latest` | Viewer (snapshot: admin)                |
| Plants                | `/plants`      | 3 x 2 plant list; detail for the selected plant: latest photo, leaf segmentation, mean RGB, rule path, status history                                                                                                                                                   | `GET /plants`, `GET /plants/{position}`, `GET /observations`                                                                                                      | Viewer                                  |
| Reservoir sensors     | `/sensors`     | One chart per metric with ideal band; data table; CSV export                                                                                                                                                                                                            | `GET /sensor-readings`, `GET /settings`                                                                                                                           | Viewer                                  |
| History               | `/history`     | Observations table with filters (date range, plant, status) and pagination; advice history                                                                                                                                                                              | `GET /observations`, `GET /advice`                                                                                                                                | Viewer                                  |
| Dataset               | `/dataset`     | Snapshots to label (unlabeled, labeled, all); label control; CSV export; column order note                                                                                                                                                                              | `GET /observations`, `PATCH /observations/{id}/label`, `GET /dataset/summary`, `GET /dataset/export`                                                              | Viewer (view), Admin (label, export)    |
| Models and evaluation | `/models`      | C4.5 primary and three comparators; metrics table; confusion matrix; rule tree; "try a prediction" form                                                                                                                                                                 | `GET /models`, `GET /models/active/tree`                                                                                                                          | Viewer                                  |
| Advisor               | `/advisor`     | Advice history with source filter; fallback rules table                                                                                                                                                                                                                 | `GET /advice`, `POST /advice/generate`                                                                                                                            | Viewer (rules read-only for viewer)     |
| Devices               | `/devices`     | Webcam card; ESP32 card with firmware and last seen; API key reveal and rotate with confirmation                                                                                                                                                                        | `GET /devices`, `POST /devices/{id}/rotate-key`                                                                                                                   | Admin (key section hidden from viewers) |
| Settings              | `/settings`    | Sensor thresholds; analysis interval; auto-save snapshots; camera calibration with 6 draggable boxes; account; theme (light, dark, system)                                                                                                                              | `GET /settings`, `PUT /settings`, `PUT /auth/password`                                                                                                            | Viewer (account, theme), Admin (rest)   |

Page-level rules:

- The page title block shows a short description and, where relevant, the age of the data
  ("Data terakhir 1 menit lalu").
- Tables use TanStack Table. Filters sit top left, export top right.
- The Dashboard "Detail" and "Lihat semua" links go to the matching full page.
- Rule paths use Indonesian feature labels in the UI (`Mean_G`, `EC`) as they appear in the
  design; the raw feature names come from the API.

## 7. Component inventory

Mapping of each design element to shadcn/ui, from artboard 16.

| Element                                   | shadcn/ui component                               | Note                                                               |
| ----------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| Grouped, collapsible sidebar              | Sidebar                                           | Template shadcn-admin; becomes a Sheet on mobile                   |
| Header, breadcrumb                        | Breadcrumb, Separator                             |                                                                    |
| Search `Ctrl+K`                           | Command (CommandDialog)                           |                                                                    |
| Status chips Webcam, Sensor, Advisor      | Badge (outline)                                   | Dot plus text, not colour alone                                    |
| Theme toggle, user menu                   | Button (icon), DropdownMenu                       |                                                                    |
| KPI card                                  | Card, Badge, Chart (Recharts sparkline), Progress | Custom ideal-range bar on top of Progress                          |
| pH and EC chart, daily bars               | Chart (Recharts LineChart, BarChart)              | `ReferenceArea` for the ideal band                                 |
| Time range 1 hour, 24 hours, 7 days       | Tabs or ToggleGroup                               |                                                                    |
| 3 x 2 plant map                           | Card, Badge                                       | Status = colour, icon, text                                        |
| Observation, history, sensor tables       | Table plus TanStack Table                         | Filters top left, export top right                                 |
| Date, plant, status filters               | Popover plus Calendar, Select                     |                                                                    |
| C4.5 rule path                            | Collapsible or Accordion                          |                                                                    |
| Advice, alerts                            | Card, Alert                                       | Source label: LLM or fallback rules                                |
| Dataset label                             | ToggleGroup (single)                              |                                                                    |
| Threshold form, try-a-prediction, account | Form, Input, Label, Select                        |                                                                    |
| Switch                                    | Switch                                            |                                                                    |
| Rotate API key confirmation               | AlertDialog or Dialog                             | Destructive actions always need confirmation                       |
| Notifications                             | Sonner (Toast)                                    |                                                                    |
| Loading                                   | Skeleton                                          |                                                                    |
| Icon tooltips                             | Tooltip                                           |                                                                    |
| Camera calibration (6 boxes)              | **Custom component**                              | No shadcn equivalent; drag and resize boxes over a reference frame |

Custom components to build (not in shadcn/ui): ideal-range bar, plant cell with status,
status badge (`ok`, `n`, `fe`, `ck`, dashed variant), camera calibration editor, rule-path list.

## 8. Interface states

Every data view implements these. Examples below come from artboard 16 and the screens.

| State               | Pattern                                                           | Example text (Indonesian)                                                          | Trigger                     |
| ------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------- |
| Loading             | Skeleton blocks matching the final layout                         | none                                                                               | Query pending               |
| Empty               | Short explanation plus the next action                            | "Belum ada snapshot. Ambil snapshot dari Live Kamera untuk mulai membuat dataset." | List with zero items        |
| Error               | Alert with retry button                                           | "Gagal memuat data. Coba lagi"                                                     | Query error                 |
| Stale data          | Muted note with the data age; value shown with an outlined marker | "Data terakhir 14 menit lalu"                                                      | `is_stale = true`           |
| Device offline      | Dashed chip, last-seen time                                       | "Offline · terakhir 14 menit lalu"                                                 | Device `status = offline`   |
| Advisor unavailable | Notice, advice source switches to fallback                        | "Penasihat LLM tidak tersedia. Menampilkan Aturan Cadangan."                       | Advice `source = rules`     |
| Login error         | Red border on fields, inline message                              | "Gagal masuk. Email atau kata sandi salah. Periksa lalu coba lagi."                | `401 invalid_credentials`   |
| Forbidden           | Page or section hidden for viewer; direct URL shows a notice      | none                                                                               | Role check, `403 forbidden` |

All strings live in `locales/id.ts`. Error codes from the API map to messages through one table.

## 9. Placeholders in the design

These values are illustrative and must not be treated as results:

- Model comparison numbers, confusion matrix, and the rule tree on the Models page.
- Mean RGB values and the rule path on the Plants page.
- Rule path example on the Live camera page.
- Dataset snapshot examples and the "try a prediction" output.
- Firmware version, analysis interval, and advice text on Devices and Advisor.
- Advice wording: it must be validated by a hydroponics expert before use ([Domain](Domain.md)).

The implementation shows real data or an honest empty state, never the sample numbers.

## 10. Accessibility

- Status carries colour, icon, and text. Offline and uncertain use dashed outlines.
- Visible focus ring (2 px, `--ring`) on every interactive element.
- Minimum touch target 40 px (32 px only for dense table actions on desktop).
- Charts have a text alternative (a visible table or summary) and the ideal range is stated in
  text, not only as a coloured band.
- Both themes must meet text contrast requirements; check the final values with a contrast
  checker when the tokens are wired in.
- Respect `prefers-reduced-motion` and `prefers-color-scheme` (the "Sistem" theme option).
- Form fields have labels and error text linked to the field.

## 11. Gaps between the design and the other documents

The design shows several things that the current API, schema, or ML decisions do not yet
provide. Each needs a decision before the screen is built.

| #   | Design shows                                                                                                                                              | Current documents                                                                                  | Proposed resolution                                                                                                                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Comparator agreement ("Model lain sepakat?", "sepakat 3 dari 3", "L6 ditandai Perlu Dicek karena model tidak sepakat") on Dashboard, Live camera, History | Comparators run offline only; consensus is optional and off by default; no column stores the votes | Decide whether the consensus check is part of version 1. If yes: enable it, add an `agreement` JSON column to `observations`, return it in the API. If no: hide the column and the agreement panel, keep the "Try a prediction" form on the Models page for offline comparison |
| 2   | "Try a prediction" form (manual features, shows C4.5 and comparator results)                                                                              | No endpoint                                                                                        | Add `POST /models/predict` (viewer), body: six features, response: class and confidence per model                                                                                                                                                                              |
| 3   | Plant "Foto terbaru" and "Segmentasi daun"; dataset thumbnails                                                                                            | Only full-frame captures are stored                                                                | Add `GET /observations/{id}/image?kind=crop\|mask`, or store crop paths per observation                                                                                                                                                                                        |
| 4   | CSV export on Sensors and History pages                                                                                                                   | Only dataset export exists                                                                         | Add `GET /sensor-readings/export` and `GET /observations/export`                                                                                                                                                                                                               |
| 5   | "Kondisi Tanaman per Hari" stacked daily chart                                                                                                            | No aggregate                                                                                       | Add `GET /plants/status-history?days=7` returning counts per class per day                                                                                                                                                                                                     |
| 6   | KPI change "vs 1 jam lalu"                                                                                                                                | Latest reading has no delta                                                                        | Return `change_1h` in the latest reading, or compute it from history in the frontend                                                                                                                                                                                           |
| 7   | Advisor status chip in the header                                                                                                                         | `system` block has sensor node and webcam only                                                     | Add `advisor: { status, provider }` to `GET /dashboard/summary`                                                                                                                                                                                                                |
| 8   | "Interval analisis 60 detik" in Devices and Settings                                                                                                      | Analysis runs every 10 s; storing every 60 s                                                       | Treat the design value as a placeholder. Expose both `analysis_interval_seconds` and `observation_store_interval_seconds` in Settings                                                                                                                                          |
| 9   | "Simpan snapshot otomatis ke dataset" switch                                                                                                              | No such setting                                                                                    | Add setting `auto_save_snapshots` (boolean) to the schema                                                                                                                                                                                                                      |
| 10  | Fallback rules editable by admin ("Ubah")                                                                                                                 | Rules are code in `advisor/rules.py`                                                               | Version 1: show rules read-only. Editing needs a table or setting for rules, planned later                                                                                                                                                                                     |
| 11  | Account section edits name and email                                                                                                                      | Only `PUT /auth/password` exists                                                                   | Add `PATCH /auth/me` for name, or make name and email read-only                                                                                                                                                                                                                |
| 12  | Status "Perlu Dicek" and "Belum ada data"                                                                                                                 | `qc_status` and `current_class = null`                                                             | Mapping in section 5; confirm that `invalid_leaf` should also display as "Perlu Dicek"                                                                                                                                                                                         |

Items 2 to 9 and 11 are additions to [API](API.md) and [Schema](Schema.md); they are written
into those documents when each screen is built, in the same pull request.

## 12. Implementation notes

- Build order follows the roadmap: tokens and shell first, then Login, Dashboard, Live camera,
  and the remaining pages.
- Clean the template first: remove pages and dependencies that Nutrify does not use (Tasks,
  Chats, Apps, Users, Clerk authentication), keep the sidebar, header, theme, and command
  components.
- Replace the template authentication with the backend login (`POST /auth/login`, token in
  memory and `sessionStorage` or a secure cookie decision recorded in an ADR).
- Theme choice (light, dark, system) is stored in `localStorage` as a per-viewer convenience,
  wrapped in try and catch.
- Routes are English paths; labels come from `locales/id.ts`.
