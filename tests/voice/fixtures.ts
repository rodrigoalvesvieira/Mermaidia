import type { VoiceCommand } from "../../src/shared/contracts";
export const targets = [
  { id: "turtle-1", name: "green turtle" },
  { id: "jelly-1", name: "moon jellyfish" },
];
type Fixture = { text: string; commands: VoiceCommand[] | null };
const group = (texts: string[], commands: VoiceCommand[] | null): Fixture[] =>
  texts.map((text) => ({ text, commands }));
export const fixtures: Fixture[] = [
  ...group(
    [
      "swim forward",
      "go ahead",
      "let's go",
      "please swim forward",
      "Could you swim ahead?",
      "Elise, go forward.",
      "swim",
      "move forward",
      "keep swimming",
    ],
    [{ type: "swim" }],
  ),
  ...group(
    [
      "stop",
      "wait",
      "stay here",
      "hold still",
      "stop moving",
      "please stop",
      "stop swimming",
      "turn right and stop",
      "go forward then wait",
    ],
    [{ type: "stop" }],
  ),
  ...group(
    ["turn right", "please turn to the right", "could you turn right"],
    [{ type: "turn", degrees: 30 }],
  ),
  ...group(
    ["turn left", "rotate left", "face the left"],
    [{ type: "turn", degrees: -30 }],
  ),
  ...group(
    ["turn around", "turn back", "face the other way"],
    [{ type: "turn", degrees: 180 }],
  ),
  ...group(
    ["go right", "move to the right", "swim right"],
    [{ type: "lateral", direction: 1 }],
  ),
  ...group(
    ["go left", "move to the left", "swim left"],
    [{ type: "lateral", direction: -1 }],
  ),
  ...group(
    ["go up", "a little higher", "higher", "swim up"],
    [{ type: "vertical", direction: 1 }],
  ),
  ...group(
    ["go down", "a little lower", "lower", "move down"],
    [{ type: "vertical", direction: -1 }],
  ),
  ...group(
    [
      "go to the surface",
      "swim to the top",
      "take me to the surface",
      "surface",
    ],
    [{ type: "surface" }],
  ),
  ...group(["dive", "go underwater", "dive down"], [{ type: "dive" }]),
  ...group(["go faster", "speed up", "faster"], [{ type: "speed", delta: 1 }]),
  ...group(
    ["slower", "slow down", "swim slower"],
    [{ type: "speed", delta: -1 }],
  ),
  ...group(
    ["what is that", "tell me about this", "what's that?"],
    [{ type: "inspect" }],
  ),
  ...group(
    ["take me back", "go to the start", "return to the start"],
    [{ type: "return" }],
  ),
  ...group(["pause", "pause the game"], [{ type: "pause" }]),
  ...group(["resume", "keep playing"], [{ type: "resume" }]),
  ...group(["close", "close this"], [{ type: "close" }]),
  ...group(["open my journal", "show my journal"], [{ type: "journal" }]),
  ...group(["help", "help me"], [{ type: "help" }]),
  ...group(["go to that turtle", "look at the jellyfish"], null).map(
    (f, i) => ({
      ...f,
      commands: [
        { type: "approach", targetId: i ? "jelly-1" : "turtle-1" },
      ] as VoiceCommand[],
    }),
  ),
  {
    text: "turn right and go forward",
    commands: [{ type: "turn", degrees: 30 }, { type: "swim" }],
  },
  ...group(
    [
      "don't turn right",
      "do not swim",
      "never go left",
      "no turn around",
      "I cannot go forward",
      "go left and right",
      "swim forward and go down",
      "",
      "   ",
      "[noise]",
      "my favorite color is blue",
      "where does my mom live",
      "tell me a scary story",
      "the bus stop is outside",
      "go to that whale",
      "look at the fish",
      "please do not stop",
    ],
    [],
  ),
  ...group(["I would like to head a little toward the right"], null),
  // Clear everyday requests must not wait for another model round trip.
  ...group(
    [
      "can we swim forward",
      "I want to go forward",
      "go straight ahead",
      "let's go",
      "swim straight",
      "okay Elise could you go ahead please",
    ],
    [{ type: "swim" }],
  ),
  ...group(
    [
      "can we go faster",
      "I would like to go a bit faster",
      "a bit faster",
      "please go faster now",
    ],
    [{ type: "speed", delta: 1 }],
  ),
  ...group(
    ["can you go a little slower for me", "a bit slower"],
    [{ type: "speed", delta: -1 }],
  ),
  ...group(
    [
      "can we go to the surface",
      "I want to swim to the top",
      "let's go to the surface",
    ],
    [{ type: "surface" }],
  ),
  ...group(
    ["take me up", "swim upwards"],
    [{ type: "vertical", direction: 1 }],
  ),
  ...group(
    ["take me down", "go downwards"],
    [{ type: "vertical", direction: -1 }],
  ),
  ...group(["okay stop now", "can we stop please"], [{ type: "stop" }]),
  ...group(
    [
      "I don't want to go faster",
      "can we not swim forward",
      "please don't go straight",
      "go straight and down",
      "I would like to not go up",
    ],
    [],
  ),
];
