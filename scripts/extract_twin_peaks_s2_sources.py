"""Extract episode-level appearance evidence from the Twin Peaks Wiki API.

Only compact appearance metadata is persisted. Plot prose and transcript text are
never written to the repository.
"""

from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path


API_URL = "https://twinpeaks.fandom.com/api.php"
USER_AGENT = "Dramatis-Twin-Peaks-Audit/1.0"
OUTPUT_PATH = Path("data/research/twin-peaks-season-2-appearances.json")

APPEARANCES_RE = re.compile(
    r"^==\s*Appearances\s*==\s*$\n(?P<body>.*?)(?=^==[^=]|\Z)", re.MULTILINE | re.DOTALL
)
PERSON_RE = re.compile(
    r"^\*\*\s+(?P<prefix>[^\[]*?)\[\[(?P<target>[^\]|]+)(?:\|(?P<label>[^\]]+))?\]\]"
    r"(?:\s+\{\{sm\|(?P<qualifier>[^}]+)\}\})?\s*$"
)
TIMELINE_RE = re.compile(
    r"(?:Timeline|\[\[Timeline\]\])\s*:\s*(?:\[\[)?(?P<month>[A-Z][a-z]+)(?:\]\])?\s+"
    r"(?P<day>\d{1,2})(?:\s*,\s*(?P<weekday>[A-Z][a-z]+))?",
    re.IGNORECASE,
)


def fetch_page(overall_episode: int) -> dict:
    params = urllib.parse.urlencode(
        {
            "action": "parse",
            "page": f"Episode_{overall_episode}",
            "prop": "wikitext|revid",
            "format": "json",
            "formatversion": 2,
        }
    )
    request = urllib.request.Request(f"{API_URL}?{params}", headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)
    if "error" in payload:
        raise RuntimeError(f"Episode {overall_episode}: {payload['error']}")
    return payload["parse"]


def parse_people(wikitext: str, overall_episode: int) -> list[dict]:
    section_match = APPEARANCES_RE.search(wikitext)
    if not section_match:
        raise ValueError(f"Episode {overall_episode}: appearances section not found")

    people: list[dict] = []
    in_individuals = False
    unparsed: list[str] = []
    for line in section_match.group("body").splitlines():
        stripped = line.strip()
        if stripped == "* Individuals":
            in_individuals = True
            continue
        if in_individuals and stripped.startswith("* "):
            break
        if not in_individuals or not stripped.startswith("**"):
            continue
        match = PERSON_RE.match(stripped)
        if not match:
            unparsed.append(stripped)
            continue
        target = match.group("target").split("#", 1)[0].strip()
        people.append(
            {
                "canonical": target,
                "label": f"{match.group('prefix') or ''}{match.group('label') or target}".strip(),
                "qualifier": (match.group("qualifier") or "onscreen").strip().lower(),
            }
        )
    if unparsed:
        raise ValueError(f"Episode {overall_episode}: unparsed appearance rows: {unparsed}")
    if not people:
        raise ValueError(f"Episode {overall_episode}: no individual appearances parsed")
    return people


def parse_timeline(wikitext: str) -> dict | None:
    match = TIMELINE_RE.search(wikitext)
    if not match:
        return None
    result = {
        "month": match.group("month").title(),
        "day": int(match.group("day")),
    }
    if match.group("weekday"):
        result["weekday"] = match.group("weekday").title()
    return result


def main() -> None:
    episodes = []
    for season_episode, overall_episode in enumerate(range(8, 30), start=1):
        parsed = fetch_page(overall_episode)
        wikitext = parsed["wikitext"]
        episodes.append(
            {
                "season": 2,
                "episode": season_episode,
                "raw": f"S2E{season_episode}",
                "overallEpisode": overall_episode,
                "sourceUrl": f"https://twinpeaks.fandom.com/wiki/Episode_{overall_episode}",
                "sourcePageId": parsed["pageid"],
                "sourceRevisionId": parsed.get("revid"),
                "inUniverseDate": parse_timeline(wikitext),
                "individuals": parse_people(wikitext, overall_episode),
            }
        )
        if season_episode < 22:
            time.sleep(0.35)

    result = {
        "source": "Twin Peaks Wiki episode appearance sections",
        "sourceApi": API_URL,
        "scope": "Original-series Episodes 8-29 / Season 2 Episodes 1-22",
        "episodes": episodes,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "episodes": len(episodes),
                "appearanceRows": sum(len(item["individuals"]) for item in episodes),
                "uniqueCanonicalNames": len(
                    {person["canonical"] for item in episodes for person in item["individuals"]}
                ),
                "output": str(OUTPUT_PATH),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
