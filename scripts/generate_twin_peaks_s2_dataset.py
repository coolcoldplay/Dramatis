import json
from pathlib import Path

PARAMOUNT = "https://www.paramountplus.com/shows/twin_peaks/episodes/2/"
TVGUIDE = "https://www.tvguide.com/tvshows/twin-peaks/episodes-season-2/1030204942/"
WIKILIST = "https://en.wikipedia.org/wiki/List_of_Twin_Peaks_episodes#Season_2_(1990%E2%80%9391)"
TWINPEAKS_WIKI = "https://twinpeaks.fandom.com/wiki/Episodes"
TIME_RECAP = "https://time.com/4780089/twin-peaks-2017-season-2-recap/"
SCRIPT_SLUG_S2E1 = "https://www.scriptslug.com/script/twin-peaks-201-episode-2-1-1990"
FOREVER_DREAMING = "https://transcripts.foreverdreaming.org/viewforum.php?f=1187"
SUBS_LIKE_SCRIPT = "https://subslikescript.com/series/Twin_Peaks-98936"

SOURCES = [
    ("src-paramount-s2", "Paramount+ Season 2 episode guide", PARAMOUNT, "Episode titles and official one-line episode descriptions."),
    ("src-tvguide-s2", "TV Guide Season 2 episode guide", TVGUIDE, "Episode-by-episode plot points used for extraction."),
    ("src-wikipedia-episodes", "Wikipedia list of Twin Peaks episodes", WIKILIST, "Season length, air dates, and broad season arc."),
    ("src-twinpeaks-wiki-episodes", "Twin Peaks Wiki episode index", TWINPEAKS_WIKI, "Cross-checking episode numbering and continuity."),
    ("src-time-recap", "TIME season 2 recap before The Return", TIME_RECAP, "Cross-checking late-season Windom Earle and Black Lodge arc."),
    ("src-scriptslug-s2e1", "Script Slug S2E1 script landing page", SCRIPT_SLUG_S2E1, "Transcript/script availability check; not copied into outputs."),
    ("src-forever-dreaming-index", "Forever Dreaming Twin Peaks transcript index", FOREVER_DREAMING, "Transcript availability check; not copied into outputs."),
    ("src-subslikescript-index", "Subs Like Script Twin Peaks index", SUBS_LIKE_SCRIPT, "Transcript availability check; not copied into outputs."),
]


def ep(nums):
    if not nums:
        return []
    if isinstance(nums, str):
        nums = [int(x) for x in nums.split(",") if x.strip()]
    elif isinstance(nums, int):
        nums = [nums]
    return [{"season": 2, "episode": n, "raw": f"S2E{n}"} for n in nums]


categories = [
    {
        "id": "C1",
        "name": "Node Type",
        "visible": True,
        "tags": [
            {"id": "T1", "name": "Person", "color": "#d4a574"},
            {"id": "T2", "name": "Event", "color": "#c75c5c"},
            {"id": "T3", "name": "Place/Org", "color": "#4a90b8"},
            {"id": "T4", "name": "Spirit/Entity", "color": "#b87aa8"},
            {"id": "T5", "name": "Object/Clue", "color": "#7ba05b"},
        ],
    },
    {
        "id": "C2",
        "name": "Plotline",
        "visible": True,
        "tags": [
            {"id": "T10", "name": "Laura Case", "color": "#e06666"},
            {"id": "T11", "name": "Black Lodge", "color": "#9c6ade"},
            {"id": "T12", "name": "Windom Earle/FBI", "color": "#6fa8dc"},
            {"id": "T13", "name": "Packard/Ghostwood", "color": "#76a5af"},
            {"id": "T14", "name": "Horne/One-Eyed Jack's", "color": "#e69138"},
            {"id": "T15", "name": "Teen/Harold/James", "color": "#c27ba0"},
            {"id": "T16", "name": "Johnson/Leo/Bobby", "color": "#93c47d"},
            {"id": "T17", "name": "Ed/Norma/Nadine", "color": "#f1c232"},
            {"id": "T18", "name": "Sheriff/FBI", "color": "#999999"},
            {"id": "T19", "name": "Miss Twin Peaks", "color": "#d5a6bd"},
            {"id": "T20", "name": "James/Evelyn", "color": "#a67c52"},
        ],
    },
    {
        "id": "C3",
        "name": "Group",
        "visible": False,
        "tags": [
            {"id": "T30", "name": "FBI", "color": "#6fa8dc"},
            {"id": "T31", "name": "Sheriff Dept", "color": "#999999"},
            {"id": "T32", "name": "Palmer", "color": "#e06666"},
            {"id": "T33", "name": "Horne", "color": "#e69138"},
            {"id": "T34", "name": "Hayward", "color": "#c27ba0"},
            {"id": "T35", "name": "Hurley", "color": "#8e7cc3"},
            {"id": "T36", "name": "Briggs", "color": "#6fa8dc"},
            {"id": "T37", "name": "Johnson/Briggs", "color": "#93c47d"},
            {"id": "T38", "name": "Packard/Martell", "color": "#76a5af"},
            {"id": "T39", "name": "Renault/One-Eyed", "color": "#cc0000"},
            {"id": "T40", "name": "Double R", "color": "#f1c232"},
            {"id": "T41", "name": "Lodge", "color": "#9c6ade"},
            {"id": "T42", "name": "Town", "color": "#b7b7b7"},
        ],
    },
    {
        "id": "C4",
        "name": "Importance",
        "visible": True,
        "tags": [
            {"id": "T50", "name": "Core", "color": "#ffd966"},
            {"id": "T51", "name": "Major", "color": "#b6d7a8"},
            {"id": "T52", "name": "Supporting", "color": "#a4c2f4"},
            {"id": "T53", "name": "Context/Hidden", "color": "#666666"},
        ],
    },
]

nodes = []
links = []


def N(node_id, name, x, y, node_type, plotline, group, importance, notes, episodes="", gender=None, hidden=False):
    item = {
        "id": node_id,
        "name": name,
        "avatar": None,
        "notes": notes,
        "tags": {"C1": node_type, "C2": plotline, "C3": group, "C4": importance},
        "episodes": ep(episodes),
        "hidden": hidden,
        "x": x,
        "y": y,
        "fx": x,
        "fy": y,
    }
    if gender:
        item["gender"] = gender
    nodes.append(item)


def L(source, target, label, kind="relation", episodes="", notes="", hidden=False, family=None):
    item = {
        "id": f"L{len(links) + 1}",
        "source": source,
        "target": target,
        "label": label,
        "type": kind,
        "episodes": ep(episodes),
        "notes": notes,
        "hidden": hidden,
    }
    if family:
        item["familyRelation"] = family
    links.append(item)


# People and entities
N("N1", "Dale Cooper", 0, 0, "T1", "T18", "T30", "T50", "FBI special agent; Season 2 follows his recovery, Laura Palmer case resolution, suspension, Windom Earle conflict, and Black Lodge entry.", "1,2,3,4,5,6,7,8,9,10,12,13,14,15,16,17,18,19,20,21,22", "male")
N("N2", "Harry S. Truman", -170, 70, "T1", "T18", "T31", "T50", "Twin Peaks sheriff and Cooper's closest local partner; his bond with Cooper anchors the investigation.", "1,2,3,4,5,6,7,8,9,10,15,16,17,18,19,20,21,22", "male")
N("N3", "Albert Rosenfield", -190, -70, "T1", "T18", "T30", "T51", "FBI forensic specialist; repeatedly returns with decisive evidence on Laura, Maddy, Cooper's shooting, Windom Earle, and Josie.", "1,2,9,15,16", "male")
N("N4", "Gordon Cole", -300, -140, "T1", "T12", "T30", "T51", "Cooper's FBI superior; later returns with information on Project Blue Book and reinstates Cooper.", "18", "male")
N("N5", "Garland Briggs", -160, -240, "T1", "T11", "T36", "T50", "Major Briggs links the town story to Project Blue Book, Owl Cave, Windom Earle, and the White/Black Lodge mythology.", "10,11,12,13,18,19,20,21", "male")
N("N6", "Windom Earle", 290, -360, "T1", "T12", "T30", "T50", "Former FBI agent and Cooper's ex-partner; arrives as the late-season antagonist seeking revenge and access to the Black Lodge.", "11,12,13,14,15,17,18,19,20,21,22", "male")
N("N7", "Annie Blackburn", 80, -370, "T1", "T19", "T40", "T50", "Norma's sister; becomes Cooper's love interest and the target Earle uses to lure Cooper into the Black Lodge.", "17,18,19,20,21,22", "female")
N("N8", "Caroline Earle", 155, -455, "T1", "T12", "T30", "T51", "Windom Earle's murdered wife and Cooper's former love; her memory explains Cooper and Earle's feud.", "14,15,22", "female")
N("N9", "Laura Palmer", -30, 165, "T1", "T10", "T32", "T50", "Murdered teenager whose case still structures the first half of Season 2 through visions, diary fragments, and the killer reveal.", "1,3,4,6,7,8,9,22", "female")
N("N10", "Leland Palmer", 175, 115, "T1", "T10", "T32", "T50", "Laura's father; white-haired, unstable, revealed as BOB's host and Laura/Maddy's killer before dying in custody.", "1,4,7,8,9,10,22", "male")
N("N11", "Sarah Palmer", 45, 275, "T1", "T10", "T32", "T51", "Laura's mother; haunted by visions and later left to process Leland and Laura's deaths.", "1,7,8,10", "female")
N("N12", "Maddy Ferguson", 235, 215, "T1", "T10", "T32", "T50", "Laura's cousin; her murder becomes the second major killing that exposes the Palmer/BOB truth.", "1,7,8,9,22", "female")
N("N13", "BOB", 280, -55, "T4", "T11", "T41", "T50", "Malevolent possessing entity connected to Laura's murder, Leland, Maddy's murder, and the final Cooper cliffhanger.", "1,2,7,9,22", "male")
N("N14", "MIKE / Phillip Gerard", 150, -150, "T4", "T11", "T41", "T50", "One-armed man/inhabited host whose withdrawal lets MIKE point Cooper toward BOB.", "2,7,9", "male")
N("N15", "The Giant", 80, -255, "T4", "T11", "T41", "T50", "Visionary figure who gives Cooper clues and later returns during the Black Lodge mythology.", "1,9,22", "male")
N("N16", "Man From Another Place", 430, -35, "T4", "T11", "T41", "T51", "Red Room/Lodge figure tied to Cooper's dream language and Season 2 finale imagery.", "9,22", "male")
N("N17", "Ronette Pulaski", 275, -215, "T1", "T10", "T42", "T51", "Survivor of Laura's attack; her hospital attack and memory fragments remain part of the Laura case.", "3,7", "female")
N("N18", "Donna Hayward", -520, 100, "T1", "T15", "T34", "T51", "Laura's friend; investigates Laura's secret life through Harold Smith and later the Tremond/Chalfont clue.", "3,4,5,6,7,8,9,20,21", "female")
N("N19", "James Hurley", -610, 190, "T1", "T20", "T35", "T52", "Laura/Donna's love triangle figure; after the killer reveal he drifts into the Evelyn Marsh subplot.", "6,8,9,11,14,15", "male")
N("N20", "Harold Smith", -445, 25, "T1", "T15", "T42", "T51", "Reclusive friend of Laura who holds her secret diary; his death and torn diary redirect the investigation.", "3,4,5,6,7", "male")
N("N21", "Audrey Horne", 540, 80, "T1", "T14", "T33", "T50", "Ben Horne's daughter; rescued from One-Eyed Jack's, helps clear Cooper, then enters the Wheeler/Ghostwood/Miss Twin Peaks arcs.", "1,3,4,5,6,12,14,16,17,18,20,21,22", "female")
N("N22", "Ben Horne", 625, -30, "T1", "T14", "T33", "T50", "Great Northern owner; tied to One-Eyed Jack's, arrested for Laura's murder, then spirals before turning to Ghostwood and Wheeler.", "1,3,4,8,9,12,14,16,17,22", "male")
N("N23", "Jerry Horne", 735, -45, "T1", "T14", "T33", "T53", "Ben's brother and business accomplice; context node for Horne schemes.", "1,12", "male", True)
N("N24", "John Justice Wheeler", 565, 210, "T1", "T14", "T33", "T52", "Businessman Ben brings in to help; forms a short romance with Audrey.", "16,17,18,20", "male")
N("N25", "Jean Renault", 815, 115, "T1", "T14", "T39", "T51", "Jacques and Bernard's brother; blackmails Ben and targets Cooper during the Audrey/One-Eyed Jack's plot.", "3,4,5", "male")
N("N26", "Blackie O'Reilly", 830, 210, "T1", "T14", "T39", "T52", "Madam at One-Eyed Jack's involved in Audrey's captivity.", "3,4,5", "female")
N("N27", "Bobby Briggs", -425, 360, "T1", "T16", "T37", "T51", "Shelly's lover and Major Briggs's son; later works with Ben and reveals Hank shot Leo.", "5,6,7,12,14,15,20,21", "male")
N("N28", "Shelly Johnson", -320, 430, "T1", "T16", "T37", "T51", "Leo's wife and Bobby's lover; handles Leo's home care and later survives his escape.", "1,5,6,14,15,20", "female")
N("N29", "Leo Johnson", -225, 385, "T1", "T16", "T37", "T51", "Violent husband of Shelly; survives shooting, becomes incapacitated, escapes, and is later used by Windom Earle.", "1,5,7,14,15,21", "male")
N("N30", "Hank Jennings", -160, 305, "T1", "T16", "T40", "T52", "Criminal husband of Norma; implicated in Leo's shooting and Packard/Josie plots.", "12,15,16", "male")
N("N31", "Norma Jennings", -520, 430, "T1", "T17", "T40", "T51", "Double R owner; Annie's sister and Ed's longtime love.", "8,11,17,20,22", "female")
N("N32", "Ed Hurley", -705, 360, "T1", "T17", "T35", "T51", "Married to Nadine and in love with Norma; their triangle resurfaces at season end.", "5,10,20,22", "male")
N("N33", "Nadine Hurley", -790, 280, "T1", "T17", "T35", "T51", "Wakes believing she is a high-schooler, joins wrestling, dates Mike, then regains memory after head trauma.", "5,11,13,22", "female")
N("N34", "Mike Nelson", -875, 245, "T1", "T17", "T42", "T53", "High-school boy who becomes involved with Nadine during her amnesiac return to school.", "11,13", "male", True)
N("N35", "Lucy Moran", -160, 625, "T1", "T18", "T31", "T52", "Sheriff's station receptionist; chooses Andy as father of her baby during the Miss Twin Peaks arc.", "10,11,13,21", "female")
N("N36", "Andy Brennan", -300, 625, "T1", "T18", "T31", "T52", "Deputy; comic-investigative thread with Dick and key clue work near the finale.", "4,9,11,13,19,21", "male")
N("N37", "Dick Tremayne", -40, 645, "T1", "T18", "T42", "T53", "Lucy's other suitor; shares Little Nicky subplot and becomes part of the baby-father choice.", "11,13,21", "male", True)
N("N38", "Little Nicky", -25, 760, "T1", "T18", "T42", "T53", "Orphan subplot connected to Andy and Dick; low-priority context node.", "11,13", "male", True)
N("N39", "Josie Packard", 560, 365, "T1", "T13", "T38", "T50", "Packard widow; flees after the mill fire, is revealed as Cooper's shooter, and dies after the Eckhardt confrontation.", "1,12,15,16,17", "female")
N("N40", "Catherine Martell", 705, 345, "T1", "T13", "T38", "T51", "Survives the mill fire, returns disguised, and contests Packard/Ghostwood control.", "1,11,12,19,22", "female")
N("N41", "Pete Martell", 790, 265, "T1", "T13", "T38", "T51", "Catherine's husband; survives the mill fire and helps open Eckhardt's puzzle box.", "1,19,22", "male")
N("N42", "Andrew Packard", 825, 385, "T1", "T13", "T38", "T51", "Presumed-dead Packard who resurfaces, reshaping Josie/Catherine/Eckhardt stakes.", "11,16,19,22", "male")
N("N43", "Thomas Eckhardt", 685, 485, "T1", "T13", "T38", "T52", "Josie's former lover/enemy whose arrival triggers her final crisis.", "16,17", "male")
N("N44", "Jonathan", 580, 490, "T1", "T13", "T38", "T53", "Eckhardt/Josie-associated enforcer; context node for the Packard threat.", "15,16", "male", True)
N("N45", "Evelyn Marsh", -790, 625, "T1", "T20", "T42", "T52", "Wealthy woman who draws James into an off-town murder frame-up.", "11,14,15", "female")
N("N46", "Malcolm Sloan", -915, 650, "T1", "T20", "T42", "T53", "Evelyn's accomplice/lover in the James frame-up subplot.", "14,15", "male", True)
N("N47", "Dwayne Milford", -920, 520, "T1", "T18", "T42", "T53", "Town mayor; context for the Milford/Lana subplot.", "10", "male", True)
N("N48", "Lana Milford", -1010, 560, "T1", "T18", "T42", "T53", "Younger woman in the Milford subplot; low-priority context node.", "10", "female", True)

# Events, places, and clue hubs
N("N49", "Laura Palmer Case", 115, 0, "T2", "T10", "T42", "T50", "Season 2's first-half murder investigation; use as a hub instead of connecting every investigator directly to every clue.", "1,2,3,4,5,6,7,8,9")
N("N50", "Cooper Shooting / Giant Clues", 80, -105, "T2", "T11", "T30", "T50", "Cooper recovers from being shot and receives the Giant's clues: a supernatural frame for the remaining Laura investigation.", "1")
N("N51", "Packard Mill Fire Aftermath", 780, 560, "T2", "T13", "T38", "T51", "Fallout from the mill fire: Shelly and Pete survive, Catherine disappears, Josie flees, Leo is guarded.", "1")
N("N52", "Secret Diary / Harold Smith", -360, 60, "T2", "T15", "T42", "T50", "Donna and Maddy's attempt to retrieve Laura's diary from Harold; ends with Harold's death and diary damage.", "3,4,5,6,7")
N("N53", "One-Eyed Jack's Rescue", 710, 100, "T2", "T14", "T39", "T50", "Audrey's captivity and Cooper/Truman's unauthorized raid; later causes Cooper's FBI suspension.", "3,4,5,6,10")
N("N54", "Maddy Murder", 305, 205, "T2", "T10", "T32", "T50", "Second killing by Leland/BOB that lets Cooper connect the case spiritually and forensically.", "7,8,9")
N("N55", "Killer Reveal / Leland Death", 360, 95, "T2", "T10", "T32", "T50", "Cooper exposes Leland as BOB's host; BOB departs and Leland dies in custody.", "9")
N("N56", "Cooper Suspension", -70, -120, "T2", "T12", "T30", "T51", "FBI suspends Cooper after the One-Eyed Jack's raid, keeping him in Twin Peaks as Earle approaches.", "10,12,18")
N("N57", "Project Blue Book", -10, -310, "T3", "T11", "T36", "T50", "Air Force/Briggs research context connecting Owl Cave, the Lodges, and Windom Earle.", "12,18,19,20")
N("N58", "Briggs Disappearance", -70, -405, "T2", "T11", "T36", "T51", "Major Briggs vanishes in the woods and returns with no memory and a strange mark.", "11,12,13")
N("N59", "Windom Earle Chess Game", 365, -300, "T2", "T12", "T30", "T50", "Earle announces his revenge on Cooper through a deadly chess game.", "13,14,15,17,18")
N("N60", "Josie Revealed / Death", 625, 420, "T2", "T13", "T38", "T50", "Albert reveals Josie shot Cooper; her death after Eckhardt leaves Harry devastated and supernatural questions open.", "16,17")
N("N61", "Owl Cave Petroglyph", 505, -300, "T5", "T11", "T41", "T50", "Map-like symbol discovered by Cooper, Briggs, Truman, Andy and others; key to entering the Black Lodge.", "19,20,21")
N("N62", "White Lodge / Black Lodge Lore", 430, -420, "T2", "T11", "T41", "T50", "Late-season mythology explaining Earle's objective and Cooper's danger.", "18,19,20,21,22")
N("N63", "Miss Twin Peaks Pageant", 525, -535, "T2", "T19", "T42", "T50", "Earle targets the pageant and uses Annie as the gateway victim for the Black Lodge.", "20,21,22")
N("N64", "Black Lodge", 455, -125, "T3", "T11", "T41", "T50", "The extradimensional destination of Earle, Annie, Cooper, BOB, and the finale's cliffhanger.", "21,22")
N("N65", "Possessed Cooper Cliffhanger", 205, -535, "T2", "T11", "T41", "T50", "Final state of Season 2: Cooper returns, but BOB's reflection indicates possession or replacement.", "22")
N("N66", "Ghostwood Estates", 665, -180, "T3", "T13", "T33", "T51", "Development/business plot connecting Ben, Catherine, Packard power, and Audrey's protest.", "12,16,22")
N("N67", "Double R Diner", -625, 485, "T3", "T17", "T40", "T51", "Norma's diner; social hub and Annie's arrival point.", "8,17,20")
N("N68", "Twin Peaks Sheriff's Department", -290, 5, "T3", "T18", "T31", "T50", "Main investigation workspace for Cooper, Truman, Hawk, Andy, Lucy, and FBI visitors.", "1,2,3,4,5,6,7,8,9,15,16,19,20,21")
N("N69", "Great Northern Hotel", 590, -145, "T3", "T14", "T33", "T51", "Ben Horne's hotel and a recurring site for Cooper, One-Eyed Jack's business, and Laura-case clues.", "1,3,7,12,16")
N("N70", "Marsh Murder Frame-Up", -790, 765, "T2", "T20", "T42", "T52", "James is drawn into Evelyn and Malcolm's scheme around Jeffrey Marsh's death.", "14,15")
N("N71", "Lucy Baby Choice", -185, 740, "T2", "T18", "T31", "T52", "Lucy resolves the Andy/Dick baby-father triangle at the Miss Twin Peaks event.", "21")
N("N72", "Eckhardt Puzzle Box", 890, 465, "T5", "T13", "T38", "T52", "Eckhardt's final nested box/lockbox subplot with Andrew, Pete, and Catherine.", "19,22")

# Links are intentionally routed through event hubs to keep the visualization readable.
L("N1", "N68", "works with", episodes="1,2,3,4,5,6,7,8,9", notes="Cooper continues working with the sheriff's department throughout the Laura investigation.")
L("N2", "N68", "leads", episodes="1,2,3,4,5,6,7,8,9", notes="Truman anchors local law enforcement.")
L("N1", "N2", "partners", episodes="1,2,3,4,5,6,7,8,9,15,16,19,20,21,22", notes="Cooper and Truman function as the main investigative pair.")
L("N3", "N1", "forensic support", episodes="1,2,9,15,16", notes="Albert gives Cooper key forensic and investigative updates.")
L("N1", "N49", "investigates", "action", "1,2,3,4,5,6,7,8,9", "Main arc: Cooper pushes the Laura Palmer investigation to resolution.")
L("N9", "N49", "victim at center", episodes="1,2,3,4,5,6,7,8,9", notes="Laura is the case's absent center.")
L("N50", "N1", "gives clues to", "action", "1", "The Giant appears to Cooper after the shooting.")
L("N15", "N50", "appears in", "action", "1", "The Giant frames the mystery in supernatural terms.")
L("N50", "N49", "redirects", "action", "1", "The clues point Cooper beyond ordinary suspects.")
L("N17", "N49", "survivor witness", episodes="3,7", notes="Ronette remains a witness/victim connected to Laura's attack.")
L("N14", "N1", "points toward BOB", "action", "7,9", "MIKE/Gerard helps Cooper find BOB when Gerard is off medication.")
L("N14", "N13", "former killing partners", episodes="7,9", notes="MIKE describes a prior connection to BOB.")
L("N13", "N10", "possesses host", "action", "7,9", "BOB is tied to Leland as host/possessor.")
L("N10", "N9", "father / killer reveal", episodes="9", notes="Leland is Laura's father and is revealed as the killer under BOB's influence.", family="parent")
L("N10", "N12", "murders", "action", "7,8,9", "Maddy's killing confirms the pattern and exposes Leland/BOB.")
L("N54", "N12", "victim", episodes="7,8,9", notes="Maddy is the victim of the second major killing.")
L("N54", "N10", "killer", episodes="7,8,9", notes="Leland/BOB commits the murder.")
L("N54", "N55", "leads to reveal", "action", "9", "Maddy's death gives Cooper the final case momentum.")
L("N1", "N55", "sets trap / reveals", "action", "9", "Cooper stages the confrontation that reveals Leland/BOB.")
L("N55", "N13", "BOB departs", "action", "9", "BOB leaves Leland as Leland dies.")
L("N55", "N10", "dies in custody", "action", "9", "Leland remembers and dies after the reveal.")
L("N11", "N10", "widow / survivor", episodes="10", notes="Sarah is left to process Leland and Laura's deaths.", family="spouse")
L("N11", "N9", "mother", episodes="1,10", notes="Sarah remains Laura's grieving mother.", family="parent")
L("N18", "N52", "investigates diary", "action", "3,4,5,6,7", "Donna uses Harold to reach Laura's secret diary.")
L("N20", "N52", "keeps diary", episodes="3,4,5,6,7", notes="Harold holds Laura's private writings.")
L("N9", "N52", "diary source", episodes="3,4,5,6,7", notes="Laura's diary continues to reveal hidden life details.")
L("N19", "N18", "romantic tension", episodes="8,9", notes="Donna and James reaffirm their love after Maddy disappears.")
L("N19", "N9", "former lover", episodes="8,9", notes="James remains emotionally tied to Laura and her double life.", hidden=True)
L("N20", "N18", "befriends / unnerves", episodes="3,4,5,6", notes="Harold's bond with Donna becomes tense and unstable.")
L("N52", "N49", "clue path", "action", "3,4,5,6,7", "The diary path helps Cooper and Donna reach Mrs. Tremond/Chalfont clues.")
L("N21", "N53", "held captive / rescued", "action", "3,4,5,6", "Audrey's One-Eyed Jack's crisis is a major early-season rescue arc.")
L("N25", "N53", "blackmails Ben", "action", "3,4,5", "Jean Renault uses Audrey to pressure Ben and trap Cooper.")
L("N26", "N53", "controls house", episodes="3,4,5", notes="Blackie is part of the One-Eyed Jack's captivity plot.")
L("N22", "N53", "targeted by blackmail", episodes="3,4,5", notes="Ben is forced into the Audrey ransom/blackmail scheme.")
L("N1", "N53", "unauthorized rescue raid", "action", "5,6", "Cooper and Truman raid One-Eyed Jack's to recover Audrey.")
L("N2", "N53", "backs raid", "action", "5,6", "The raid later contributes to Cooper's suspension.")
L("N53", "N56", "causes suspension", "action", "10,12", "The unauthorized raid becomes the FBI basis for suspending Cooper.")
L("N21", "N22", "daughter / father", episodes="1,3,4,5,12,14,16,17,22", notes="Audrey and Ben's relationship shifts from rebellion to rescue/rehabilitation of Ben.", family="child")
L("N22", "N69", "owns / operates", episodes="1,3,7,12,16", notes="Ben's power base is the Great Northern Hotel.")
L("N22", "N66", "development scheme", episodes="12,16,22", notes="Ben remains tied to Ghostwood business stakes.")
L("N21", "N24", "romance", episodes="17,18,20", notes="Audrey and Wheeler begin a short romantic arc.")
L("N24", "N22", "brought in by", episodes="16,17", notes="Ben enlists Wheeler for business help.")
L("N21", "N63", "candidate / protest arc", "action", "20,21,22", "Audrey is drawn into pageant/Ghostwood climax and protests in the finale.")
L("N23", "N22", "brother / accomplice", episodes="1,12", notes="Jerry is context for Horne business schemes.", hidden=True, family="sibling")
L("N27", "N28", "lovers", episodes="5,6,15,20", notes="Bobby and Shelly repeatedly reaffirm their relationship despite Leo/Hank fallout.")
L("N29", "N28", "abusive husband", episodes="5,14,15", notes="Leo's marriage to Shelly remains threatening.", family="spouse")
L("N29", "N51", "survives shooting/fire fallout", episodes="1", notes="Leo survives but is incapacitated under guard.")
L("N51", "N28", "survives mill fire", "action", "1", "Shelly survives the Packard mill fire aftermath.")
L("N27", "N29", "reveals Hank shot Leo", "action", "15", "Bobby tells Truman he saw Hank shoot Leo.")
L("N30", "N29", "shot / framed fallout", "action", "15,16", "Hank is blamed/imprisoned for Leo-related violence.")
L("N6", "N29", "uses as captive pawn", "action", "20,21", "Earle later punishes Leo for freeing Briggs.")
L("N28", "N67", "works at", episodes="5,20", notes="Shelly is part of the Double R social world.", hidden=True)
L("N31", "N67", "owns / runs", episodes="8,17,20", notes="Norma's diner is a town hub.")
L("N31", "N32", "longtime love", episodes="20,22", notes="Ed and Norma's relationship resurfaces when Nadine's amnesia breaks.")
L("N32", "N33", "married", episodes="5,11,13,22", notes="Ed is married to Nadine; her head trauma resets the amnesia plot.", family="spouse")
L("N33", "N34", "high-school affair", episodes="11,13", notes="Nadine's altered state draws her into Mike Nelson's school world.", hidden=True)
L("N31", "N7", "sisters", episodes="17,18,19", notes="Annie arrives as Norma's sister.", family="sibling")
L("N36", "N35", "romance / baby father", episodes="10,21", notes="Lucy ultimately chooses Andy as the father figure for her baby.")
L("N37", "N35", "rival suitor", episodes="11,21", notes="Dick is the alternative baby-father candidate.", hidden=True)
L("N36", "N37", "Little Nicky investigation", episodes="11,13", notes="Andy and Dick investigate Little Nicky together.", hidden=True)
L("N38", "N36", "orphan subplot", episodes="11,13", notes="Low-priority comic subplot.", hidden=True)
L("N35", "N71", "chooses father", "action", "21", "Lucy resolves the baby-father triangle at the pageant.")
L("N36", "N61", "clue work", "action", "19,20,21", "Andy is involved in clue discovery near the Owl Cave/Black Lodge arc.")
L("N51", "N40", "missing after fire", "action", "1", "Catherine disappears after the fire, later returning in disguise.")
L("N51", "N39", "flees suspicion", "action", "1", "Josie flees after the mill fire.")
L("N40", "N41", "married", episodes="1,19,22", notes="Catherine and Pete remain tied through Packard/Martell stakes.", family="spouse")
L("N39", "N42", "widow / false death", episodes="11,16", notes="Andrew's return exposes Packard deception around Josie.", family="spouse")
L("N39", "N60", "revealed shooter / dies", "action", "16,17", "Josie is revealed as Cooper's shooter and dies after the Eckhardt confrontation.")
L("N3", "N60", "reveals evidence", "action", "16", "Albert reveals Josie shot Cooper.")
L("N2", "N60", "grieves Josie", episodes="17", notes="Harry falls into depression after Josie's death.")
L("N43", "N39", "past lover / threat", episodes="16,17", notes="Eckhardt's arrival drives Josie's final crisis.")
L("N44", "N43", "enforcer context", episodes="15,16", notes="Jonathan supports the Eckhardt/Josie threat line.", hidden=True)
L("N40", "N66", "business conflict", episodes="12,16,22", notes="Catherine is connected to Ghostwood/Packard property stakes.")
L("N42", "N72", "opens final box", "action", "19,22", "Andrew works through Eckhardt's nested puzzle box.")
L("N41", "N72", "opens with Andrew", "action", "22", "Pete helps Andrew open the box.")
L("N40", "N72", "inherits stakes", episodes="19,22", notes="Catherine is tied to Eckhardt's box aftermath.")
L("N19", "N45", "hired / seduced", episodes="11,14,15", notes="James is drawn into Evelyn's off-town storyline.")
L("N45", "N70", "frames murder", "action", "14,15", "Evelyn is central to the Marsh murder frame-up.")
L("N46", "N70", "accomplice", "action", "14,15", "Malcolm is part of the scheme against James.", hidden=True)
L("N19", "N70", "suspect / flees", "action", "14,15", "Police search for James after the Marsh murder frame-up.")
L("N6", "N1", "former partner / enemy", episodes="14,15,17,18,19,20,21,22", notes="Earle seeks revenge on Cooper and exploits Cooper's past with Caroline.")
L("N6", "N8", "murdered wife", episodes="14,15", notes="Caroline's murder explains the Cooper/Earle feud.", family="spouse")
L("N1", "N8", "former love", episodes="14,15,22", notes="Cooper's guilt over Caroline is a vulnerability Earle uses.")
L("N6", "N59", "runs deadly chess game", "action", "13,14,15,17,18", "Earle announces himself with a chess-based murder game.")
L("N59", "N1", "targets", "action", "13,14,15,17,18", "The chess game is directed at Cooper.")
L("N5", "N57", "studied woods / signals", episodes="12,18,19,20", notes="Briggs's Air Force work frames the Lodge mythology.")
L("N5", "N58", "vanishes / returns marked", "action", "11,12,13", "Briggs's disappearance is a supernatural and Project Blue Book clue.")
L("N58", "N57", "connects to research", "action", "12,13", "Briggs's disappearance ties to his classified work.")
L("N6", "N57", "former Project Blue Book link", episodes="18,20", notes="Gordon reveals Earle once worked with Briggs on Project Blue Book.")
L("N4", "N1", "reinstates FBI status", "action", "18", "Gordon returns and reinstates Cooper.")
L("N4", "N57", "reports Earle/Briggs past", "action", "18", "Gordon brings the Blue Book information.")
L("N1", "N61", "finds map clue", "action", "19,20,21", "Cooper interprets the Owl Cave petroglyph as the way to the Lodge.")
L("N5", "N61", "interprets with Cooper", "action", "19,20,21", "Briggs helps decode the Lodge path.")
L("N6", "N62", "seeks Lodge power", "action", "18,19,20,21,22", "Earle's objective is access to Black Lodge power.")
L("N62", "N64", "explains destination", episodes="20,21,22", notes="The lore culminates in the Black Lodge entry.")
L("N1", "N7", "romance", episodes="17,18,19,20,21,22", notes="Cooper and Annie form the emotional line Earle exploits.")
L("N7", "N63", "Miss Twin Peaks candidate", "action", "20,21", "Annie enters the pageant and becomes Earle's target.")
L("N6", "N63", "targets pageant", "action", "20,21", "Earle sets his trap at Miss Twin Peaks.")
L("N6", "N7", "kidnaps", "action", "21,22", "Earle abducts Annie to lure Cooper into the Lodge.")
L("N1", "N64", "enters", "action", "22", "Cooper follows Earle and Annie into the Black Lodge.")
L("N6", "N64", "enters / defeated", "action", "22", "Earle reaches the Lodge, where BOB takes his soul.")
L("N7", "N64", "taken into", "action", "22", "Annie is taken into the Lodge as bait.")
L("N13", "N64", "dominates finale", episodes="22", notes="BOB appears as the controlling danger in the Lodge.")
L("N64", "N65", "returns wrong Cooper", "action", "22", "The Lodge sequence leads directly to the possessed-Cooper cliffhanger.")
L("N13", "N65", "reflected in Cooper", "action", "22", "BOB appears in the mirror with Cooper at the end.")
L("N1", "N65", "cliffhanger body", episodes="22", notes="The finale leaves Cooper's state unresolved.")
L("N15", "N64", "Lodge figure", episodes="22", notes="The Giant is part of the finale's supernatural frame.")
L("N16", "N64", "Red Room figure", episodes="22", notes="The Man From Another Place appears in Red Room/Lodge imagery.")
L("N9", "N64", "appears in Red Room", episodes="22", notes="Laura's image returns in the finale's Lodge space.")
L("N12", "N64", "appears in Lodge space", episodes="22", notes="Maddy appears in Cooper's Lodge experience.")
L("N10", "N64", "appears in Lodge space", episodes="22", notes="Leland appears during the finale's Lodge sequence.")
L("N47", "N48", "brother objects to marriage", episodes="10", notes="Milford subplot context from Dispute Between Brothers.", hidden=True)
L("N63", "N71", "pageant side resolution", "action", "21", "Lucy's choice happens in the Miss Twin Peaks episode.")
L("N31", "N7", "brings Annie to town", "action", "17", "Annie arrives through Norma's Double R world.")
L("N33", "N63", "head trauma in finale", "action", "22", "Nadine's trauma at the finale changes the Ed/Norma/Nadine triangle.")

episodes = [
    (1, "May the Giant Be with You", "Cooper survives the shooting and receives Giant clues; the mill fire fallout scatters Josie/Catherine/Shelly/Pete while Leo remains alive under guard.", ["Cooper Shooting / Giant Clues", "Packard Mill Fire Aftermath"], ["Cooper-Giant supernatural clue relation begins", "Leo excluded as Laura killer; Leland becomes stranger after Jacques killing fallout"]),
    (2, "Coma", "Albert narrows the Laura case and Cooper focuses on BOB as the third man; Windom Earle is introduced as a future threat through escape news.", ["Laura Palmer Case"], ["Cooper-Albert forensic line deepens", "BOB becomes a named investigative target"]),
    (3, "The Man Behind the Glass", "Ronette is attacked; Jean Renault pressures Ben over Audrey; Donna enters Harold Smith's Laura-diary path.", ["Secret Diary / Harold Smith", "One-Eyed Jack's Rescue"], ["Donna-Harold relation begins", "Jean-Ben-Audrey blackmail triangle forms"]),
    (4, "Laura's Secret Diary", "Leland confesses to Jacques's killing; Audrey remains leverage for Jean; Donna/Harold diary plot escalates.", ["Secret Diary / Harold Smith", "One-Eyed Jack's Rescue"], ["Leland's violence becomes explicit", "Ben becomes trapped by Jean over Audrey"]),
    (5, "The Orchid's Curse", "Cooper and Truman raid One-Eyed Jack's; Shelly and Bobby manage Leo at home; Nadine returns with high-school delusion.", ["One-Eyed Jack's Rescue"], ["Cooper/Truman rescue Audrey", "Shelly-Bobby-Leo domestic line restarts", "Nadine high-school arc begins"]),
    (6, "Demons", "James helps Donna/Maddy escape Harold; Cooper brings Audrey home; the insurance plan around Leo unravels.", ["Secret Diary / Harold Smith", "One-Eyed Jack's Rescue"], ["Audrey returns safely", "Donna-Harold relation breaks", "Bobby-Shelly scheme weakens"]),
    (7, "Lonely Souls", "MIKE helps Cooper inspect Great Northern guests; Harold is found dead; Leland/BOB murders Maddy.", ["Maddy Murder", "Secret Diary / Harold Smith"], ["MIKE-Cooper link reveals BOB logic", "Leland/BOB-Maddy murder becomes decisive case turn"]),
    (8, "Drive with a Dead Girl", "Donna and James question Maddy's sudden absence; Cooper arrests Ben as a pressure move while Leland carries the actual crime.", ["Maddy Murder"], ["Donna-James react to Maddy disappearance", "Ben becomes false suspect"]),
    (9, "Arbitrary Law", "Cooper gets final clues, identifies Leland/BOB, and the Laura Palmer murder arc reaches confession/death.", ["Killer Reveal / Leland Death"], ["Leland revealed as killer/host", "BOB mythology moves from clue to explanation"]),
    (10, "Dispute Between Brothers", "Leland is buried; Cooper prepares to leave but remains exposed to suspension and new threats; Briggs/Lodge context begins rising.", ["Cooper Suspension"], ["Sarah processes Palmer tragedy", "Cooper remains in town after case resolution"]),
    (11, "Masked Ball", "Briggs disappears; Nadine enters wrestling and Mike romance; James meets Evelyn Marsh; Dick/Little Nicky subplot starts.", ["Briggs Disappearance", "Marsh Murder Frame-Up"], ["Briggs becomes supernatural-military clue", "James detaches into Evelyn plot"]),
    (12, "The Black Widow", "Ben cracks mentally and uses Bobby; Cooper considers staying; Briggs's supervisor clarifies woods research.", ["Project Blue Book", "Ghostwood Estates"], ["Ben-Bobby alliance starts", "Briggs/Project Blue Book line becomes explicit"]),
    (13, "Checkmate", "Briggs returns with a mark; Andy/Dick investigate Little Nicky; Nadine/Mike affair intensifies; Earle chess danger builds.", ["Briggs Disappearance", "Windom Earle Chess Game"], ["Briggs returns altered", "Earle's chess game becomes active threat"]),
    (14, "Double Play", "Earle takes a chess victim; Audrey/Bobby try to rescue Ben from Civil War fantasy; Leo wakes and attacks Shelly.", ["Windom Earle Chess Game"], ["Earle-Cooper conflict becomes lethal", "Leo re-enters Shelly/Bobby threat line"]),
    (15, "Slaves and Masters", "Police hunt James in Marsh murder; Bobby identifies Hank as Leo's shooter; Albert returns with Earle information.", ["Marsh Murder Frame-Up", "Windom Earle Chess Game"], ["James becomes framed suspect", "Hank-Leo truth surfaces", "Albert reinforces Earle threat"]),
    (16, "The Condemned Woman", "Hank is jailed, Josie is exposed as Cooper's shooter, and Ben brings in Wheeler.", ["Josie Revealed / Death", "Ghostwood Estates"], ["Josie-Cooper shooting link is confirmed", "Wheeler-Audrey/Ben business line begins"]),
    (17, "Wounds and Scars", "Harry collapses after Josie's death; Annie arrives; Wheeler and Audrey connect; Earle's stalemate grows.", ["Josie Revealed / Death", "Miss Twin Peaks Pageant"], ["Annie enters Cooper/Norma world", "Harry-Josie aftermath becomes emotional focus"]),
    (18, "On the Wings of Love", "Gordon reports Earle/Briggs Project Blue Book history and reinstates Cooper; Audrey/Wheeler romance develops.", ["Project Blue Book", "White Lodge / Black Lodge Lore"], ["Cooper returns to FBI standing", "Earle-Briggs-Blue Book connection confirmed"]),
    (19, "Variations on Relations", "Cooper's group finds the Owl Cave petroglyph; Earle teaches Lodge lore; Pete and Catherine open the first puzzle box.", ["Owl Cave Petroglyph", "Eckhardt Puzzle Box"], ["Owl Cave becomes Lodge map", "Earle's Black/White Lodge objective becomes explicit"]),
    (20, "The Path to the Black Lodge", "Cooper warns Shelly, Donna, and Audrey about Earle; Briggs shares Earle's Lodge tape; Bobby/Shelly reaffirm love.", ["White Lodge / Black Lodge Lore", "Miss Twin Peaks Pageant"], ["Earle threat extends to women around Cooper", "Cooper-Annie grows while danger converges on pageant"]),
    (21, "Miss Twin Peaks", "Earle targets the pageant, Leo frees Briggs and is punished, Cooper unlocks the Lodge entrance, Annie and Dale commit.", ["Miss Twin Peaks Pageant", "Owl Cave Petroglyph"], ["Earle kidnaps Annie as gateway victim", "Lucy chooses Andy", "Cooper finds Black Lodge key"]),
    (22, "Beyond Life and Death", "Cooper follows Earle and Annie into the Black Lodge; Ed/Norma/Nadine shift after head trauma; Audrey protests; the finale ends with possessed-Cooper cliffhanger.", ["Black Lodge", "Possessed Cooper Cliffhanger", "Eckhardt Puzzle Box"], ["Cooper-Annie-Earle-Lodge arc climaxes", "BOB/Cooper cliffhanger becomes final state", "Audrey and Packard/Ghostwood lines are left unresolved"]),
]


def validate():
    ids = {n["id"] for n in nodes}
    if len(ids) != len(nodes):
        raise ValueError("Duplicate node ids")
    missing = [l for l in links if l["source"] not in ids or l["target"] not in ids]
    if missing:
        raise ValueError(f"Missing link endpoints: {missing[:3]}")
    tag_ids = {tag["id"] for c in categories for tag in c["tags"]}
    bad_tags = [n for n in nodes for t in n["tags"].values() if t not in tag_ids]
    if bad_tags:
        raise ValueError(f"Unknown tags: {bad_tags[:3]}")


def write_outputs():
    out_data = Path("data")
    out_docs = Path("docs")
    out_data.mkdir(exist_ok=True)
    out_docs.mkdir(exist_ok=True)

    data = {
        "version": 4,
        "title": "Twin Peaks Season 2 Atlas",
        "description": "Structured extraction dataset for visualizing Twin Peaks Season 2 character relationships and plot development. Built from public episode guides and recap sources; no transcript text is reproduced.",
        "nodes": nodes,
        "links": links,
        "tagCategories": categories,
        "nextId": 500,
        "linkTypes": {
            "relation": {"label": "关系", "color": "#6f7f86", "width": 1.3, "dasharray": "4,4", "labelColor": "#b9c4c8", "directed": False, "labelFontSize": 0, "labelOrientation": "parallel"},
            "action": {"label": "行动", "color": "#68a36f", "width": 1.8, "dasharray": "", "labelColor": "#8dcc8d", "directed": True, "labelFontSize": 0, "labelOrientation": "parallel"},
        },
        "graphStyle": {"nodeLabelColor": "#e8e4d6", "nodeLabelFontSize": 11, "nodeScale": 0.85, "nodeLabelOpacity": 0.95},
        "graphBackgroundColor": "#050708",
        "forceConfig": {"centerStrength": 0.02, "chargeStrength": -450, "linkStrength": 0.25, "linkDistance": 170},
        "sources": [{"id": sid, "label": label, "url": url, "usage": usage} for sid, label, url, usage in SOURCES],
    }
    json_path = out_data / "twin-peaks-season-2.json"
    json_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    report = [
        "# Twin Peaks Season 2 Extraction Report",
        "",
        "This report summarizes the structured extraction used to generate `data/twin-peaks-season-2.json`. It does not reproduce full scripts or transcripts; it records compact factual summaries, relationship deltas, and source links.",
        "",
        "## Source Policy",
        "",
        "- Primary episode-order and official one-line guide: Paramount+ Season 2 episode guide.",
        "- Episode-level plot points: TV Guide Season 2 episode guide.",
        "- Season-level continuity and arc checks: Wikipedia episode list and Twin Peaks overview pages.",
        "- Transcript/script indexes were checked for availability, but the generated artifacts avoid copying dialogue or script text.",
        "",
        "## Sources",
        "",
    ]
    for _sid, label, url, usage in SOURCES:
        report.append(f"- [{label}]({url}): {usage}")
    report += ["", "## Episode Extraction", ""]
    for num, title, summary, event_nodes, deltas in episodes:
        report += [
            f"### S2E{num} - {title}",
            f"- Summary: {summary}",
            f"- Event nodes: {', '.join(event_nodes)}",
            f"- Relationship deltas: {'; '.join(deltas)}",
            "- Source basis: Paramount+ / TV Guide episode guide entries; season arc cross-checked against Wikipedia/TIME recap where relevant.",
            "",
        ]
    report += [
        "## Extraction Notes",
        "",
        "- Event nodes are intentionally used as hubs to reduce visual clutter. For example, `Maddy Murder`, `Killer Reveal / Leland Death`, `Owl Cave Petroglyph`, and `Miss Twin Peaks Pageant` absorb many otherwise-crossing person-to-person edges.",
        "- Low-priority comic/context subplots are present but default-hidden where they would distract from the main Season 2 atlas.",
        "- Edge labels are set to font size 0 in the JSON defaults so the graph opens in a cleaner state; hover tooltips still carry relation notes.",
        "- Coordinates and fixed positions are included so the import opens as a manually curated thematic atlas rather than a raw force-directed graph.",
        "",
    ]
    (out_docs / "season-2-extraction-report.md").write_text("\n".join(report), encoding="utf-8")

    guide = """# Twin Peaks Season 2 Visualization Guide

Use `data/twin-peaks-season-2.json` with the current Dramatis import flow (`存档` -> `导入 JSON`). The dataset is designed to open as a curated atlas, not as an unfiltered force-directed hairball.

## Recommended Views

1. **Season 2 Overview**
   - Keep `Node Type`, `Plotline`, and `Importance` tag rings visible.
   - Keep relation/action labels hidden by default; rely on hover tooltips.
   - Use the whole graph to see major hubs: Laura case, One-Eyed Jack's, Packard/Ghostwood, Windom Earle, Owl Cave, Black Lodge.

2. **Laura Palmer Case**
   - Show or focus nodes tagged `Laura Case`.
   - Important hubs: `Laura Palmer Case`, `Secret Diary / Harold Smith`, `Maddy Murder`, `Killer Reveal / Leland Death`.
   - Good export after hiding low-priority Horne/Packard/side-comedy nodes.

3. **Windom Earle / Black Lodge**
   - Focus `Windom Earle/FBI` and `Black Lodge` plotlines.
   - Key path: `Windom Earle` -> `Windom Earle Chess Game` -> `Project Blue Book` -> `Owl Cave Petroglyph` -> `Miss Twin Peaks Pageant` -> `Black Lodge` -> `Possessed Cooper Cliffhanger`.

4. **Packard / Ghostwood Business Line**
   - Focus `Packard/Ghostwood`.
   - Key path: `Packard Mill Fire Aftermath` -> `Josie Packard` -> `Josie Revealed / Death`, plus `Catherine`, `Andrew`, `Eckhardt Puzzle Box`, and `Ghostwood Estates`.

5. **Town Relationship Subplots**
   - Focus `Johnson/Leo/Bobby`, `Ed/Norma/Nadine`, and `Teen/Harold/James` separately.
   - These are intentionally not the default export view because they add many crossings when combined with the Black Lodge arc.

## Import And Cleanup Tips

- After import, use `显示` to keep line labels hidden unless you are making an annotated export.
- Use the episode slider to inspect chronological buildup from S2E1 to S2E22.
- For a clean poster export, hide nodes tagged `Context/Hidden`, then export PNG/SVG.
- For analysis, keep hidden nodes available and unhide individual plotlines as needed.

## Why Event Nodes Exist

Twin Peaks Season 2 is not just a social graph. Directly connecting every character to every interaction makes the diagram unreadable. Event nodes let the graph say: several people are connected through a shared event, clue, or location. That preserves plot causality while reducing long crossing edges.

## Suggested Next Manual Pass

- Add character portraits if desired.
- Move clusters slightly after import if your canvas aspect ratio differs.
- If a relationship feels too noisy, mark that edge hidden rather than deleting it; the extraction report keeps the reason for its inclusion.
"""
    (out_docs / "season-2-visualization-guide.md").write_text(guide, encoding="utf-8")
    return json_path, out_docs / "season-2-extraction-report.md", out_docs / "season-2-visualization-guide.md"


if __name__ == "__main__":
    validate()
    paths = write_outputs()
    print(json.dumps({
        "json": str(paths[0]),
        "report": str(paths[1]),
        "guide": str(paths[2]),
        "nodes": len(nodes),
        "links": len(links),
        "hidden_nodes": sum(1 for n in nodes if n.get("hidden")),
        "hidden_links": sum(1 for l in links if l.get("hidden")),
    }, ensure_ascii=False, indent=2))
