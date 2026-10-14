"""
Parul University Institutional Repository Harvester & PYQ Intelligence Service
Connects to https://ir.paruluniversity.ac.in/xmlui/handle/123456789/36 (DSpace XMLUI).
Retrieves official university question paper metadata and historical examination questions.
Maintains a local institutional cache strictly partitioned from private student session documents.
"""

import os
import json
import logging
import re
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

CACHE_DIR = os.getenv(
    "PARUL_PYQ_CACHE_DIR",
    "/tmp/parul_pyq" if os.getenv("VERCEL") else os.path.join(os.path.dirname(__file__), "..", "..", "data", "parul_pyq"),
)
CACHE_FILE = os.path.join(CACHE_DIR, "index.json")

GENERIC_SUBJECT_NAMES = {
    "", "subject", "general", "general course", "unknown", "course", "academic document", "uploaded file"
}


class ParulRepositoryHarvester:
    """OAI-PMH & OpenSearch client for Parul University Digital Repository"""

    BASE_URL = "https://ir.paruluniversity.ac.in"
    EXAM_COMMUNITY_HANDLE = "123456789/36"
    INTERNAL_EXAMS_HANDLE = "123456789/38"
    EXTERNAL_EXAMS_HANDLE = "123456789/39"

    def __init__(self):
        os.makedirs(CACHE_DIR, exist_ok=True)
        self.cached_papers = self._load_cache()

    def _load_cache(self) -> List[Dict[str, Any]]:
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    records = json.load(f)
                    loaded = []
                    for paper in records:
                        if not isinstance(paper, dict):
                            continue
                        url = str(paper.get("url", ""))
                        handle = paper.get("handle")
                        if url.startswith("http://localhost:8080/xmlui/handle/"):
                            paper["url"] = url.replace("http://localhost:8080", self.BASE_URL)
                        elif not url and handle:
                            paper["url"] = f"{self.BASE_URL}/xmlui/handle/{handle}"
                        # Never auto-mark seeded sample questions as verified unless a verified
                        # external source hash (`source_document_sha256`) is explicitly recorded.
                        if not paper.get("source_document_sha256"):
                            paper["questions_source_verified"] = False
                        if paper.get("url", "").startswith(self.BASE_URL + "/") or paper.get("handle"):
                            loaded.append(paper)
                    return loaded
            except Exception as e:
                logger.warning(f"Failed to read Parul PYQ cache: {e}")
        return []

    def _save_cache(self, data: List[Dict[str, Any]]):
        try:
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to write Parul PYQ cache: {e}")

    async def search_repository(self, query: str, subject_code: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Searches institutional repository: attempts live OpenSearch query,
        merges with locally cached metadata.
        """
        results = []

        q_clean = (query or "").lower().strip()
        code_clean = (subject_code or "").lower().strip()

        if q_clean in GENERIC_SUBJECT_NAMES:
            q_clean = ""

        for paper in self.cached_papers:
            p_code = str(paper.get("subject_code") or "").lower().strip()
            p_subj = str(paper.get("subject") or "").lower().strip()
            p_title = str(paper.get("title") or "").lower().strip()

            matches_code = bool(code_clean and len(code_clean) >= 3 and code_clean == p_code)
            matches_subject = bool(
                q_clean
                and len(q_clean) >= 3
                and (
                    re.search(rf"\b{re.escape(q_clean)}\b", p_subj)
                    or re.search(rf"\b{re.escape(q_clean)}\b", p_title)
                )
            )
            if matches_code or matches_subject:
                results.append(paper)

        # Try live query to Parul DSpace XMLUI OpenSearch Atom feed when a specific query is supplied
        search_term = code_clean or q_clean
        if search_term:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(
                        f"{self.BASE_URL}/xmlui/open-search/",
                        params={"query": search_term, "format": "atom"}
                    )
                    if resp.status_code == 200 and "<entry>" in resp.text:
                        live_papers = self._parse_atom_entries(resp.text)
                        for lp in live_papers:
                            if not any(r.get("id") == lp.get("id") for r in results):
                                results.append(lp)
                                self.cached_papers.append(lp)
                        self._save_cache(self.cached_papers)
            except Exception as e:
                logger.info(f"Parul live repository query bypassed: {e}")

        return results

    def _parse_atom_entries(self, atom_xml: str) -> List[Dict[str, Any]]:
        entries = []
        try:
            import xml.etree.ElementTree as ET
            root = ET.fromstring(atom_xml)
            ns = {'atom': 'http://www.w3.org/2005/Atom'}
            for entry in root.findall('atom:entry', ns):
                title = entry.findtext('atom:title', default='', namespaces=ns)
                link = entry.find('atom:link', ns)
                href = link.attrib.get('href', '') if link is not None else ''
                updated = entry.findtext('atom:updated', default='', namespaces=ns)
                year = updated[:4] if updated else None

                handle_match = re.search(r'handle/(123456789/\d+)', href)
                handle = handle_match.group(1) if handle_match else "123456789/unknown"

                entries.append({
                    "id": f"parul_live_{handle.replace('/', '_')}",
                    "handle": handle,
                    "title": title,
                    "subject": title.split('(')[0].strip(),
                    "subject_code": "",
                    "exam_type": "Institutional repository record",
                    "year": year,
                    "url": href,
                    "questions_source_verified": False,
                })
        except Exception as e:
            logger.warning(f"Error parsing atom XML: {e}")
        return entries

    def get_historical_topics_and_questions(self, subject: str, subject_code: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns recurring topics and sample questions from verified historical Parul papers.
        Prevents empty or generic subject strings from matching unrelated subjects (e.g. Cost Accounting).
        """
        s_lower = (subject or "").strip().lower()
        c_lower = (subject_code or "").strip().lower()

        if s_lower in GENERIC_SUBJECT_NAMES:
            s_lower = ""

        if not c_lower and len(s_lower) < 3:
            return {
                "matched_papers_count": 0,
                "historical_papers": [],
                "recurring_questions": [],
                "topic_frequency": {},
            }

        papers = []
        for p in self.cached_papers:
            p_code = str(p.get("subject_code") or "").strip().lower()
            p_subj = str(p.get("subject") or "").strip().lower()

            code_match = bool(c_lower and len(c_lower) >= 3 and c_lower == p_code)
            subj_match = bool(
                s_lower
                and len(s_lower) >= 3
                and p_subj
                and re.search(rf"\b{re.escape(s_lower)}\b", p_subj)
            )
            if code_match or subj_match:
                papers.append(p)

        # Repository metadata is not a past question paper until its contents
        # have been retrieved and verified (`questions_source_verified` + `source_document_sha256`).
        papers = [
            paper for paper in papers
            if paper.get("questions_source_verified") is True
            and paper.get("source_document_sha256")
            and paper.get("sample_questions")
        ]

        recurring_questions = []
        topic_frequency = {}

        for p in papers:
            for q in p.get("sample_questions", []):
                recurring_questions.append(q)
                top = q.get("topic", "General")
                topic_frequency[top] = topic_frequency.get(top, 0) + 1

        return {
            "matched_papers_count": len(papers),
            "historical_papers": papers,
            "recurring_questions": recurring_questions,
            "topic_frequency": topic_frequency
        }
