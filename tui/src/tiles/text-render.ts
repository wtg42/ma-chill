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

function displayWidth(s: string): number {
  let width = 0;
  for (const char of s) {
    const cp = char.codePointAt(0) ?? 0;
    // CJK Unified Ideographs, CJK Compatibility, Hangul, fullwidth forms, etc.
    if (
      (cp >= 0x1100 && cp <= 0x115f) ||
      (cp >= 0x2e80 && cp <= 0x303e) ||
      (cp >= 0x3041 && cp <= 0x33ff) ||
      (cp >= 0x3400 && cp <= 0x4dbf) ||
      (cp >= 0x4e00 && cp <= 0xa4cf) ||
      (cp >= 0xa960 && cp <= 0xa97f) ||
      (cp >= 0xac00 && cp <= 0xd7ff) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe10 && cp <= 0xfe1f) ||
      (cp >= 0xfe30 && cp <= 0xfe6f) ||
      (cp >= 0xff01 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6) ||
      (cp >= 0x1b000 && cp <= 0x1b0ff) ||
      (cp >= 0x1f004 && cp <= 0x1f0cf) ||
      (cp >= 0x1f200 && cp <= 0x1f2ff) ||
      (cp >= 0x20000 && cp <= 0x2fffd) ||
      (cp >= 0x30000 && cp <= 0x3fffd)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

function centerToFive(input: string): string {
  // Truncate to fit within 5 display columns
  let value = "";
  let usedWidth = 0;
  for (const char of input) {
    const cw = displayWidth(char);
    if (usedWidth + cw > 5) break;
    value += char;
    usedWidth += cw;
  }
  const remaining = 5 - usedWidth;
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
