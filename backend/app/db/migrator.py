"""
Versioned, Reversible SQL Migration Runner.
Manages `.up.sql` and `.down.sql` migrations in `backend/migrations/`.
"""

import os
import re
import hashlib
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from app.db.database import DatabaseEngine

logger = logging.getLogger(__name__)

MIGRATION_FILE_PATTERN = re.compile(r"^(\d{3,})_([a-zA-Z0-9_\-]+)\.(up|down)\.sql$")


class MigrationRunner:
    """Applies and rolls back versioned SQL migrations."""

    def __init__(self, engine: DatabaseEngine, migrations_dir: Optional[str] = None):
        self.engine = engine
        if migrations_dir:
            self.migrations_dir = Path(migrations_dir).resolve()
        else:
            # Default: backend/migrations
            self.migrations_dir = (Path(__file__).resolve().parent.parent.parent / "migrations").resolve()

    def _ensure_migrations_table(self) -> None:
        self.engine.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL,
                checksum TEXT NOT NULL
            )
            """
        )

    def discover_migrations(self) -> Dict[str, Dict[str, Path]]:
        """Return mapping of version -> {'name': str, 'up': Path, 'down': Path} sorted by version."""
        discovered: Dict[str, Dict[str, Any]] = {}
        if not self.migrations_dir.exists():
            return discovered

        for entry in sorted(os.listdir(self.migrations_dir)):
            match = MIGRATION_FILE_PATTERN.match(entry)
            if not match:
                continue
            version, name, direction = match.groups()
            info = discovered.setdefault(version, {"version": version, "name": name})
            info[direction] = self.migrations_dir / entry

        return dict(sorted(discovered.items(), key=lambda item: item[0]))

    def get_applied_versions(self) -> List[Dict[str, str]]:
        """Return list of applied migrations ordered by version ascending."""
        self._ensure_migrations_table()
        rows = self.engine.fetch_all(
            "SELECT version, name, applied_at, checksum FROM schema_migrations ORDER BY version ASC"
        )
        return rows

    def migrate_up(self, target_version: Optional[str] = None) -> List[str]:
        """Apply all pending `.up.sql` migrations up to `target_version` (or latest)."""
        self._ensure_migrations_table()
        applied = {row["version"]: row for row in self.get_applied_versions()}
        discovered = self.discover_migrations()
        newly_applied: List[str] = []

        for version, info in discovered.items():
            if target_version and version > target_version:
                break
            up_path: Optional[Path] = info.get("up")
            if not up_path or not up_path.exists():
                raise RuntimeError(f"Missing UP migration file for version {version}")

            sql_text = up_path.read_text(encoding="utf-8")
            checksum = hashlib.sha256(sql_text.encode("utf-8")).hexdigest()

            if version in applied:
                if applied[version]["checksum"] != checksum:
                    logger.warning("Checksum drift detected for migration %s", version)
                continue

            self.engine.execute_script(sql_text)
            now_iso = datetime.now(timezone.utc).isoformat()
            self.engine.execute(
                "INSERT INTO schema_migrations (version, name, applied_at, checksum) VALUES (?, ?, ?, ?)",
                (version, info["name"], now_iso, checksum),
            )
            newly_applied.append(version)
            logger.info("Applied database migration %s_%s.up.sql", version, info["name"])

        return newly_applied

    def migrate_down(self, steps: int = 1) -> List[str]:
        """Roll back the most recently applied `steps` migrations using their `.down.sql` scripts."""
        self._ensure_migrations_table()
        applied = self.get_applied_versions()
        if not applied or steps <= 0:
            return []

        discovered = self.discover_migrations()
        rolled_back: List[str] = []

        for row in reversed(applied[-steps:]):
            version = row["version"]
            info = discovered.get(version)
            if not info or "down" not in info or not info["down"].exists():
                raise RuntimeError(f"Missing DOWN migration file for version {version}")

            down_sql = info["down"].read_text(encoding="utf-8")
            self.engine.execute_script(down_sql)
            self.engine.execute("DELETE FROM schema_migrations WHERE version = ?", (version,))
            rolled_back.append(version)
            logger.info("Rolled back database migration %s_%s.down.sql", version, info["name"])

        return rolled_back
