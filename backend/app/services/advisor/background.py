"""Run advice in the background, so a slow language model never stalls the vision worker.

One thread does the jobs one after the other. Each job runs inside the app context, with its own
database session.
"""

import logging
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor

from flask import Flask

from app.extensions import db

log = logging.getLogger("nutrify.advisor")


class BackgroundRunner:
    def __init__(self, app: Flask) -> None:
        self._app = app
        self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="advisor")

    def submit(self, job: Callable[[], object]) -> None:
        self._executor.submit(self._run, job)

    def close(self) -> None:
        """Finish the jobs that are waiting, then stop the thread."""
        self._executor.shutdown(wait=True)

    def _run(self, job: Callable[[], object]) -> None:
        with self._app.app_context():
            try:
                job()
            except Exception:
                db.session.rollback()
                log.exception("A background advice job failed")
            finally:
                db.session.remove()
