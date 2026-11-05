# Domain Knowledge

| Field        | Value                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------- |
| Product      | Nutrify                                                                                  |
| Version      | 0.1 (draft)                                                                              |
| Status       | Working reference. Values marked **to validate** must be confirmed by an agronomy expert |
| Last updated | 2026-11-05                                                                               |
| Related      | [PRD](PRD.md), [ML](ML.md), [Hardware](Hardware.md), [Schema](Schema.md)                 |

This document explains the plant and water science behind the system, so that thresholds, rules,
and advice texts have a written basis. It is not a cultivation manual.

## 1. Crop and system

| Item                   | Description                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------- |
| Crop                   | Pakcoy (pak choi, _Brassica rapa_ subsp. _chinensis_), a fast-growing leafy vegetable |
| System                 | Nutrient Film Technique (NFT) hydroponics                                             |
| Layout in this project | 6 plant holes (3 x 2) seen by one webcam                                              |

In NFT, a thin film of nutrient solution flows continuously along a slightly sloped channel,
and roots take up water and nutrients from that film. The plant has no soil buffer, so a change
in the solution (pH, concentration, temperature) reaches the plant quickly. This is why
monitoring the solution matters as much as watching the leaves.

## 2. Water parameters

Ranges below are the project defaults. They are editable in settings and are placeholders until
validated for the actual variety, growth stage, and nutrient product.

| Parameter         | Sensor          | Default range | Unit     | Status                                  |
| ----------------- | --------------- | ------------- | -------- | --------------------------------------- |
| pH                | Analog pH probe | 5.5 to 6.5    | unitless | Common hydroponic range for leafy crops |
| EC                | EC probe        | 1.5 to 2.0    | mS/cm    | To validate for pakcoy and growth stage |
| TDS               | Derived from EC | 750 to 1000   | ppm      | Follows from EC with the factor below   |
| Water temperature | DS18B20         | 18 to 26      | Celsius  | **To validate** (placeholder)           |

### 2.1 pH

pH controls which nutrients the roots can absorb. Outside the ideal range, nutrients can be
present in the solution but unavailable to the plant.

- **Too high** (above the range): iron, and also manganese and phosphorus, become less
  available. This is a common cause of iron-deficiency symptoms even when iron is in the tank.
- **Too low** (below the range): can stress or damage roots and upset calcium and magnesium
  uptake.

### 2.2 EC (electrical conductivity)

EC measures the total dissolved salts, so it indicates how concentrated the nutrient solution
is.

- **Too low**: nutrients are depleted or too diluted. Plants run short of nitrogen first
  because they consume it in large amounts.
- **Too high**: salt stress, burnt leaf edges, and reduced water uptake.

EC targets depend on the growth stage: seedlings tolerate and need a lower concentration than
mature plants. The system currently uses one range for all stages (limitation, see section 8).

### 2.3 TDS conversion

TDS is shown in ppm and is derived from EC:

```
tds_ppm = ec (mS/cm) x 500
```

The factor 500 is one of two common conventions (the other is 640). The factor changes the
displayed ppm but not the underlying measurement, so the project fixes 500 and shows it in the
UI. Do not compare ppm with a source that uses a different factor without converting.

### 2.4 Water temperature

Temperature affects dissolved oxygen, root health, and nutrient uptake.

- **Too high**: less dissolved oxygen and higher risk of root disease; roots weaken.
- **Too low**: slows uptake and growth.

EC readings also change with temperature (conductivity rises as the solution warms). Confirm
whether the EC module compensates for temperature; if it does not, the raw value is only
comparable at similar temperatures. See [Hardware](Hardware.md).

## 3. Plant classes

### 3.1 Normal

Leaves are uniformly green for the growth stage, with no widespread yellowing, spots, or
curling. "Normal" in this system means _no visible nitrogen or iron deficiency_. It does not mean
the plant is free of every other problem.

### 3.2 Nitrogen deficiency (`n_deficiency`)

| Aspect          | Description                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Where it starts | **Older, lower leaves** first, because nitrogen is mobile and the plant moves it to new growth |
| Look            | Uniform pale green to yellow across the whole leaf, veins included; slow, stunted growth       |
| Progression     | Yellowing spreads upward; older leaves may drop                                                |
| Typical causes  | Low nutrient concentration (low EC), depleted nutrient solution, imbalance in the nutrient mix |

Colour signature the camera can use: higher red and green relative to a healthy leaf with lower
saturation, i.e. a shift from deep green towards yellow-green over the whole leaf.

### 3.3 Iron deficiency (`fe_deficiency`)

| Aspect          | Description                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Where it starts | **Youngest, upper leaves** first, because iron is immobile inside the plant                                                          |
| Look            | **Interveinal chlorosis**: tissue between veins turns yellow or whitish while the veins stay green; severe cases bleach almost white |
| Progression     | New growth emerges pale; stunting follows                                                                                            |
| Typical causes  | pH too high (iron becomes unavailable), iron chelate depleted or unsuitable for the pH, nutrient imbalance                           |

Colour signature: a yellow to pale-white leaf with a green vein pattern. A mean colour over
the whole leaf blurs the vein pattern, so mean RGB mainly captures overall paleness.

### 3.4 Why the two are separable, and where they are not

The tell-tale differences are _which leaves_ are affected and _whether veins stay green_. The
current features (mean RGB over the masked leaf) do not encode leaf age or vein pattern. They
see overall colour, plus the water measurements. Therefore:

- The model can separate classes where overall colour and water chemistry differ.
- It can confuse early nitrogen and iron deficiency, because both start as pale green.
- Water values help: high pH favours the iron explanation, low EC favours nitrogen.

This is the main reason for the feature ablation in [ML](ML.md) section 4.1: it shows how much
comes from the leaf and how much from the water.

### 3.5 Look-alikes that are not covered

The system has only three classes. Other problems can look similar and will be misclassified:

- Magnesium or sulphur deficiency (yellowing patterns that differ in position)
- Natural senescence of old leaves
- Too little light, or light colour changes
- Root disease or heat stress
- Pests and fungal disease
- Tip burn from high EC or poor calcium transport

Advice texts must therefore speak of _signs consistent with_ a deficiency, not a confirmed
diagnosis.

## 4. Rule-based advice (fallback)

When the language model is unavailable or returns invalid output, the backend falls back to the
rules below (`advisor/rules.py`). The same logic also gives the language model its facts. The
rules deliberately give **direction and caution, not doses**, because correct amounts depend
on the nutrient product, tank volume, and plant stage.

### 4.1 From sensor values

| Condition                       | Likely cause                           | Suggested direction                                                 |
| ------------------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| pH above range                  | Alkaline water or nutrient imbalance   | Lower pH gradually with a pH-down product, re-measure after mixing  |
| pH below range                  | Acidic drift or over-correction        | Raise pH gradually with a pH-up product, re-measure                 |
| EC below range                  | Solution diluted or nutrients depleted | Add nutrient solution gradually, re-measure                         |
| EC above range                  | Solution too concentrated              | Dilute with clean water, re-measure                                 |
| Temperature above range         | Warm ambient or sun on the reservoir   | Shade or insulate the reservoir, improve aeration, consider cooling |
| Temperature below range         | Cold ambient                           | Insulate the reservoir, check placement                             |
| Sensor reading stale or missing | Device offline or sensor fault         | Check power, Wi-Fi, and the sensor connection                       |

General guidance in every advice text: change one thing at a time, adjust in small steps,
re-measure after the solution has mixed, and follow the nutrient product label.

### 4.2 From plant status

| Status          | Check first               | Suggested direction                                                         |
| --------------- | ------------------------- | --------------------------------------------------------------------------- |
| `n_deficiency`  | EC, nutrient solution age | If EC is low, restore concentration gradually; check the nutrient mix       |
| `fe_deficiency` | pH, iron source           | If pH is high, bring it into range first; check the iron supply and chelate |
| `normal`        | none                      | No action; keep monitoring                                                  |

Water chemistry is checked **before** recommending nutrient additions, because a pH problem
makes added nutrients useless.

## 5. Facts passed to the advisor

The language model receives only measured facts. It never decides the class.

| Fact                                                                  | Source                             |
| --------------------------------------------------------------------- | ---------------------------------- |
| Plant position and status                                             | Stabilised classifier output       |
| Confidence and rule path                                              | Classifier                         |
| pH, EC, TDS, temperature and their status (`low`, `in_range`, `high`) | Latest sensor reading and settings |
| How long the status has lasted                                        | Plant record                       |
| Active alerts                                                         | Alerts table                       |

It must return JSON with `summary`, `likely_causes`, `suggested_actions`, and `severity`, in
Indonesian, and the backend validates this structure. Invalid output triggers the rule-based
fallback above.

## 6. Sensors and measurement quality

| Topic              | Practice                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| pH probe           | Calibrate with buffer solutions (for example pH 4.01 and 6.86 or 7.00); recalibrate regularly because probes drift                            |
| EC probe           | Calibrate with a standard solution (for example 1.413 mS/cm); clean the probe                                                                 |
| Storage            | Do not let probes dry out; follow the manufacturer's storage instructions                                                                     |
| Placement          | Keep probes where the solution is mixed, away from the dosing point                                                                           |
| Cross-interference | An analog pH probe and an EC probe in the same tank can disturb each other; use isolation or alternate readings (see [Hardware](Hardware.md)) |
| Sanity checks      | Reject physically impossible values (pH outside 0 to 14, DS18B20 `-127`)                                                                      |

Uncalibrated sensors make every threshold meaningless. Calibration dates should be recorded
when the hardware is set up.

## 7. Growth stage

Pakcoy grows quickly (roughly a month from transplant to harvest under good conditions).
Nutrient demand and appropriate EC change with age. Version 1 does not track growth stage; the
dataset should record the approximate plant age so models can later be checked for age effects.

## 8. Assumptions and limitations

- Ranges for EC and temperature are project placeholders until validated.
- One EC range is used for all growth stages.
- The system recognises nitrogen and iron deficiency only (see section 3.5).
- Advice is generic decision support, not a prescription, and has not yet been reviewed by an
  agronomist.

## 9. Validation checklist

Complete before the final demonstration and record the outcome here.

| Item                                           | Reviewer                      | Done |
| ---------------------------------------------- | ----------------------------- | ---- |
| EC range for pakcoy by growth stage            | Agronomy expert or supervisor | No   |
| Water temperature range                        | Agronomy expert or supervisor | No   |
| Advice texts in section 4                      | Agronomy expert               | No   |
| Class labels on training images (sample check) | Agronomy expert               | No   |
| Choice of TDS factor (500)                     | Supervisor                    | No   |

## 10. References to collect

Citations must come from sources that have been read and checked, not from memory. Collect and
list here:

- A hydroponic pakcoy cultivation guide from an agricultural extension or university source
  (pH, EC, temperature, growth period).
- A plant nutrition reference on nitrogen and iron deficiency symptoms and mobility.
- The manufacturer datasheets for the pH probe, EC probe, and DS18B20.
- The datasheet or manual of the nutrient product used.
