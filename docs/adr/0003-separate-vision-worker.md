# 0003. Separate vision worker process

| Field  | Value      |
| ------ | ---------- |
| Status | Accepted   |
| Date   | 2026-11-05 |

## Context

Exactly one program can hold the webcam. The webcam must be read continuously, frames must be
analysed on a schedule, and the web API must stay responsive. The Flask development server
restarts its process on code changes, and web workers may run in several processes, which would
fight over the device.

## Decision

- A separate process, `backend/run_worker.py`, owns the webcam. It captures frames, runs the
  preprocessing and classifier, draws the annotated frame, and stores observations.
- The worker writes the latest annotated frame to `storage/live/` **atomically** (write to a
  temporary file, then replace), so a reader never sees a half-written image.
- The API never opens the camera. It serves the latest stored frame as MJPEG
  (`/api/camera/stream`) and as a snapshot.
- The worker shares the backend service layer and writes to the database directly. It is not
  an HTTP client of the API.

## Consequences

- Two processes must run during development and in production (API and worker), plus MySQL.
  Helper scripts start them together.
- The hand-off is a file, which needs no message broker. Stream latency is about one frame
  interval, which is enough for monitoring.
- A camera failure or restart does not take the API down; the API reports the camera as
  offline when the stored frame becomes old.
- On Windows the file replace operation must be atomic (`os.replace`) and tolerate a reader
  holding the file briefly.
- Worker settings are re-read from the database, so the interval and region changes apply
  without a restart.

## Alternatives considered

| Option                                        | Why not                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| Run the camera loop in a thread inside Flask  | Breaks with reloaders and multiple web processes; a camera fault can stall the API |
| Celery or Redis task queue                    | Heavy for one camera and one machine                                               |
| Push frames to the API over HTTP or WebSocket | Adds a network hop and failure mode with no benefit when both run on one machine   |
