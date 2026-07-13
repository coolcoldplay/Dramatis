"""Build the complete bilingual Twin Peaks Season 2 Dramatis dataset."""

from __future__ import annotations

import json
import math
from collections import Counter, defaultdict
from pathlib import Path

from twin_peaks_s2_content import (
    AUDIT_EXCLUSIONS,
    CATEGORIES,
    CHARACTERS,
    EPISODE_GUIDE,
    EVENTS,
    FAMILY_RELATIONS,
    RELATIONSHIPS,
)


ROOT = Path(__file__).resolve().parents[1]
AUDIT_PATH = ROOT / "data/research/twin-peaks-season-2-appearances.json"
OUTPUT_PATH = ROOT / "data/twin-peaks-season-2.json"
COVERAGE_PATH = ROOT / "docs/season-2-coverage-report.md"
EXTRACTION_REPORT_PATH = ROOT / "docs/season-2-extraction-report.md"

VISIBLE_QUALIFIERS = {"onscreen", "voice", "video", "corpse", "photo"}
PLOT_CENTERS = {
    "laura-case": (0, 0),
    "lodge": (50, -900),
    "earle-fbi": (680, -760),
    "horne": (950, -60),
    "packard": (920, 720),
    "pageant": (380, 980),
    "johnson": (-120, 760),
    "diner": (-560, 880),
    "town": (-720, -220),
    "teen": (-870, 360),
    "marsh": (-970, 980),
}

SOURCES = [
    {
        "id": "paramount-season-2",
        "label": "Paramount+ Twin Peaks Season 2 episode guide",
        "url": "https://www.paramountplus.com/shows/twin_peaks/episodes/2/",
        "usage": "核对第二季 22 集顺序与官方短简介。",
    },
    {
        "id": "wikipedia-episode-list",
        "label": "Wikipedia: List of Twin Peaks episodes",
        "url": "https://en.wikipedia.org/wiki/List_of_Twin_Peaks_episodes#Season_2_(1990%E2%80%9391)",
        "usage": "核对播出日期、逐集主线与连续性。",
    },
    {
        "id": "twin-peaks-wiki-episodes",
        "label": "Twin Peaks Wiki: Episodes 8-29",
        "url": "https://twinpeaks.fandom.com/wiki/Episodes",
        "usage": "逐集人物出现、仅提及／照片／声音限定与剧情细节交叉核对。",
    },
]


def episode_ref(number: int) -> dict:
    return {"season": 2, "episode": number, "raw": f"S2E{number}"}


def episode_refs(numbers) -> list[dict]:
    return [episode_ref(int(number)) for number in sorted(set(numbers))]


def node_id(key: str) -> str:
    return f"person-{key}"


def family_id(key: str) -> str:
    return f"family-{key}"


def load_audit() -> dict:
    if not AUDIT_PATH.exists():
        raise FileNotFoundError(
            f"Missing {AUDIT_PATH}. Run scripts/extract_twin_peaks_s2_sources.py first."
        )
    return json.loads(AUDIT_PATH.read_text(encoding="utf-8"))


def build_appearance_index(audit: dict) -> tuple[dict[str, set[int]], set[str]]:
    appearances = defaultdict(set)
    nonmentioned_names = set()
    for episode in audit["episodes"]:
        number = int(episode["episode"])
        for person in episode["individuals"]:
            canonical = person["canonical"]
            qualifier = person["qualifier"]
            if qualifier in VISIBLE_QUALIFIERS:
                appearances[canonical].add(number)
                nonmentioned_names.add(canonical)
    return appearances, nonmentioned_names


def validate_source_coverage(nonmentioned_names: set[str]) -> dict:
    source_to_key = {}
    for item in CHARACTERS:
        for source_name in item["sourceNames"]:
            if source_name in source_to_key:
                raise ValueError(
                    f"Source name {source_name!r} mapped to both "
                    f"{source_to_key[source_name]!r} and {item['key']!r}"
                )
            source_to_key[source_name] = item["key"]

    unmapped = sorted(nonmentioned_names - set(source_to_key) - set(AUDIT_EXCLUSIONS))
    if unmapped:
        raise ValueError(f"Unmapped non-mentioned source names: {unmapped}")
    unused_exclusions = sorted(set(AUDIT_EXCLUSIONS) - nonmentioned_names)
    if unused_exclusions:
        raise ValueError(f"Stale audit exclusions: {unused_exclusions}")
    return source_to_key


def character_positions() -> dict[str, tuple[float, float]]:
    grouped = defaultdict(list)
    for item in CHARACTERS:
        grouped[item["plotline"]].append(item)

    positions = {}
    for plotline, items in grouped.items():
        center_x, center_y = PLOT_CENTERS[plotline]
        for index, item in enumerate(items):
            ring = index // 10
            slot = index % 10
            radius = 170 + ring * 115
            angle = (2 * math.pi * slot / min(10, len(items))) + ring * 0.31
            positions[item["key"]] = (
                round(center_x + math.cos(angle) * radius, 2),
                round(center_y + math.sin(angle) * radius, 2),
            )
    return positions


def event_positions() -> dict[str, tuple[float, float]]:
    by_plotline = defaultdict(list)
    for item in EVENTS:
        by_plotline[item["plotline"]].append(item)

    positions = {}
    for plotline, items in by_plotline.items():
        center_x, center_y = PLOT_CENTERS[plotline]
        for index, item in enumerate(items):
            ring = index // 12
            slot = index % 12
            radius = 360 + ring * 130
            angle = (2 * math.pi * slot / min(12, len(items))) + ring * 0.19
            positions[item["key"]] = (
                round(center_x + math.cos(angle) * radius, 2),
                round(center_y + math.sin(angle) * radius, 2),
            )
    return positions


def build_dataset(audit: dict) -> tuple[dict, dict]:
    appearances, nonmentioned_names = build_appearance_index(audit)
    source_to_key = validate_source_coverage(nonmentioned_names)
    characters_by_key = {item["key"]: item for item in CHARACTERS}
    if len(characters_by_key) != len(CHARACTERS):
        raise ValueError("Duplicate character keys")

    guide_numbers = [item["episode"] for item in EPISODE_GUIDE]
    if guide_numbers != list(range(1, 23)):
        raise ValueError(f"Episode guide must cover S2E1-S2E22 exactly: {guide_numbers}")

    relevant_episodes = defaultdict(set)
    for item in CHARACTERS:
        for source_name in item["sourceNames"]:
            relevant_episodes[item["key"]].update(appearances.get(source_name, set()))

    event_keys = set()
    per_episode_event_count = Counter()
    per_episode_participants = defaultdict(set)
    for item in EVENTS:
        if item["key"] in event_keys:
            raise ValueError(f"Duplicate event key: {item['key']}")
        event_keys.add(item["key"])
        episode = int(item["episode"])
        if episode not in range(1, 23):
            raise ValueError(f"Invalid event episode: {item}")
        if not item["participants"]:
            raise ValueError(f"Event has no participants: {item['key']}")
        per_episode_event_count[episode] += 1
        for key, role in item["participants"]:
            if key not in characters_by_key:
                raise ValueError(f"Unknown participant {key!r} in event {item['key']!r}")
            if not str(role).strip():
                raise ValueError(f"Empty participant role in event {item['key']!r}")
            relevant_episodes[key].add(episode)
            per_episode_participants[episode].add(key)

    missing_event_episodes = [number for number in range(1, 23) if not per_episode_event_count[number]]
    if missing_event_episodes:
        raise ValueError(f"Episodes without event nodes: {missing_event_episodes}")

    person_positions = character_positions()
    nodes = []
    for item in CHARACTERS:
        x, y = person_positions[item["key"]]
        node = {
            "id": node_id(item["key"]),
            "name": item["name"],
            "aliases": item["aliases"],
            "avatar": None,
            "notes": item["notes"],
            "gender": item["gender"],
            "tags": {
                "node-type": item["nodeType"],
                "plotline": item["plotline"],
                "group": item["group"],
                "importance": item["importance"],
            },
            "episodes": episode_refs(relevant_episodes[item["key"]]),
            "hidden": False,
            "x": x,
            "y": y,
        }
        nodes.append(node)

    event_positions_by_key = event_positions()
    event_node_ids = {}
    for item in EVENTS:
        event_node_id = f"event-s2e{item['episode']:02d}-{item['key']}"
        event_node_ids[item["key"]] = event_node_id
        x, y = event_positions_by_key[item["key"]]
        nodes.append(
            {
                "id": event_node_id,
                "name": f"E{item['episode']}·{item['title']}",
                "aliases": [f"S2E{item['episode']} {item['title']}"],
                "avatar": None,
                "notes": item["summary"],
                "tags": {
                    "node-type": "event",
                    "plotline": item["plotline"],
                    "group": "townspeople",
                    "importance": "major" if len(item["participants"]) >= 6 else "supporting",
                },
                "episodes": [episode_ref(item["episode"])],
                "hidden": False,
                "x": x,
                "y": y,
            }
        )

    links = []

    def add_link(source, target, label, link_type, episodes, notes, hidden=False, directed=None):
        link = {
            "id": f"link-{len(links) + 1:04d}",
            "source": source,
            "target": target,
            "label": label,
            "type": link_type,
            "episodes": episode_refs(episodes),
            "notes": notes,
            "hidden": hidden,
        }
        if directed is not None:
            link["directed"] = bool(directed)
        links.append(link)

    for item in EVENTS:
        for key, role in item["participants"]:
            add_link(
                node_id(key),
                event_node_ids[item["key"]],
                role,
                "action",
                [item["episode"]],
                f"{item['summary']} 角色：{role}",
                directed=True,
            )

    for item in RELATIONSHIPS:
        if item["source"] not in characters_by_key or item["target"] not in characters_by_key:
            raise ValueError(f"Unknown relationship endpoint: {item}")
        add_link(
            node_id(item["source"]),
            node_id(item["target"]),
            item["label"],
            "action" if item["directed"] else "relation",
            item["episodes"],
            item["notes"],
            hidden=item["hidden"],
            directed=item["directed"],
        )

    family_relations = []
    family_keys = {item["key"] for item in FAMILY_RELATIONS}
    if len(family_keys) != len(FAMILY_RELATIONS):
        raise ValueError("Duplicate family relation keys")
    for item in FAMILY_RELATIONS:
        participants = []
        for key, role in item["participants"]:
            if key not in characters_by_key:
                raise ValueError(f"Unknown family participant {key!r} in {item['key']!r}")
            participants.append({"nodeId": node_id(key), "role": role})
        context = item["context"]
        if context and context not in family_keys:
            raise ValueError(f"Unknown family context {context!r}")
        family_relations.append(
            {
                "id": family_id(item["key"]),
                "kind": item["kind"],
                "subtype": item["subtype"],
                "participants": participants,
                "contextId": family_id(context) if context else None,
                "status": item["status"],
                "certainty": item["certainty"],
                "label": item["label"],
                "time": {"start": None, "end": None},
                "episodes": episode_refs(item["episodes"]),
                "evidence": [{"source": "Twin Peaks Season 2"}],
                "notes": item["notes"],
                "hidden": False,
            }
        )

    node_ids = {node["id"] for node in nodes}
    if len(node_ids) != len(nodes):
        raise ValueError("Duplicate node ids")
    bad_links = [link["id"] for link in links if link["source"] not in node_ids or link["target"] not in node_ids]
    if bad_links:
        raise ValueError(f"Links with missing endpoints: {bad_links}")
    isolated_people = sorted(
        node["id"] for node in nodes
        if node["id"].startswith("person-")
        and not any(link["source"] == node["id"] or link["target"] == node["id"] for link in links)
    )
    if isolated_people:
        raise ValueError(f"Isolated person nodes: {isolated_people}")

    episode_guide = []
    for guide in EPISODE_GUIDE:
        number = guide["episode"]
        event_items = [item for item in EVENTS if item["episode"] == number]
        episode_guide.append(
            {
                **guide,
                "season": 2,
                "raw": f"S2E{number}",
                "eventNodeIds": [event_node_ids[item["key"]] for item in event_items],
                "participantNodeIds": sorted(node_id(key) for key in per_episode_participants[number]),
                "sourceUrl": f"https://twinpeaks.fandom.com/wiki/Episode_{number + 7}",
            }
        )

    dataset = {
        "version": 5,
        "title": "《双峰》第二季完整人物与逐集剧情图",
        "description": "中文主名、英文别名；覆盖 S2E1-S2E22 的人物、逐集事件、跨集关系与复杂家系。",
        "coveragePolicy": {
            "included": "所有推动、承受、揭示或显著回应第二季剧情事件的具名人物与小屋实体。",
            "excluded": "无剧情功能的背景职员、表演者、现实历史人物和仅有环境性镜头者。",
            "episodePrecision": "每个事件节点与事件参与连线只绑定其发生的单集；人物节点记录来源出现与剧情相关集的并集。",
        },
        "episodeGuide": episode_guide,
        "nodes": nodes,
        "links": links,
        "familyRelations": family_relations,
        "familyView": {
            "layoutMode": "lineage",
            "houseTagCategoryId": "group",
            "generationGap": 165,
            "branchGap": 54,
            "componentGap": 140,
            "collapsedNodeIds": [],
        },
        "tagCategories": CATEGORIES,
        "nextId": 10000,
        "clusterSpacing": 1.45,
        "topologySizing": {"mode": "degree", "strength": 0.9},
        "graphStyle": {
            "nodeLabelColor": "#f1eee4",
            "nodeLabelFontSize": 11,
            "nodeScale": 0.82,
            "nodeLabelOpacity": 0.98,
            "nodeLabelPlacement": "inside",
        },
        "graphBackgroundColor": "#090b10",
        "linkTypes": {
            "relation": {
                "label": "持续关系",
                "color": "#66758c",
                "width": 1.15,
                "dasharray": "",
                "labelColor": "#c0c8d1",
                "directed": False,
                "labelFontSize": 0,
                "labelOrientation": "parallel",
            },
            "action": {
                "label": "逐集行动",
                "color": "#d4894f",
                "width": 1.35,
                "dasharray": "5,4",
                "labelColor": "#edc08f",
                "directed": True,
                "labelFontSize": 0,
                "labelOrientation": "parallel",
            },
        },
        "forceConfig": {
            "centerStrength": 0.025,
            "chargeStrength": -560,
            "linkStrength": 0.32,
            "linkDistance": 185,
        },
        "sources": SOURCES,
    }

    stats = {
        "characters": len(CHARACTERS),
        "entities": sum(item["nodeType"] == "entity" for item in CHARACTERS),
        "eventNodes": len(EVENTS),
        "nodes": len(nodes),
        "eventLinks": sum(len(item["participants"]) for item in EVENTS),
        "relationshipLinks": len(RELATIONSHIPS),
        "links": len(links),
        "familyRelations": len(family_relations),
        "sourceNonMentionedNames": len(nonmentioned_names),
        "mappedSourceNames": len(nonmentioned_names - set(AUDIT_EXCLUSIONS)),
        "excludedSourceNames": len(AUDIT_EXCLUSIONS),
        "eventsPerEpisode": dict(sorted(per_episode_event_count.items())),
    }
    return dataset, stats


def write_reports(dataset: dict, stats: dict) -> None:
    coverage_lines = [
        "# 《双峰》第二季数据覆盖报告",
        "",
        "本报告由 `scripts/generate_twin_peaks_s2_dataset.py` 自动生成。",
        "",
        "## 汇总",
        "",
        f"- 人物／实体节点：{stats['characters']}（其中小屋实体与分身 {stats['entities']}）",
        f"- 逐集事件节点：{stats['eventNodes']}",
        f"- 总节点：{stats['nodes']}",
        f"- 逐集事件参与连线：{stats['eventLinks']}",
        f"- 跨集持续关系：{stats['relationshipLinks']}",
        f"- 总连线：{stats['links']}",
        f"- v5 家系关系：{stats['familyRelations']}",
        f"- 来源中非“仅提及”规范名：{stats['sourceNonMentionedNames']}",
        f"- 纳入映射：{stats['mappedSourceNames']}；按政策排除：{stats['excludedSourceNames']}",
        "",
        "## 逐集覆盖",
        "",
        "| 集 | 标题 | 事件数 | 剧情参与人物数 |",
        "|---|---|---:|---:|",
    ]
    for guide in dataset["episodeGuide"]:
        coverage_lines.append(
            f"| {guide['raw']} | {guide['title']} | {len(guide['eventNodeIds'])} | "
            f"{len(guide['participantNodeIds'])} |"
        )
    coverage_lines += [
        "",
        "## 明确排除",
        "",
        "这些条目出现在来源的非‘仅提及’清单中，但没有独立剧情功能，故不建立人物节点。",
        "",
        "| 来源规范名 | 原因 |",
        "|---|---|",
    ]
    for name, reason in sorted(AUDIT_EXCLUSIONS.items()):
        coverage_lines.append(f"| {name} | {reason} |")
    coverage_lines += [
        "",
        "## 校验门槛",
        "",
        "- S2E1-S2E22 每集必须至少有一个事件节点。",
        "- 每个事件参与者、普通关系端点和家系参与者都必须存在。",
        "- 每个纳入的人物／实体必须至少有一条连线。",
        "- 来源中每个非‘仅提及’规范名必须被映射或明确排除；不能静默漏项。",
        "",
    ]
    COVERAGE_PATH.write_text("\n".join(coverage_lines), encoding="utf-8")

    report_lines = [
        "# Twin Peaks Season 2 Extraction Report",
        "",
        "This report summarizes the compact factual extraction behind `data/twin-peaks-season-2.json`. No transcript or full plot text is reproduced.",
        "",
        "## Sources",
        "",
    ]
    for source in SOURCES:
        report_lines.append(f"- [{source['label']}]({source['url']}): {source['usage']}")
    report_lines += ["", "## Episode Extraction", ""]
    for guide in dataset["episodeGuide"]:
        report_lines += [
            f"### {guide['raw']} - {guide['title']} / {guide['englishTitle']}",
            f"- Air date: {guide['airDate']}",
            f"- Summary: {guide['summary']}",
            f"- Event nodes: {len(guide['eventNodeIds'])}",
            f"- Plot participants: {len(guide['participantNodeIds'])}",
            f"- Episode source: {guide['sourceUrl']}",
            "",
        ]
    EXTRACTION_REPORT_PATH.write_text("\n".join(report_lines), encoding="utf-8")


def main() -> None:
    audit = load_audit()
    dataset, stats = build_dataset(audit)
    OUTPUT_PATH.write_text(json.dumps(dataset, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_reports(dataset, stats)
    print(json.dumps({"output": str(OUTPUT_PATH), **stats}, ensure_ascii=False))


if __name__ == "__main__":
    main()
