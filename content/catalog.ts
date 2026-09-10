import { expandHabitat } from "../src/game/exploration";
import birdAudioSource from "./evidence/bird-audio-source.json" with { type: "json" };
import type {
  SourceRecord,
  DiscoveryRecord,
  HabitatDefinition,
  Vec3,
  EntityInstance,
} from "../src/shared/contracts";

const accessedOn = "2026-09-10";
const source = (
  id: string,
  url: string,
  publisher: string,
  title: string,
  supports: string[],
  locator = "Main species account",
  visualInspected = false,
): SourceRecord => ({
  id,
  url,
  publisher,
  title,
  accessedOn,
  locator,
  supports,
  inspected: true,
  visualInspected,
});
export const sources: SourceRecord[] = [
  birdAudioSource,
  source(
    "gbr-great8",
    "https://www.gbrmpa.gov.au/learn/animals/great-8",
    "Reef Authority",
    "Great 8",
    [
      "Anemonefish and their hosts",
      "Giant clam anatomy and filter feeding",
      "Great Barrier Reef occurrence",
    ],
    "Clownfish; Giant Clams",
  ),
  source(
    "green-island-local",
    "https://greatbarrierreef.org/islands/green-island/",
    "GreatBarrierReef.org travel web magazine",
    "Green Island",
    [
      "Green Island coral cay, beach, turtles, giant clams, anemones, reef habitat",
    ],
    "Travel-magazine description of Big Cat tour; common-name occurrence only, not scientific taxonomy",
  ),
  source(
    "green-coral-study",
    "https://elibrary.gbrmpa.gov.au/entities/publication/27a22c8a-1266-45b2-862e-23e9574eed02",
    "Great Barrier Reef Marine Park Authority",
    "The natural recruitment and recovery process of corals at Green Island",
    ["Local staghorn Acropora colonies"],
    "1989 study abstract; historical occurrence, not current cover",
  ),
  source(
    "seagrass-herbarium",
    "https://www.seagrasswatch.org/herbarium/",
    "Seagrass-Watch",
    "Seagrass Herbarium",
    [
      "Halodule uninervis specimens from Green Island",
      "Leaf and rhizome identification",
    ],
    "Halodule uninervis: Green Island records NFC dates 1990, 1994 and 2002",
  ),
  source(
    "green-turtle-noaa",
    "https://www.fisheries.noaa.gov/species/green-turtle",
    "NOAA Fisheries",
    "Green Turtle",
    ["Adult green turtle grazing", "Flippers, shell and air breathing"],
    "Appearance; Behavior and Diet; hero photograph",
    true,
  ),
  source(
    "clam-dbca",
    "https://www.dbca.wa.gov.au/wildlife-and-ecosystems/marine/marine-parks/fun-facts/giant-clam",
    "Western Australia DBCA",
    "Giant clam",
    ["Two-part shell", "Mantle and filter feeding", "Adult size"],
    "What they eat and how; Behaviour",
    true,
  ),
  source(
    "buck-front",
    "https://www.nps.gov/buis/planyourvisit/upload/Buck-Island-Front.pdf",
    "National Park Service",
    "Buck Island Reef brochure, front",
    [
      "Elkhorn reef form",
      "Blue tang grazing",
      "Spiny lobster shelter",
      "Sea fan and turtle photographs",
      "Local beach and seagrass",
    ],
    "Page 1, 2011 brochure: coral reef and wildlife panels; present population claims excluded",
    true,
  ),
  source(
    "buck-animals",
    "https://www.nps.gov/buis/learn/nature/animals.htm",
    "National Park Service",
    "Buck Island animals",
    ["Hawksbill occurrence", "Brown pelican occurrence and June–March nesting"],
    "Sea Turtles; Birds",
    true,
  ),
  source(
    "buck-monitoring",
    "https://www.nps.gov/im/sfcn/marine-fish.htm",
    "National Park Service",
    "Marine Fish Communities",
    ["Buck Island reef and seagrass monitoring", "Conch and lobster habitat"],
    "U.S. Virgin Islands Monitoring",
  ),
  source(
    "keys-creatures",
    "https://floridakeys.noaa.gov/education/creature-feature.html",
    "NOAA Florida Keys National Marine Sanctuary",
    "Creature Feature",
    [
      "Keys fish and invertebrate anatomy",
      "Schooling grunts",
      "Sea fan coral",
      "Spiny lobster",
    ],
    "Individual labelled species panels",
    true,
  ),
  source(
    "sergeant-major-museum",
    "https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/sergeant-major/",
    "Florida Museum of Natural History",
    "Sergeant Major",
    [
      "Five dark bars",
      "Shallow reef schooling",
      "Atlantic occurrence and wreck substrate",
    ],
    "Habitat; Biology; colour photograph",
    true,
  ),
  source(
    "benwood-noaa",
    "https://floridakeys.noaa.gov/shipwrecktrail/benwood.html",
    "NOAA Florida Keys National Marine Sanctuary",
    "Benwood",
    [
      "Florida Keys 7.6–13.7 m wreck",
      "Broken exterior; triangular steel knees",
      "Sand substrate",
    ],
    "Archaeology; 2017 orthomosaic; present-remains images",
    true,
  ),
  source(
    "benwood-growth",
    "https://sanctuaries.noaa.gov/vr/florida-keys/benwood-wreck/",
    "NOAA Office of National Marine Sanctuaries",
    "Benwood Wreck",
    ["Soft coral, sponges and algae on the wreck", "Wreck exterior appearance"],
    "360-degree survey panorama / introductory text",
  ),
  source(
    "benwood-observation",
    "https://activedivers.org/eNews/eNews_071721.html",
    "Active Divers Association",
    "Reef Report, July 17, 2021",
    ["Benwood local grunts, snappers, lobsters, green moray"],
    "First-person dive report, Benwood at 46 feet; group identification for grunts/snappers",
  ),
  source(
    "casey-aap",
    "https://www.antarctica.gov.au/antarctic-operations/stations-and-field-locations/casey/environment/",
    "Australian Antarctic Program",
    "Casey environment",
    [
      "Casey local Adélie/emperor penguins",
      "Weddell/leopard/elephant seals",
      "Rock and coastal ice",
    ],
    "Casey wildlife; landscape gallery",
    true,
  ),
  source(
    "adelie-aap",
    "https://www.antarctica.gov.au/about-antarctica/animals/penguins/adelie-penguin/",
    "Australian Antarctic Program",
    "Adélie penguin",
    [
      "Windmill Islands summer penguins and krill",
      "White eye ring",
      "Penguin swimming",
    ],
    "Physical description; Distribution; Secret life of penguins transcript",
    true,
  ),
  source(
    "emperor-aap",
    "https://www.antarctica.gov.au/about-antarctica/animals/penguins/emperor-penguin/",
    "Australian Antarctic Program",
    "Emperor penguin",
    ["Largest penguin", "Flightless swimming bird", "Adult form"],
    "Physical description; Diet and feeding; gallery",
    true,
  ),
  source(
    "weddell-aap",
    "https://www.antarctica.gov.au/about-antarctica/animals/seals/weddell-seal/",
    "Australian Antarctic Program",
    "Weddell seal",
    ["Small head, dappled body", "Air breathing through ice openings"],
    "Physical description; Special adaptations; hero image",
    true,
  ),
  source(
    "elephant-aap",
    "https://www.antarctica.gov.au/about-antarctica/animals/seals/elephant-seal/",
    "Australian Antarctic Program",
    "Elephant seal",
    [
      "Southern elephant seal Casey visits",
      "Torpedo body",
      "Swimming and diving",
    ],
    "Physical description; Distribution; gallery",
    true,
  ),
  source(
    "leopard-aap",
    "https://www.antarctica.gov.au/about-antarctica/animals/seals/leopard-seal/",
    "Australian Antarctic Program",
    "Leopard seal",
    ["Long fore-flippers", "Slender spotted body", "Pack-ice habitat"],
    "Physical description; Distribution; hero photograph",
    true,
  ),
  source(
    "snow-petrel-aap",
    "https://www.antarctica.gov.au/about-antarctica/animals/flying-birds/petrels-and-shearwaters/snow-petrel/",
    "Australian Antarctic Program",
    "Snow petrel",
    ["White feathers and dark bill", "Low flight over water"],
    "Physical description; Diet and feeding; hero photograph",
    true,
  ),
  source(
    "snow-petrel-casey",
    "https://www.antarctica.gov.au/news/2010/tracking-the-secret-life-of-snow-petrels/",
    "Australian Antarctic Program",
    "Tracking the secret life of snow petrels",
    ["Casey research population of snow petrels"],
    "2010 tracking project, named stations",
  ),
  source(
    "krill-aap",
    "https://www.antarctica.gov.au/about-antarctica/animals/krill/",
    "Australian Antarctic Program",
    "Antarctic krill",
    ["Antarctic krill anatomy", "Swarming and swimming", "Small crustacean"],
    "Physical description; gallery",
    true,
  ),
  source(
    "ice-aap",
    "https://www.antarctica.gov.au/about-antarctica/ice-and-atmosphere/sea-ice/",
    "Australian Antarctic Program",
    "Sea ice",
    ["Sea ice is frozen seawater", "Seasonal ice habitat"],
    "Sea ice overview",
  ),
  ...(
    [
      "bloody-belly-comb-jelly",
      "barreleye-fish",
      "vampire-squid",
      "big-red-jelly",
      "redhead-larvacean",
    ] as const
  ).map((id) =>
    source(
      `mbari-${id}`,
      `https://www.mbari.org/animal/${id}/`,
      "Monterey Bay Aquarium Research Institute",
      id.replaceAll("-", " "),
      [
        "Identified anatomy",
        "Depth range and midwater habitat",
        "Locomotion and feeding",
      ],
      "Species account, depth panel, research-light photograph; source dive filename retained in reference index",
      true,
    ),
  ),
  source(
    "mbari-local",
    "https://www.mbari.org/education/animals-of-the-deep/",
    "Monterey Bay Aquarium Research Institute",
    "Animals of the Deep",
    ["MBARI research roster and Monterey deep-water exploration"],
    "Species index and linked research accounts",
  ),
  source(
    "monterey-pelican",
    "https://montereybay.noaa.gov/getinvolved/volunteer/bchmon.html",
    "NOAA Monterey Bay National Marine Sanctuary",
    "BeachCOMBERS",
    ["Brown pelican documented in Monterey Bay"],
    "Captioned local monitoring example; used for occurrence only",
  ),
  source(
    "green-rail",
    "https://visitgreenisland.com.au/green-island-eco-tour/",
    "Visit Green Island",
    "Green Island Eco Walk",
    ["Buff-banded rail local occurrence and photograph"],
    "Buff Banded Rail panel; exact photograph buff-banded-rail-1260x700.jpg",
    true,
  ),
  source(
    "rail-birdlife",
    "https://birdlife.org.au/bird-profiles/buff-banded-rail/",
    "BirdLife Australia",
    "Buff-banded Rail",
    ["Identification, size and walking behavior"],
    "Identification and Behaviour",
  ),
  source(
    "turtle-grass-source",
    "https://www.floridamuseum.ufl.edu/southflorida/habitats/seagrasses/species/",
    "Florida Museum of Natural History",
    "Seagrass Species Profiles",
    ["Thalassia testudinum leaves and habitat"],
    "Turtle grass photo by Cathleen Bester and USFWS illustration",
    true,
  ),
  source(
    "seagrass-science",
    "https://www.seagrasswatch.org/seagrass/",
    "Seagrass-Watch",
    "What is seagrass?",
    ["Flowering plant identity", "Leaves, rhizomes and substrate"],
    "What is seagrass?; Roots and rhizomes",
  ),
  source(
    "moray-museum",
    "https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/green-moray/",
    "Florida Museum of Natural History",
    "Green Moray",
    ["Anatomy", "Sheltering behavior", "Florida Keys occurrence"],
    "Habitat; Biology",
  ),
  source(
    "barreleye-aquarium",
    "https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/barreleye",
    "Monterey Bay Aquarium",
    "Barreleye",
    ["Transparent head shield and internal eyes"],
    "Animal account",
  ),
  source(
    "vampire-research",
    "https://www.mbari.org/news/mbari-researchers-discover-what-vampire-squids-eat-its-not-what-you-think/",
    "MBARI",
    "MBARI researchers discover what vampire squids eat",
    ["Observed marine snow feeding", "Monterey ROV observations"],
    "2012 research account and figures",
  ),
  source(
    "benwood-fish-local",
    "https://sailfishscuba.com/benwood-wreck-1",
    "Sail Fish Scuba",
    "Benwood Wreck",
    ["Local yellowtail and sergeant major schools; sea fans"],
    "Local dive operator observation; no history claims used",
  ),
  source(
    "anemonefish-dbca",
    "https://www.dbca.wa.gov.au/wildlife-and-ecosystems/marine/marine-parks/fun-facts/anemonefish",
    "Western Australia DBCA",
    "Anemonefish",
    ["Orange, white-banded morphology and anemone association"],
    "Hero image by PlieDo / Adobe; reference only",
    true,
  ),
  source(
    "aims-coral",
    "https://www.aims.gov.au/research-topics/marine-life/corals",
    "Australian Institute of Marine Science",
    "Corals",
    ["Coral animal identity and branching architecture"],
    "What is a coral?; different_coral_shapes_706px.jpg",
  ),
  source(
    "halodule-visual",
    "https://ian.umces.edu/media-library/halodule-uninervis/",
    "UMCES / James Cook University",
    "Halodule uninervis",
    ["Narrow leaves and rhizome morphology"],
    "Catherine Collier botanical illustration, 2008; visual reference only",
    true,
  ),
  source(
    "acropora-museum",
    "https://australian.museum/blog/amri-news/resilient-coral-rebuilds-on-lizard-island-reefs-/",
    "Australian Museum",
    "Deck the halls, the corals are spawning!",
    ["Indo-Pacific Acropora branching morphology"],
    "Acropora photograph DSC09016 at Lizard Island; morphology only, not Green Island occurrence",
    true,
  ),
  source(
    "halodule-photo",
    "https://commons.wikimedia.org/wiki/File:Seagrass_Halodule_uninervis_(5777808662).jpg",
    "Paul Asman and Jill Lenoble / Wikimedia Commons",
    "Seagrass Halodule uninervis",
    ["Narrow leaf field appearance"],
    "2011 Wakaya Fiji photo; morphology only; CC BY 2.0",
    true,
  ),
  source(
    "grunt-museum",
    "https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/bluestriped-grunt/",
    "Florida Museum of Natural History",
    "Bluestriped Grunt",
    ["Yellow and blue morphology", "Schooling beside ledges"],
    "Doug Perrine portrait and Habitat; Biology",
    true,
  ),
  source(
    "natgeo-clam",
    "https://www.nationalgeographic.com/animals/invertebrates/facts/giant-clam",
    "National Geographic",
    "Giant clam",
    ["Clam shell and mantle morphology"],
    "DeAgostini / Getty Images photograph, viewed; reference only",
    true,
  ),
  source(
    "buck-condition-2022",
    "https://npshistory.com/publications/buis/nrr-2022-2380.pdf",
    "National Park Service / Ogurcak et al.",
    "Natural Resource Condition Assessment: Buck Island Reef National Monument",
    ["Local Thalassia testudinum meadows south of Buck Island"],
    "Printed pp. 23–24 and 120, DOI 10.36967/nrr-2293288; downloaded and text inspected",
  ),
  source(
    "benwood-grunts",
    "https://commons.wikimedia.org/wiki/File:Grunts_Benwood_20080309.jpg",
    "Jstuby / Wikimedia Commons",
    "Grunts at Benwood, 9 March 2008",
    ["Photographed local bluestriped grunts"],
    "Photographer species identification cross-checked Florida Museum morphology; historical occurrence, no current abundance claim",
    true,
  ),
  source(
    "vampire-noaa",
    "https://oceanservice.noaa.gov/facts/vampire-squid-fish.html",
    "NOAA Ocean Service",
    "What are the vampire squid and the vampire fish?",
    ["Two feeding filaments collect marine snow"],
    "Vampire squid account, independent agency cross-check",
  ),
  source(
    "mbari-local-comb",
    "https://annualreport.mbari.org/2024/story/bringing-the-deep-sea-to-land-one-ride-at-a-time",
    "MBARI",
    "Bringing the deep sea to land, one ride at a time",
    ["Monterey bloody-belly comb jelly at 493 m"],
    "2024 annual report, photo caption: Monterey Bay, 493 m, image 2019",
  ),
  source(
    "green-clam-museum",
    "https://journals.australian.museum/media/Uploads/Journals/17093/867_complete.pdf",
    "Australian Museum / Charles Hedley",
    "A revision of the Australian Tridacna (1921)",
    [
      "Tridacna gigas specimens personally collected at Green Island off Cairns",
    ],
    "Records of the Australian Museum 13(4), printed p.170; plate XXVII caption, PDF pp.9 and12; DOI 10.3853/j.0067-1975.13.1921.867; historical occurrence, not current abundance",
  ),
  source(
    "green-biology-local",
    "https://www.gbrbiology.com/reef-education/programs-and-activities/green-island/",
    "GBR Biology / Reef Unlimited",
    "Green Island — Coral Cay Education Field Trip",
    [
      "Local anemonefish and green/hawksbill turtle sightings",
      "Seagrass meadows, coral reef and giant clams",
    ],
    "GBR Biology led guided snorkelling; Coral viewing vessels. Professional field-tour account, not a population survey",
  ),
];

type EntryInput = {
  id: string;
  name: string;
  taxon?: string;
  category?: DiscoveryRecord["category"];
  kind: string;
  color: string;
  facts: string[];
  refs: string[];
  visual?: string[];
  size: [number, number];
  appearance: string;
  behavior: string;
  adjustments?: string[];
};
const make = (v: EntryInput): DiscoveryRecord => ({
  id: v.id,
  commonName: v.name,
  scientificName: v.taxon,
  category: v.category ?? "animal",
  modelKind: v.kind,
  color: v.color,
  childSentences: v.facts.map((text) => ({ text, evidenceIds: v.refs })),
  visualEvidenceIds: v.visual ?? v.refs,
  assetId: v.id,
  narrationAssetId: `narration-${v.id}`,
  habitatPlacements: [],
  realSizeM: v.size,
  appearance: v.appearance,
  behavior: v.behavior,
  visualAdjustments: v.adjustments ?? [
    "Original stylized reconstruction; gentle motion, simplified fine detail and brighter observation lighting.",
  ],
});
export const discoveries: DiscoveryRecord[] = [
  make({
    id: "green-turtle",
    name: "Green turtle",
    taxon: "Chelonia mydas",
    kind: "turtle",
    color: "#79905a",
    facts: [
      "Green turtles paddle with their flippers and come up for air.",
      "Grown-up green turtles often nibble seagrass and algae.",
    ],
    refs: ["green-turtle-noaa"],
    size: [0.8, 1.2],
    appearance:
      "Adult; smooth oval olive-brown carapace with scutes; two long front flippers and two smaller rear flippers; blunt beak.",
    behavior: "Slow front-flipper propulsion; surface for air.",
  }),
  make({
    id: "anemonefish",
    name: "Anemonefish",
    taxon: "Amphiprion spp.",
    kind: "clownfish",
    color: "#ee8d38",
    facts: [
      "Anemonefish live among the waving tentacles of sea anemones.",
      "The anemone gives these small fish a sheltered home.",
    ],
    refs: ["gbr-great8"],
    visual: ["anemonefish-dbca"],
    size: [0.06, 0.12],
    appearance:
      "Adult orange Indo-Pacific anemonefish; deep oval body with white dark-edged bands and rounded tail. Genus label because local source does not identify species.",
    behavior: "Short fin-powered excursions near host.",
    adjustments: [
      "Genus-level interpretation; larger display scale makes bands visible; host represented with the fish asset, not counted as another taxon.",
    ],
  }),
  make({
    id: "giant-clam",
    name: "Giant clam",
    taxon: "Tridacna gigas",
    kind: "clam",
    color: "#527fd1",
    facts: [
      "A giant clam has a heavy shell made of two parts.",
      "It draws in water and filters out tiny food.",
    ],
    refs: ["gbr-great8", "clam-dbca"],
    visual: ["clam-dbca", "natgeo-clam"],
    size: [0.7, 1.4],
    appearance:
      "Adult thick, deeply folded bivalve shell, scalloped exposed mantle and two siphonal openings; no teeth or tongue.",
    behavior: "Sessile, slight mantle movement.",
  }),
  make({
    id: "staghorn-coral",
    name: "Branching reef coral",
    taxon: "Acropora spp. (Indo-Pacific)",
    kind: "coral",
    color: "#dfaa75",
    facts: [
      "These branching corals are colonies of tiny animals called polyps.",
      "Their hard skeletons make places where small reef animals can shelter.",
    ],
    refs: ["green-coral-study", "aims-coral"],
    visual: ["acropora-museum"],
    size: [0.3, 2],
    appearance:
      "Indo-Pacific staghorn growth form; narrow branching colony, many small surface corallites, pale growing tips.",
    behavior: "Attached colony; tiny polyps, no whole-colony waving.",
  }),
  make({
    id: "seagrass",
    name: "Ribbon seagrass",
    taxon: "Halodule uninervis",
    category: "plant",
    kind: "seagrass",
    color: "#6ca747",
    facts: [
      "Seagrass is a flowering plant that grows underwater.",
      "Its green leaves make a meadow around Green Island.",
    ],
    refs: ["seagrass-herbarium", "seagrass-science"],
    visual: ["halodule-visual", "halodule-photo"],
    size: [0.05, 0.3],
    appearance:
      "Narrow ribbon leaves rising in shoots from horizontal buried rhizome; not kelp fronds.",
    behavior: "Leaves flex gently with water.",
  }),
  make({
    id: "buff-banded-rail",
    name: "Buff-banded rail",
    taxon: "Hypotaenidia philippensis",
    kind: "rail",
    color: "#987553",
    facts: [
      "The buff-banded rail is a bird that walks around Green Island.",
      "Look for its pale eyebrow and striped belly.",
    ],
    refs: ["green-rail", "rail-birdlife"],
    visual: ["green-rail"],
    size: [0.25, 0.33],
    appearance:
      "Adult shore/forest-edge bird; chestnut eye band, white eyebrow, buff chest and finely barred underparts; long toes.",
    behavior: "Walks on shore; does not swim in the reef.",
  }),
  make({
    id: "hawksbill-turtle",
    name: "Hawksbill turtle",
    taxon: "Eretmochelys imbricata",
    kind: "turtle",
    color: "#ad7840",
    facts: [
      "Hawksbill turtles live around the reefs of Buck Island.",
      "Look at the pointed beak and the patterned shell as this turtle swims.",
    ],
    refs: ["buck-animals", "buck-front"],
    size: [0.6, 0.9],
    appearance:
      "Adult amber/brown imbricate shell with jagged rear edge, pointed hawklike beak, long fore-flippers.",
    behavior: "Slow flipper swimming, surface breathing.",
  }),
  make({
    id: "blue-tang",
    name: "Atlantic blue tang",
    taxon: "Acanthurus coeruleus",
    kind: "tang",
    color: "#436bbb",
    facts: [
      "Blue tangs swim together over Buck Island’s shallow reef.",
      "They graze on algae growing there.",
    ],
    refs: ["buck-front"],
    size: [0.15, 0.3],
    appearance:
      "Adult deep disk-shaped cobalt-blue body, small mouth, continuous long dorsal/anal fins and pale tail-base spine; no palette-shaped black mark.",
    behavior: "Schooling and grazing close to reef.",
  }),
  make({
    id: "elkhorn-coral",
    name: "Elkhorn coral",
    taxon: "Acropora palmata",
    kind: "elkhorn",
    color: "#c89d51",
    facts: [
      "Elkhorn coral grows broad branches that look a little like antlers.",
      "Its tiny animals build part of Buck Island’s reef.",
    ],
    refs: ["buck-front"],
    size: [1, 3],
    appearance:
      "Broad flattened antler-like golden-brown branches, pale growing margins, firmly attached base.",
    behavior: "Attached living colony.",
  }),
  make({
    id: "sea-fan",
    name: "Sea fan",
    taxon: "Gorgonia spp.",
    kind: "fan",
    color: "#b16aa5",
    facts: [
      "A sea fan is a soft coral, made of many tiny animals.",
      "Water moves through its lacy branches.",
    ],
    refs: ["keys-creatures", "buck-front"],
    size: [0.3, 1.5],
    appearance:
      "Upright flattened purple branching mesh, flexible holdfast; visibly open lattice.",
    behavior: "Gentle current-driven sway.",
  }),
  make({
    id: "spiny-lobster",
    name: "Caribbean spiny lobster",
    taxon: "Panulirus argus",
    kind: "lobster",
    color: "#a96744",
    facts: [
      "Spiny lobsters shelter in little hiding places during the day.",
      "Look for their long antennae reaching out.",
    ],
    refs: ["buck-front", "keys-creatures"],
    size: [0.15, 0.5],
    appearance:
      "Segmented reddish-brown spotted body, five pairs walking legs, very long antennae, no giant front claws.",
    behavior: "Shelters by day, small antenna sweeps.",
  }),
  make({
    id: "brown-pelican",
    name: "Brown pelican",
    taxon: "Pelecanus occidentalis",
    kind: "pelican",
    color: "#8f8980",
    facts: [
      "A brown pelican has a long bill with a stretchy pouch.",
      "Look for its broad wings above the sea.",
    ],
    refs: ["buck-front", "buck-animals"],
    size: [1, 1.4],
    appearance:
      "Adult gray-brown bird with pale head, long straight bill and throat pouch; broad 2 m wingspan.",
    behavior: "Glides and beats wings over surface; not underwater.",
  }),
  make({
    id: "turtle-grass",
    name: "Turtle grass",
    taxon: "Thalassia testudinum",
    category: "plant",
    kind: "seagrass",
    color: "#519351",
    facts: [
      "Turtle grass is a flowering plant with ribbon-shaped leaves.",
      "It makes underwater meadows in the Caribbean.",
    ],
    refs: ["turtle-grass-source", "seagrass-science", "buck-condition-2022"],
    visual: ["turtle-grass-source"],
    size: [0.1, 0.4],
    appearance:
      "Broad strap-shaped leaves in upright shoots from buried rhizomes; rounded tips.",
    behavior: "Current-driven leaf movement.",
  }),
  make({
    id: "blue-striped-grunt",
    name: "Bluestriped grunt",
    taxon: "Haemulon sciurus",
    kind: "grunt",
    color: "#ead367",
    facts: [
      "Bluestriped grunts often gather in groups beside reef ledges.",
      "Their yellow bodies have thin blue stripes.",
    ],
    refs: ["keys-creatures", "grunt-museum"],
    visual: ["grunt-museum"],
    size: [0.18, 0.35],
    appearance:
      "Yellow deep body, narrow curved blue horizontal stripes, dark tail, medium mouth.",
    behavior: "Schooling over structure.",
  }),
  make({
    id: "yellowtail-snapper",
    name: "Yellowtail snapper",
    taxon: "Ocyurus chrysurus",
    kind: "snapper",
    color: "#e4ca57",
    facts: [
      "This fish has a yellow stripe leading to its forked yellow tail.",
      "Yellowtail snappers swim around reefs and other underwater structures.",
    ],
    refs: ["keys-creatures"],
    size: [0.2, 0.5],
    appearance:
      "Streamlined silver body, strong yellow lateral stripe and deeply forked yellow tail; small yellow spots above stripe.",
    behavior: "Schooling above wreck.",
  }),
  make({
    id: "sergeant-major",
    name: "Sergeant major",
    taxon: "Abudefduf saxatilis",
    kind: "sergeant",
    color: "#eee28c",
    facts: [
      "Count the five dark bars across this little fish.",
      "Sergeant majors often swim in groups over shallow reefs.",
    ],
    refs: ["sergeant-major-museum"],
    size: [0.1, 0.23],
    appearance:
      "Adult silver disk-like body, yellow upper back, five broad vertical black bars, forked tail.",
    behavior: "Daytime schooling over structure.",
  }),
  make({
    id: "green-moray",
    name: "Green moray",
    taxon: "Gymnothorax funebris",
    kind: "eel",
    color: "#879249",
    facts: [
      "A green moray has a long body that bends as it swims.",
      "These eels often shelter in holes and crevices in the reef.",
    ],
    refs: ["keys-creatures", "moray-museum"],
    visual: ["keys-creatures"],
    size: [1, 2.2],
    appearance:
      "Long green-yellow eel body, blunt head, continuous dorsal fin, no pectoral fins; mouth subtly ventilates.",
    behavior:
      "Shelters in an open recess; slow undulation with no hunting sequence.",
  }),
  make({
    id: "adelie-penguin",
    name: "Adélie penguin",
    taxon: "Pygoscelis adeliae",
    kind: "penguin",
    color: "#273548",
    facts: [
      "Adélie penguins have little white rings around their eyes.",
      "They use their flippers to swim through Antarctic water.",
    ],
    refs: ["adelie-aap"],
    size: [0.6, 0.75],
    appearance:
      "Adult black head/back, white belly, white eye ring and short dark red bill; no yellow ear patch.",
    behavior: "Flipper-powered swimming.",
  }),
  make({
    id: "emperor-penguin",
    name: "Emperor penguin",
    taxon: "Aptenodytes forsteri",
    kind: "penguin",
    color: "#eecb74",
    facts: [
      "The emperor penguin is the largest kind of penguin.",
      "Its wings are flippers for swimming underwater.",
    ],
    refs: ["emperor-aap"],
    size: [1, 1.2],
    appearance:
      "Adult large black/white penguin with golden-yellow side-neck patches and long dark bill.",
    behavior:
      "Unhurried underwater flipper strokes; visiting adult, no summer breeding colony.",
  }),
  make({
    id: "weddell-seal",
    name: "Weddell seal",
    taxon: "Leptonychotes weddellii",
    kind: "seal",
    color: "#83969e",
    facts: [
      "A Weddell seal swims beneath the ice.",
      "It comes to a crack or opening to breathe air.",
    ],
    refs: ["weddell-aap"],
    size: [2.5, 3],
    appearance:
      "Adult robust body, small rounded head and short muzzle; mottled gray coat with pale underside, hind flippers.",
    behavior: "Glides and visits open water.",
  }),
  make({
    id: "southern-elephant-seal",
    name: "Southern elephant seal",
    taxon: "Mirounga leonina",
    kind: "seal",
    color: "#958170",
    facts: [
      "Southern elephant seals are strong swimmers.",
      "Their smooth, rounded bodies help them travel through the water.",
    ],
    refs: ["elephant-aap"],
    size: [2.4, 3],
    appearance:
      "Adult female; large rounded brown-gray body, short foreflippers, paired hind flippers, modest muzzle without male trunk.",
    behavior: "Slow hind-body propulsion.",
  }),
  make({
    id: "leopard-seal",
    name: "Leopard seal",
    taxon: "Hydrurga leptonyx",
    kind: "seal",
    color: "#98a4a4",
    facts: [
      "A leopard seal has a long body and long front flippers.",
      "Its spotted coat gives this Antarctic swimmer its name.",
    ],
    refs: ["leopard-aap"],
    size: [2.8, 3.5],
    appearance:
      "Solitary adult; elongated reptilian muzzle, slender body, conspicuous long foreflippers and spotted pale underside.",
    behavior: "Calm separate glide; no hunting, close approach or mixed flock.",
  }),
  make({
    id: "snow-petrel",
    name: "Snow petrel",
    taxon: "Pagodroma nivea",
    kind: "petrel",
    color: "#eef3f5",
    facts: [
      "A snow petrel has white feathers and a little black bill.",
      "It flies low above Antarctic water.",
    ],
    refs: ["snow-petrel-aap"],
    size: [0.3, 0.4],
    appearance:
      "Small adult all-white seabird, black eyes and short black bill; pointed wings.",
    behavior: "Low flight above open water.",
  }),
  make({
    id: "antarctic-krill",
    name: "Antarctic krill",
    taxon: "Euphausia superba",
    kind: "krill",
    color: "#e5a8a0",
    facts: [
      "Krill are tiny swimming animals with many little legs.",
      "They can gather together in large groups called swarms.",
    ],
    refs: ["krill-aap"],
    size: [0.03, 0.06],
    appearance:
      "Translucent shrimp-like crustacean, red gut, prominent black eyes, segmented tail fan and multiple swimming legs.",
    behavior: "Coordinated swarming with swimming legs.",
    adjustments: [
      "Individuals enlarged tenfold for visibility; swarm greatly reduced in number.",
    ],
  }),
  make({
    id: "bloody-belly-comb-jelly",
    name: "Bloody-belly comb jelly",
    taxon: "Lampocteis cruentiventer",
    kind: "combjelly",
    color: "#b8385a",
    facts: [
      "This comb jelly moves with rows of tiny beating hairs.",
      "Its belly is a deep red color.",
    ],
    refs: ["mbari-bloody-belly-comb-jelly"],
    size: [0.05, 0.16],
    appearance:
      "Red lobate body with two large rounded oral lobes, eight longitudinal comb rows; no long jellyfish tentacles.",
    behavior: "Slow ciliary gliding, not bell pumping.",
    adjustments: [
      "Fivefold enlargement; reflected comb highlights are observation-light effects, not emitted rainbow bioluminescence.",
    ],
  }),
  make({
    id: "barreleye",
    name: "Barreleye fish",
    taxon: "Macropinna microstoma",
    kind: "barreleye",
    color: "#5a7781",
    facts: [
      "The barreleye has a see-through shield over its head.",
      "Its green eyes sit inside, looking up through that clear shield.",
    ],
    refs: ["mbari-barreleye-fish", "barreleye-aquarium"],
    visual: ["mbari-barreleye-fish"],
    size: [0.1, 0.15],
    appearance:
      "Dark barrel body, translucent head dome, internal paired green tubular eyes; two front dark nares are not eyes; broad pectoral fins.",
    behavior: "Nearly stationary fin-controlled hovering.",
    adjustments: [
      "Fivefold enlargement and softly lit dome; green eyes do not emit light.",
    ],
  }),
  make({
    id: "vampire-squid",
    name: "Vampire squid",
    taxon: "Vampyroteuthis infernalis",
    kind: "vampire",
    color: "#913e42",
    facts: [
      "A vampire squid collects tiny drifting bits of food.",
      "It uses two thin, sticky threads to gather marine snow.",
    ],
    refs: ["mbari-vampire-squid", "vampire-research", "vampire-noaa"],
    visual: ["mbari-vampire-squid"],
    size: [0.15, 0.3],
    appearance:
      "Adult reddish-brown mantle with two fins, eight web-connected arms and two thin feeding filaments.",
    behavior:
      "Gentle fin propulsion, extended feeding filament; no threat display.",
    adjustments: [
      "Threefold enlargement; no constant whole-body glow; defensive light behavior omitted.",
    ],
  }),
  make({
    id: "big-red-jelly",
    name: "Big red jelly",
    taxon: "Tiburonia granrojo",
    kind: "bigjelly",
    color: "#a4494e",
    facts: [
      "The big red jelly has a thick, rounded bell.",
      "Underneath are broad, finger-shaped arms instead of long thin tentacles.",
    ],
    refs: ["mbari-big-red-jelly"],
    size: [0.5, 1],
    appearance:
      "Large deep red dome, thick rim, four to seven broad fleshy oral arms; no trailing thin tentacles.",
    behavior: "Slow rhythmic bell contractions.",
    adjustments: [
      "Slight enlargement and fictional observation light; no self-emission.",
    ],
  }),
  make({
    id: "redhead-larvacean",
    name: "Redhead larvacean",
    taxon: "Mesochordaeus erythrocephalus",
    kind: "larvacean",
    color: "#e3aba1",
    facts: [
      "This little animal makes a see-through house out of mucus.",
      "Its house filters tiny bits of food from the water.",
    ],
    refs: ["mbari-redhead-larvacean"],
    size: [0.02, 0.06],
    appearance:
      "Tiny red gut and translucent trunk with long flat tail inside a delicate roughly 30 cm mucus filter house.",
    behavior: "Tail beats move water through filter house.",
    adjustments: [
      "Animal enlarged tenfold; mucus house enlarged fourfold so its structure can be seen.",
    ],
  }),
  ...[
    [
      "reef-sand",
      "Reef sand",
      "The pale sand makes open paths between patches of reef.",
      "green-island-local",
      "sand",
      "#dfd6b5",
    ],
    [
      "reef-limestone",
      "Reef structure",
      "A reef gives many animals places to live and shelter.",
      "buck-front",
      "rock",
      "#8caaa5",
    ],
    [
      "beach-sand",
      "Beach sand",
      "Buck Island has sandy beaches beside its shallow blue water.",
      "buck-front",
      "sand",
      "#ede1b9",
    ],
    [
      "wreck-bow",
      "Benwood’s bow",
      "This is the front of the old Benwood ship.",
      "benwood-noaa",
      "wreck",
      "#8a7564",
    ],
    [
      "wreck-ribs",
      "Steel supports",
      "These triangular steel supports show where the ship’s sides once stood.",
      "benwood-noaa",
      "ribs",
      "#8a7564",
    ],
    [
      "wreck-sand",
      "Sand beside the wreck",
      "The Benwood rests beside sand and low coral reef in the Florida Keys.",
      "benwood-noaa",
      "sand",
      "#d4c9a7",
    ],
    [
      "sea-ice",
      "Sea ice",
      "Sea ice forms when seawater freezes.",
      "ice-aap",
      "ice",
      "#cde8ee",
    ],
    [
      "antarctic-rock",
      "Antarctic coastal rock",
      "Some of the coast near Casey has bare rock beside the ice.",
      "casey-aap",
      "rock",
      "#71838a",
    ],
    [
      "marine-snow",
      "Marine snow",
      "Marine snow is made of tiny bits drifting down through the ocean.",
      "mbari-redhead-larvacean",
      "snow",
      "#d9e0df",
    ],
    [
      "deep-water",
      "Midwater",
      "Midwater is the open water between the surface and the seafloor.",
      "mbari-local",
      "water",
      "#456785",
    ],
  ].map(([id, name, fact, ref, kind, color]) =>
    make({
      id: id!,
      name: name!,
      category:
        id!.startsWith("wreck-") && id !== "wreck-sand"
          ? "human_made_feature"
          : "geological_feature",
      kind: kind!,
      color: color!,
      facts: [fact!],
      refs: [ref!],
      size: [0.5, 8],
      appearance:
        "Nonliving habitat feature; original stylized geometry guided by site photographs.",
      behavior:
        kind === "snow"
          ? "Slow settling particles."
          : "Stationary habitat structure.",
      adjustments: [
        "Compact artistic interpretation; dimensions and spacing simplified for child navigation.",
      ],
    }),
  ),
];

const byId = new Map(discoveries.map((d) => [d.id, d]));
const standardZones = [
  {
    id: "garden",
    name: "Shallow habitat",
    realDepthM: [1, 12] as [number, number],
    renderY: [-12, -1] as [number, number],
  },
  {
    id: "surface",
    name: "Sea and sky",
    realDepthM: [0, 1] as [number, number],
    renderY: [-1, 4] as [number, number],
  },
];
const entity = (
  discoveryId: string,
  position: Vec3,
  behavior: EntityInstance["behavior"],
  scale = 1,
  zoneId = "garden",
  radius = 0.7,
): EntityInstance => ({
  id: `${discoveryId}-${position[0]}-${position[2]}`,
  discoveryId,
  position,
  behavior,
  scale,
  zoneId,
  radius,
});
const buildHabitat = (
  v: Omit<HabitatDefinition, "allowedDiscoveryIds" | "bounds" | "audio">,
): HabitatDefinition =>
  expandHabitat({
    ...v,
    allowedDiscoveryIds: [...new Set(v.entities.map((e) => e.discoveryId))],
    bounds: { min: [-24, -12, -24], max: [24, 0.5, 24] },
    audio: v.theme,
  });
const starts = (
  wildlife = "Wildlife lookout",
  surface = "Sea and sky",
  surfacePosition: Vec3 = [0, 0, 12],
): HabitatDefinition["spawns"] => [
  {
    id: "easy",
    name: "A gentle beginning",
    description: "Meet a nearby neighbour.",
    position: [0, -4, 6],
    heading: 0,
    zoneId: "garden",
  },
  {
    id: "wildlife",
    name: wildlife,
    description: "Start beside a wildlife gathering.",
    position: [8, -6, -4],
    heading: 0,
    zoneId: "garden",
  },
  {
    id: "surface",
    name: surface,
    description: "Look above the water.",
    position: surfacePosition,
    heading: 0,
    zoneId: "surface",
  },
];
export const habitats: HabitatDefinition[] = [
  buildHabitat({
    id: "australia",
    name: "Australian coast",
    subtitle: "Great Barrier Reef",
    location: "Green Island / Wunyami, offshore Cairns, Queensland",
    season: "Austral summer; daytime artistic composite",
    theme: "reef",
    color: "#2a9da0",
    accent: "#f6ca7f",
    description: "Sunlit coral gardens, waving seagrass and a sandy island.",
    evidenceIds: [
      "green-island-local",
      "green-coral-study",
      "seagrass-herbarium",
      "green-rail",
      "green-clam-museum",
      "green-biology-local",
    ],
    spatialSimplifications: [
      "Green Island reef-flat, seagrass and shore connected in an artistic exploration area; not a survey model.",
      "Broad genus labels used where site sources do not justify species identification.",
      "No present-day coral-cover claim; historical local records guide habitat.",
    ],
    depthZones: standardZones,
    surfaceRoute: [
      [0, -2, 12],
      [0, 0, 12],
    ],
    spawns: starts("Seagrass meadow", "Island shallows"),
    landmarks: [
      {
        id: "coral-garden",
        name: "Coral garden",
        position: [-8, -8, -5],
        kind: "coral",
      },
      {
        id: "seagrass-meadow",
        name: "Seagrass meadow",
        position: [8, -9, -8],
        kind: "seagrass",
      },
      {
        id: "island-shore",
        name: "Island shore",
        position: [0, 0, 16],
        kind: "beach",
      },
    ],
    activities: [
      {
        id: "reef-turtle",
        text: "Watch a turtle swim",
        targetIds: ["green-turtle"],
        kind: "watch",
      },
      {
        id: "reef-waves",
        text: "Find something that waves",
        targetIds: ["seagrass"],
        kind: "discover",
      },
      {
        id: "reef-sky",
        text: "Look above the water",
        targetIds: ["buff-banded-rail"],
        kind: "surface",
      },
    ],
    entities: [
      entity("green-turtle", [2.2, -3.7, 1.5], "surface", 1.5),
      entity("anemonefish", [-5, -6, -3], "school", 6),
      entity("giant-clam", [8, -7, -8], "still", 1.5),
      entity("staghorn-coral", [-8, -9, -7], "still", 1.2),
      entity("seagrass", [7, -9, -8], "sway", 3),
      entity("buff-banded-rail", [6, 0.72, 11], "still", 2, "surface"),
      entity("reef-sand", [-2, -10, -2], "still", 1),
      entity("reef-limestone", [-12, -10, -10], "still", 1),
    ],
    lighting: { water: "#379eae", fog: 0.024, exposure: 1.2 },
  }),
  buildHabitat({
    id: "caribbean",
    name: "Caribbean",
    subtitle: "Buck Island · St Croix",
    location:
      "Buck Island Reef National Monument, St Croix, U.S. Virgin Islands",
    season: "June–August; daytime",
    theme: "caribbean",
    color: "#289eac",
    accent: "#f0b976",
    description:
      "Golden elkhorn branches and blue fish beside a bright sandy beach.",
    evidenceIds: [
      "buck-front",
      "buck-animals",
      "buck-monitoring",
      "buck-condition-2022",
    ],
    spatialSimplifications: [
      "East lagoon, West Beach and southern seagrass beds connected over a short fictional distance.",
      "Reef form reflects documented habitat, not a claim of current coral abundance.",
    ],
    depthZones: standardZones,
    surfaceRoute: [
      [0, -2, 12],
      [0, 0, 12],
    ],
    spawns: starts("Elkhorn garden", "West Beach view"),
    landmarks: [
      {
        id: "elkhorn-garden",
        name: "Elkhorn garden",
        position: [8, -8, -8],
        kind: "elkhorn",
      },
      {
        id: "fan-path",
        name: "Sea fan path",
        position: [-8, -9, -5],
        kind: "fan",
      },
      {
        id: "west-beach",
        name: "West Beach",
        position: [0, 0, 16],
        kind: "beach",
      },
    ],
    activities: [
      {
        id: "carib-blue",
        text: "Find the blue fish",
        targetIds: ["blue-tang"],
        kind: "discover",
      },
      {
        id: "carib-fan",
        text: "Watch a sea fan sway",
        targetIds: ["sea-fan"],
        kind: "watch",
      },
      {
        id: "carib-bird",
        text: "Look for a pelican",
        targetIds: ["brown-pelican"],
        kind: "surface",
      },
    ],
    entities: [
      entity("blue-tang", [2.2, -3.7, 1.5], "school", 4),
      entity("hawksbill-turtle", [-6, -5, -3], "surface", 1.5),
      entity("elkhorn-coral", [8, -8, -8], "still", 1),
      entity("sea-fan", [-8, -8, -6], "sway", 1.5),
      entity("spiny-lobster", [4, -9, -2], "still", 3),
      entity("brown-pelican", [-4, 1.7, 8], "fly", 1, "surface"),
      entity("turtle-grass", [11, -10, 3], "sway", 2),
      entity("beach-sand", [0, -1, 14], "still", 1, "surface"),
      entity("reef-limestone", [-12, -10, -12], "still"),
    ],
    lighting: { water: "#258eae", fog: 0.022, exposure: 1.15 },
  }),
  buildHabitat({
    id: "antarctica",
    name: "Antarctica",
    subtitle: "Casey · Coastal ice",
    location: "Windmill Islands and O’Brien Bay, Casey coast, East Antarctica",
    season: "January–February, austral summer",
    theme: "ice",
    color: "#6091ac",
    accent: "#deeff4",
    description: "Swim below blue ice, then visit a bright opening to the sky.",
    evidenceIds: ["casey-aap", "adelie-aap", "snow-petrel-casey"],
    spatialSimplifications: [
      "Several Windmill Islands encounters compressed into one bay.",
      "Visiting emperor penguin; no winter breeding colony in the summer scene.",
      "Animals shown separately with no feeding or hunting encounter.",
      "Surface route uses the open-water lead at x=14, z=10; never through ice.",
    ],
    depthZones: standardZones,
    surfaceRoute: [
      [14, -4, 10],
      [14, -1, 10],
      [14, 0, 10],
    ],
    spawns: starts("Seal lookout", "Open-water lead", [14, 0, 10]),
    landmarks: [
      {
        id: "ice-roof",
        name: "Blue ice ceiling",
        position: [-7, -1, -7],
        kind: "ice",
      },
      {
        id: "rock-garden",
        name: "Rocky seafloor",
        position: [8, -10, -9],
        kind: "rock",
      },
      {
        id: "open-lead",
        name: "Open-water lead",
        position: [14, 0, 10],
        kind: "opening",
      },
    ],
    activities: [
      {
        id: "ice-flippers",
        text: "Watch a penguin swim",
        targetIds: ["adelie-penguin"],
        kind: "watch",
      },
      {
        id: "ice-krill",
        text: "Find the tiny krill",
        targetIds: ["antarctic-krill"],
        kind: "discover",
      },
      {
        id: "ice-sky",
        text: "Visit the opening in the ice",
        targetIds: ["snow-petrel"],
        kind: "surface",
      },
    ],
    entities: [
      entity("adelie-penguin", [2.2, -3.7, 1.5], "glide", 1.3),
      entity("weddell-seal", [8, -6, -8], "glide", 1, "garden", 1.2),
      entity("emperor-penguin", [-7, -7, -9], "glide", 1),
      entity("southern-elephant-seal", [-12, -6, 4], "glide", 1, "garden", 1.2),
      entity("leopard-seal", [17, -8, -12], "glide", 1, "garden", 1.3),
      entity("snow-petrel", [17.5, 2.2, 7], "fly", 2, "surface"),
      entity("antarctic-krill", [4, -5, -3], "school", 10),
      entity("sea-ice", [-6, -1, -6], "still", 1),
      entity("antarctic-rock", [8, -10, -11], "still"),
    ],
    lighting: { water: "#50849b", fog: 0.026, exposure: 1.05 },
  }),
  buildHabitat({
    id: "shipwreck",
    name: "The Benwood",
    subtitle: "Florida Keys · Shipwreck",
    location: "Between French Reef and Dixie Shoals, Florida Keys, Florida",
    season: "July; daytime",
    theme: "wreck",
    color: "#417f89",
    accent: "#e0ad6b",
    description: "Follow fish past the open remains of a real old ship.",
    evidenceIds: [
      "benwood-noaa",
      "benwood-growth",
      "benwood-observation",
      "benwood-fish-local",
      "benwood-grunts",
    ],
    spatialSimplifications: [
      "2017 survey-guided bow and triangular steel knees, compressed from ~110 m ship to compact exterior.",
      "No intact pirate vessel or interior rooms; open exterior paths only.",
      "Bluestriped grunt photograph and local dive observers support the wreck roster; morphology checked against museum and NOAA references.",
      "Shallow rendered coordinates compress documented 7.6–13.7 m site depths; metadata retains actual range.",
    ],
    depthZones: [
      {
        id: "garden",
        name: "Wreck exterior",
        realDepthM: [7.6, 13.7],
        renderY: [-12, -1],
      },
      standardZones[1]!,
    ],
    surfaceRoute: [
      [0, -2, 12],
      [0, 0, 12],
    ],
    spawns: starts("Bow lookout", "Open sea"),
    landmarks: [
      {
        id: "bow-landmark",
        name: "The broken bow",
        position: [8, -9, -8],
        kind: "wreck",
      },
      {
        id: "steel-knees",
        name: "Steel supports",
        position: [-7, -10, -6],
        kind: "ribs",
      },
      {
        id: "sand-margin",
        name: "Sandy margin",
        position: [-12, -11, 6],
        kind: "sand",
      },
    ],
    activities: [
      {
        id: "wreck-school",
        text: "Watch fish swim together",
        targetIds: ["blue-striped-grunt", "yellowtail-snapper"],
        kind: "watch",
      },
      {
        id: "wreck-bow-activity",
        text: "Find the front of the ship",
        targetIds: ["wreck-bow"],
        kind: "discover",
      },
      {
        id: "wreck-lobster",
        text: "Look for long antennae",
        targetIds: ["spiny-lobster"],
        kind: "discover",
      },
    ],
    entities: [
      entity("blue-striped-grunt", [2.2, -3.7, 1.5], "school", 4),
      entity("yellowtail-snapper", [7, -6, -7], "school", 3),
      entity("sergeant-major", [-6, -5, -3], "school", 4),
      entity("green-moray", [-10, -9, -9], "still", 1),
      entity("spiny-lobster", [4, -9, -2], "still", 3),
      entity("sea-fan", [11, -9, -10], "sway", 1.5),
      entity("brown-pelican", [-4, 1.7, 8], "fly", 1, "surface"),
      entity("wreck-bow", [8, -10, -14], "still", 2.3, "garden", 4.6),
      entity("wreck-ribs", [-7, -10, -12], "still", 2.3, "garden", 3.5),
      entity("wreck-sand", [-10, -11, 5], "still"),
    ],
    lighting: { water: "#3d808c", fog: 0.026, exposure: 1.05 },
  }),
  buildHabitat({
    id: "deepsea",
    name: "Deep sea",
    subtitle: "Monterey Bay · Midwater",
    location: "Monterey Bay and adjacent central California deep midwater",
    season: "Year-round composite; daylight at surface",
    theme: "deep",
    color: "#253955",
    accent: "#dda4b6",
    description:
      "Meet delicate drifters in the quiet water far below the waves.",
    evidenceIds: [
      "mbari-local",
      "mbari-local-comb",
      "mbari-redhead-larvacean",
      "monterey-pelican",
    ],
    spatialSimplifications: [
      "Rendered Y is a compressed travel coordinate, not literal depth: -4 ≈500 m; -6 ≈700 m; -10 ≈1200 m.",
      "A short cancelable ascent crosses depth zones to local surface. Deep animals remain in their zones.",
      "Elise’s fictional observation light reveals color; it is not sunlight or animal bioluminescence.",
      "No seafloor represented in the midwater volume. Surface coast is a distant view.",
    ],
    depthZones: [
      {
        id: "garden",
        name: "Twilight drift · about 500 m",
        realDepthM: [250, 600],
        renderY: [-5, -2],
      },
      {
        id: "oxygen-zone",
        name: "Quiet twilight · about 700 m",
        realDepthM: [600, 900],
        renderY: [-8, -5],
      },
      {
        id: "midnight",
        name: "Midnight drift · about 1200 m",
        realDepthM: [1000, 1500],
        renderY: [-12, -8],
      },
      standardZones[1]!,
    ],
    surfaceRoute: [
      [0, -2, 12],
      [0, 0, 12],
    ],
    spawns: [
      {
        id: "easy",
        name: "Gentle twilight",
        description: "Meet a nearby comb jelly.",
        position: [0, -4, 6],
        heading: 0,
        zoneId: "garden",
      },
      {
        id: "wildlife",
        name: "The quiet twilight",
        description: "Meet a hovering barreleye.",
        position: [8, -6, -4],
        heading: 0,
        zoneId: "oxygen-zone",
      },
      {
        id: "midnight",
        name: "Midnight drifters",
        description: "Visit a big red jelly.",
        position: [-8, -10, -4],
        heading: 0,
        zoneId: "midnight",
      },
    ],
    landmarks: [
      {
        id: "twilight-drift",
        name: "Twilight drift",
        position: [0, -4, 0],
        kind: "midwater",
      },
      {
        id: "quiet-twilight",
        name: "Quiet twilight",
        position: [8, -6, -8],
        kind: "midwater",
      },
      {
        id: "midnight-drift",
        name: "Midnight drift",
        position: [-8, -10, -8],
        kind: "midwater",
      },
    ],
    activities: [
      {
        id: "deep-combs",
        text: "Find a comb jelly",
        targetIds: ["bloody-belly-comb-jelly"],
        kind: "discover",
      },
      {
        id: "deep-pulse",
        text: "Watch a jelly pulse",
        targetIds: ["big-red-jelly"],
        kind: "watch",
      },
      {
        id: "deep-surface",
        text: "Visit the sea and sky",
        targetIds: ["brown-pelican"],
        kind: "surface",
      },
    ],
    entities: [
      entity("bloody-belly-comb-jelly", [2.2, -3.7, 1.5], "glide", 5, "garden"),
      entity("redhead-larvacean", [-6, -4, -4], "sway", 6, "garden"),
      entity("barreleye", [8, -6, -8], "still", 5, "oxygen-zone"),
      entity("vampire-squid", [3, -7, -11], "glide", 3, "oxygen-zone"),
      entity("big-red-jelly", [-8, -10, -8], "pulse", 1.7, "midnight", 1),
      entity("brown-pelican", [-4, 1.7, 8], "fly", 1, "surface"),
      entity("marine-snow", [-3, -4, -7], "still", 1, "garden"),
      entity("deep-water", [5, -7, 2], "still", 1, "oxygen-zone"),
    ],
    lighting: { water: "#071728", fog: 0.04, exposure: 0.85 },
  }),
];

// Placement records derive from explicit scene memberships, never a global species range.
for (const habitat of habitats) {
  for (const id of habitat.allowedDiscoveryIds) {
    const d = byId.get(id)!;
    const zones = [
      ...new Set(
        habitat.entities
          .filter((e) => e.discoveryId === id)
          .map((e) => e.zoneId),
      ),
    ];
    const ranges = habitat.depthZones
      .filter((z) => zones.includes(z.id))
      .map((z) => z.realDepthM);
    d.habitatPlacements.push({
      habitatId: habitat.id,
      zoneIds: zones,
      evidenceIds: [
        ...new Set([
          ...habitat.evidenceIds,
          ...d.childSentences.flatMap((s) => s.evidenceIds),
        ]),
      ],
      realDepthM: [
        Math.min(...ranges.map((r) => r[0])),
        Math.max(...ranges.map((r) => r[1])),
      ],
      season: habitat.season,
    });
    const instances = habitat.entities.filter(
      (e) => e.discoveryId === id && e.scale !== 1,
    );
    if (instances.length)
      d.visualAdjustments.push(
        `${habitat.id}: foreground display scale ${[...new Set(instances.map((e) => e.scale))].join(", ")}×; not a life-size comparison.`,
      );
  }
}

// Encounter depths, not full geographic species ranges. Light is fictional observation light.
const deepEncounterDepth: Record<string, number> = {
  "bloody-belly-comb-jelly": 500,
  "redhead-larvacean": 500,
  barreleye: 700,
  "vampire-squid": 700,
  "big-red-jelly": 1200,
};
for (const d of discoveries) {
  const depth = deepEncounterDepth[d.id];
  if (depth !== undefined) {
    const p = d.habitatPlacements.find((p) => p.habitatId === "deepsea")!;
    p.realDepthM = [depth, depth];
  }
}
byId.get("sea-ice")!.visualEvidenceIds = ["casey-aap"];
byId.get("deep-water")!.visualEvidenceIds = ["mbari-bloody-belly-comb-jelly"];
byId.get("reef-sand")!.visualEvidenceIds = ["buck-front"]; // Generic pale sediment reference, not local occurrence.
