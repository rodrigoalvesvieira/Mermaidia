import { useRef, type CSSProperties } from "react";
import { habitats } from "../../content/catalog";
import type { HabitatDefinition } from "../shared/contracts";
import { MenuElise } from "./MenuElise";
import "./GameMenu.css";

type Props = {
  view: "map" | "starts";
  habitat: HabitatDefinition;
  spawnId: string;
  journalCount: number;
  canContinue: boolean;
  reducedMotion?: boolean;
  onDestination: (id: string) => void;
  onSpawn: (id: string) => void;
  onMap: () => void;
  onStart: () => void;
  onContinue: () => void;
  onJournal: () => void;
  onSettings: () => void;
};
const scenes: Record<string, { name: string; animal: string }> = {
  australia: { name: "Coral reef", animal: "green-turtle" },
  caribbean: { name: "Tropical sea", animal: "blue-tang" },
  antarctica: { name: "Ice world", animal: "emperor-penguin" },
  shipwreck: { name: "Shipwreck", animal: "yellowtail-snapper" },
  deepsea: { name: "Deep sea", animal: "big-red-jelly" },
};
function Icon({
  kind,
}: {
  kind: "play" | "book" | "gear" | "back" | "fish" | "sun" | "coral";
}) {
  const paths = {
    play: "M9 5 20 12 9 19Z",
    book: "M12 6C8 3 4 4 3 5v14c3-2 6-2 9 0 3-2 6-2 9 0V5c-3-2-6-1-9 1Zm0 0v13",
    gear: "m9 3-1 3-3 1-2 3 2 2-1 3 3 2 2-1 3 2 3-2 2 1 3-2-1-3 2-2-2-3-3-1-1-3Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    back: "M8 4 3 9l5 5M3 9h10a6 6 0 1 1 0 12",
    fish: "M3 12C7 4 14 4 18 9l4-3v12l-4-3C14 20 7 20 3 12Zm5-2h.01",
    sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2",
    coral: "M12 22V3m0 10L5 9V4m7 13 7-6V6M5 9 2 7m17 4 3-2M12 7l4-3",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={kind === "play" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[kind]} />
    </svg>
  );
}
export function GameMenu(p: Props) {
  const index = Math.max(
    0,
    habitats.findIndex((h) => h.id === p.habitat.id),
  );
  const pointer = useRef<number | null>(null);
  const swipedAt = useRef(0);
  const move = (direction: number) =>
    p.onDestination(
      habitats[(index + direction + habitats.length) % habitats.length].id,
    );
  return (
    <div className="game-menu">
      <div className="menu-keyart" aria-hidden="true" />
      <div className="menu-shade" aria-hidden="true" />
      <header className="menu-topline">
        <h1>
          Mermaidia<span aria-hidden="true">✧</span>
        </h1>
        <nav className="menu-tools" aria-label="Your game">
          {p.canContinue && (
            <button
              onClick={p.onContinue}
              aria-label="Continue our last swim"
              title="Continue"
            >
              <Icon kind="back" />
            </button>
          )}
          <button
            onClick={p.onJournal}
            aria-label={`Your discovery journal ${p.journalCount}`}
            title="Discovery journal"
          >
            <Icon kind="book" />
          </button>
          <button
            onClick={p.onSettings}
            aria-label="Grown-up settings"
            title="Grown-up settings"
          >
            <Icon kind="gear" />
          </button>
        </nav>
      </header>
      <div className="menu-adventure">
        <MenuElise reducedMotion={p.reducedMotion} />
        <section
          className="scene-picker"
          aria-label="Choose your ocean"
          aria-roledescription="carousel"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              move(e.key === "ArrowRight" ? 1 : -1);
            }
          }}
        >
          <div
            className="scene-carousel"
            onPointerDown={(e) => {
              pointer.current = e.clientX;
            }}
            onPointerUp={(e) => {
              if (
                pointer.current !== null &&
                Math.abs(e.clientX - pointer.current) > 45
              ) {
                move(e.clientX < pointer.current ? 1 : -1);
                swipedAt.current = Date.now();
              }
              pointer.current = null;
            }}
            onPointerCancel={() => {
              pointer.current = null;
            }}
            onClickCapture={(e) => {
              if (Date.now() - swipedAt.current < 350) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            {habitats.map((h, i) => {
              let offset = (i - index + habitats.length) % habitats.length;
              if (offset > 2) offset -= habitats.length;
              const scene = scenes[h.id];
              return (
                <button
                  key={h.id}
                  className={`destination scene-card ${offset === 0 ? "active" : ""}`}
                  style={
                    {
                      "--offset": offset,
                      "--distance": Math.abs(offset),
                      zIndex: 3 - Math.abs(offset),
                    } as CSSProperties
                  }
                  tabIndex={Math.abs(offset) > 1 ? -1 : 0}
                  aria-hidden={Math.abs(offset) > 1 || undefined}
                  aria-label={`Choose ${h.name} · ${h.subtitle}`}
                  aria-current={offset === 0 ? "true" : undefined}
                  onClick={() => p.onDestination(h.id)}
                >
                  <img
                    className="scene-picture"
                    src={`/assets/menu/scenes/${h.id}.jpg`}
                    alt=""
                    draggable="false"
                  />
                  <div className="scene-card-shade" />
                  <img
                    className="scene-animal"
                    src={`/assets/portraits/${scene.animal}.png`}
                    alt=""
                    draggable="false"
                  />
                  <h2>{scene.name}</h2>
                </button>
              );
            })}
            <button
              className="carousel-arrow previous"
              onClick={() => move(-1)}
              aria-label="Previous ocean"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              className="carousel-arrow next"
              onClick={() => move(1)}
              aria-label="Next ocean"
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
          <div className="carousel-dots" aria-label="Ocean choices">
            {habitats.map((h, i) => (
              <button
                key={h.id}
                className={index === i ? "selected" : ""}
                aria-label={h.name}
                aria-pressed={index === i}
                onClick={() => p.onDestination(h.id)}
              >
                <span />
              </button>
            ))}
          </div>
          <div className="scene-starts" aria-label="Choose your starting spot">
            {p.habitat.spawns.map((spawn, i) => (
              <button
                key={spawn.id}
                className={`start-card ${p.spawnId === spawn.id ? "selected" : ""}`}
                onClick={() => p.onSpawn(spawn.id)}
                aria-label={spawn.name}
                aria-pressed={p.spawnId === spawn.id}
                title={spawn.name}
              >
                <Icon kind={(["coral", "fish", "sun"] as const)[i]} />
                <span>
                  {p.habitat.id === "deepsea"
                    ? ["Twilight", "Friends", "Midnight"][i]
                    : ["Explore", "Friends", "Surface"][i]}
                </span>
              </button>
            ))}
          </div>
          <button
            className="menu-play"
            onClick={p.onStart}
            aria-label={`Start swimming · ${p.habitat.name}`}
          >
            <Icon kind="play" />
            <span>Play</span>
          </button>
          <span className="menu-sr-only" aria-live="polite">
            {p.habitat.name}, ocean {index + 1} of {habitats.length}
          </span>
        </section>
      </div>
    </div>
  );
}
