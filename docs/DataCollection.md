# Data Collection

| Field     | Value                                                                        |
| --------- | ---------------------------------------------------------------------------- |
| Product   | Nutrify                                                                      |
| Version   | 0.1 (draft)                                                                  |
| Scope     | Primary images from the miniature, for model version 1 evaluation            |
| Workspace | `ml/data/raw/webcam/`                                                        |
| Related   | [ML](ML.md), [Hardware](Hardware.md), [Rules](Rules.md), [Schema](Schema.md) |

## 1. Purpose

The version 1 model is trained on a secondary image dataset (another camera, lighting, and
background). Its cross-validation score does not describe how it behaves on the project's own
webcam. This guide defines how to collect primary images from the miniature so that:

1. the trained model can be tested honestly on the real camera (external check);
2. if the result is poor, the model can be retrained with real webcam data.

Primary images are taken from the miniature with the final camera and settings, not with a phone.

## 2. Principles

- The unit of data is one plant on one day (an independent source), not one frame. Frames of the
  same plant taken minutes apart are nearly identical and count as one source.
- Labels come from people (team, grower, lecturer), matched with the nutrient treatment. A label
  is never taken from a model prediction.
- Frames are stored whole and unedited. Cropping to the hole region is done by the pipeline.
- Primary images are first used as an external check. They enter training only after the result
  of that check is recorded.

## 3. Before capturing

| Item               | Rule                                                                         |
| ------------------ | ---------------------------------------------------------------------------- |
| Exposure           | Locked manually, not automatic                                               |
| White balance      | Locked manually                                                              |
| Focus              | Fixed                                                                        |
| Lighting           | Fixed schedule (grow light). If sunlight reaches the plants, record the time |
| Camera position    | Fixed. If it moves, mark the date and redo the hole regions                  |
| Hole regions (ROI) | Defined once per hole and kept for the whole collection                      |
| Background         | Clean and the same for every hole                                            |

Capture goes through the Nutrify app so that resolution and compression match runtime.

## 4. Plants and labels

- Three classes: `normal`, `n_deficiency`, `fe_deficiency`.
- The miniature has six holes, so one round can hold two plants per class. Repeat with different
  plants on different days.
- Every plant gets an identifier (`plant-07`) that never changes and is never reused.
- The label is confirmed by at least one person other than the one who set up the treatment, and
  the name is recorded.

## 5. Capturing

| Rule                   | Value                                                          |
| ---------------------- | -------------------------------------------------------------- |
| Frames per session     | 3 to 5                                                         |
| Sessions per plant     | Several, at different hours or days (morning, noon, lamp only) |
| Frames within a minute | Do not take dozens                                             |
| Empty or covered holes | Add a few, to test the `invalid_leaf` check                    |
| Edits                  | None: no crop, filter, or rename after saving                  |

## 6. File names and log

File name: `plant-<id>_<yyyymmdd>_<hhmm>_<hole>.jpg`, for example `plant-07_20261125_0900_h3.jpg`.

Images are stored in `ml/data/raw/webcam/<class>/`. A log file `ml/data/raw/webcam/log.csv`
has one row per image:

| Column     | Meaning                                      |
| ---------- | -------------------------------------------- |
| `image_id` | File name                                    |
| `plant_id` | Plant identifier                             |
| `hole`     | Hole number 1 to 6                           |
| `date`     | `yyyy-mm-dd`                                 |
| `label`    | Class code                                   |
| `labeller` | Person who confirmed the label               |
| `lighting` | `lamp`, `daylight`, or `mixed`               |
| `notes`    | Free text (for example leaf age, wet leaves) |

The source group of an image is `plant_id` plus `date`.

## 7. Target amounts (initial guide)

| Purpose                                   | Plant-days per class |
| ----------------------------------------- | -------------------- |
| Rough external check of the current model | About 10 or more     |
| Retraining with webcam data               | 30 or more           |

These are starting points. The wider the interval in the result, the more data is needed.

## 8. Do not

- Augment images before the split.
- Put the same plant, or the same plant on the same day, on both sides of a split.
- Remove images because the model got them wrong.
- Label from the model, or relabel after seeing predictions.
- Change camera settings during a collection without recording it.

## 9. Use of the data

1. Pilot: collect for one or two days and review a few frames and the log before collecting more.
2. External check: run the locked version 1 model on all primary images, report accuracy, macro
   F1, and per-class recall, and show the confusion matrix. Compute the leaf area limits again on
   webcam images before using them at runtime (see [ML](ML.md), section 5).
3. Retraining: if the check is poor, add webcam images to training, split by plant and day, and
   repeat notebooks 02 to 07. The result is a new immutable model version.

Sensor values are stored with each observation by the app. They are not used by version 1 and
become inputs in version 2 (see [ML](ML.md), section 7.5).
