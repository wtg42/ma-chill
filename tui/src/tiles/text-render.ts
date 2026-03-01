import type { CanonicalTile } from "./types";
import { toTextRenderKey } from "./display";

export type TileTemplateStatus = "ready" | "placeholder";

export interface TileTextTemplate {
  key: string;
  top: string;
  bottom: string;
  status: TileTemplateStatus;
}

export interface TileTextRenderBinding {
  text_key: string;
  template: TileTextTemplate;
  ascii: string;
}

const PLACEHOLDER_TEMPLATE: TileTextTemplate = {
  key: "placeholder.unimplemented",
  top: "",
  bottom: "",
  status: "placeholder",
};

export function resolveTileTextTemplateByKey(textKey: string): TileTextTemplate {
  const sections = textKey.split(".");

  if (sections[0] === "suited") {
    const suit = sections[1];
    const rank = Number(sections[2]);
    if (!Number.isInteger(rank) || rank < 1 || rank > 9 || !suit) {
      throw new Error(`Invalid suited text key: ${textKey}`);
    }

    return {
      key: textKey,
      top: String(rank),
      bottom: suitToGlyph(suit),
      status: "ready",
    };
  }

  if (sections[0] === "honor" && sections[1] === "wind" && sections[2]) {
    return {
      key: textKey,
      top: windToZh(sections[2]),
      bottom: "",
      status: "ready",
    };
  }

  if (sections[0] === "honor" && sections[1] === "dragon" && sections[2]) {
    return {
      key: textKey,
      top: dragonToZh(sections[2]),
      bottom: "",
      status: "ready",
    };
  }

  if (sections[0] === "bonus" && sections[1] && sections[2]) {
    return {
      ...PLACEHOLDER_TEMPLATE,
      key: textKey,
    };
  }

  throw new Error(`Unsupported text key: ${textKey}`);
}

export function toTileTextRenderBinding(tile: CanonicalTile): TileTextRenderBinding {
  const textKey = toTextRenderKey(tile);
  const template = resolveTileTextTemplateByKey(textKey);

  return {
    text_key: textKey,
    template,
    ascii: renderTileTextTemplate(template),
  };
}

export function renderTileTextTemplate(template: TileTextTemplate): string {
  const top = centerToFive(template.top);
  const bottom = centerToFive(template.bottom);
  return `┌─────┐\n│${top}│\n│${bottom}│\n└─────┘`;
}

function centerToFive(input: string): string {
  const value = input.slice(0, 5);
  const remaining = 5 - value.length;
  const leftPad = Math.floor(remaining / 2);
  const rightPad = remaining - leftPad;
  return `${" ".repeat(leftPad)}${value}${" ".repeat(rightPad)}`;
}

function suitToGlyph(suit: string): string {
  if (suit === "circles") {
    return "●";
  }
  if (suit === "bamboos") {
    return "█";
  }
  if (suit === "characters") {
    return "萬";
  }
  throw new Error(`Unsupported suited suit for text template: ${suit}`);
}

function windToZh(wind: string): string {
  if (wind === "east") {
    return "東";
  }
  if (wind === "south") {
    return "南";
  }
  if (wind === "west") {
    return "西";
  }
  if (wind === "north") {
    return "北";
  }
  throw new Error(`Unsupported wind for text template: ${wind}`);
}

function dragonToZh(dragon: string): string {
  if (dragon === "red") {
    return "中";
  }
  if (dragon === "green") {
    return "發";
  }
  if (dragon === "white") {
    return "";
  }
  throw new Error(`Unsupported dragon for text template: ${dragon}`);
}
