"""The prompt of the language model. It gets facts and writes advice; it never decides a class."""

import json

from app.models import AdviceTrigger
from app.services.advisor.base import AdviceContext

STATUS_NAMES = {
    "n_deficiency": "kekurangan nitrogen (N)",
    "fe_deficiency": "kekurangan zat besi (Fe)",
    "needs_check": "perlu dicek langsung (model tidak yakin)",
    "normal": "normal",
    "no_plant": "lubang kosong",
}
METRIC_NAMES = {"ph": "pH", "ec": "EC (mS/cm)", "temperature": "suhu air (derajat Celsius)"}
BAND_NAMES = {
    "low": "di bawah rentang ideal",
    "in_range": "dalam rentang ideal",
    "high": "di atas rentang ideal",
}

SYSTEM_PROMPT = """\
Kamu adalah penasihat budidaya pakcoy hidroponik sistem NFT untuk sebuah proyek akhir.
Aturan:
- Kamu hanya memberi saran kepada manusia. Kamu tidak mengendalikan pompa atau perangkat keras.
- Kelas tanaman sudah ditentukan oleh sistem penglihatan. Jangan menilai ulang dan jangan
  menebak kelas lain. Pakai status yang diberikan apa adanya.
- Pakai hanya fakta yang diberikan. Jangan mengarang angka, merek, atau dosis. Jika data sensor
  tidak ada, katakan bahwa data sensor tidak tersedia.
- Tulis dalam bahasa Indonesia yang sederhana dan langsung.
Jawab hanya dengan satu objek JSON tanpa teks lain, dengan kunci:
- "summary": satu kalimat tentang kondisinya.
- "likely_causes": daftar 1 sampai 3 dugaan penyebab (kalimat pendek).
- "suggested_actions": daftar 1 sampai 4 langkah konkret yang bisa dilakukan petani.
- "severity": "info", "warning", atau "critical".
"""


def build_prompt(context: AdviceContext) -> str:
    """The facts of one piece of advice, as text for the model."""
    facts: dict[str, object] = {}
    if context.trigger is AdviceTrigger.PLANT_STATUS:
        facts["kejadian"] = "status sebuah lubang tanaman berubah"
        facts["lubang"] = context.plant_position
        facts["status"] = STATUS_NAMES.get(context.status or "", context.status)
        facts["keyakinan_model"] = context.confidence
        facts["status_terakhir_lubang_ini"] = [
            STATUS_NAMES.get(status, status) for status in context.recent_statuses
        ]
    else:
        facts["kejadian"] = "nilai sensor tandon di luar rentang ideal selama lebih dari 5 menit"
        facts["yang_bermasalah"] = METRIC_NAMES.get(context.focus or "", context.focus)
    facts["sensor"] = {
        METRIC_NAMES[name]: {
            "nilai": fact.value,
            "keterangan": BAND_NAMES[fact.band],
            "rentang_ideal": [fact.minimum, fact.maximum],
        }
        for name, fact in context.metrics.items()
    } or "tidak tersedia"
    return "Fakta:\n" + json.dumps(facts, ensure_ascii=False, indent=2)
