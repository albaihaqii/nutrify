# Nutrify

Real-time nutrient deficiency monitoring for NFT hydroponic pakcoy, combining computer vision,
water-quality sensors, a Decision Tree C4.5 classifier, and an LLM-based advisor.

> Final project, Politeknik Negeri Jember. The web interface is in Bahasa Indonesia;
> code, documentation, and file names are in English.

## What it does

- Streams a webcam view of 6 plant holes (3 x 2) and classifies each hole as
  `normal`, `n_deficiency`, or `fe_deficiency`.
- Reads tank pH, EC, TDS, and water temperature from an ESP32 with sensors.
- Shows a dashboard with live values, trends, plant status, alerts, and history.
- Gives advice (suggestions only, never automatic control) through an LLM advisor
  with a rule-based fallback.
- Compares C4.5 (primary model) with SVM, Naive Bayes, and Random Forest.

## Tech stack

| Layer            | Technology                                                                              |
| ---------------- | --------------------------------------------------------------------------------------- |
| Frontend         | Vite, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Router/Query/Table, Recharts |
| Backend          | Flask, SQLAlchemy, Flask-Migrate, Flask-JWT-Extended                                    |
| Database         | MySQL (Laragon)                                                                         |
| Vision           | OpenCV                                                                                  |
| Machine learning | pandas, scikit-learn, C4.5                                                              |
| IoT              | ESP32, pH / EC / DS18B20 sensors, PlatformIO                                            |

## Repository layout

```
docs/       Product, architecture, design, schema, and rules documents
frontend/   Web dashboard
backend/    REST API and vision worker
ml/         Notebooks, training code, and model artifacts
firmware/   ESP32 sensor node
scripts/    Setup and development helpers
```

## Getting started

See [docs/Setup.md](docs/Setup.md) (in progress).

## Status

Early development. See [docs/Roadmap.md](docs/Roadmap.md) (in progress).

## License

MIT. See [LICENSE](LICENSE).
