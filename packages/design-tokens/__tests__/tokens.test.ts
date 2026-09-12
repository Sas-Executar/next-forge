import { describe, expect, it } from "vitest";
import { azure, green, neutral } from "../src/primitives";
import { radius } from "../src/radius";
import { dark } from "../src/themes/dark";
import { light } from "../src/themes/light";
import { fontFamily } from "../src/typography";

const HEX_COLOR = /^#[0-9a-f]{6}$/;

describe("primitives", () => {
  it("each ramp has all 12 steps", () => {
    for (const ramp of [green, azure, neutral]) {
      for (let step = 1; step <= 12; step++) {
        expect(ramp[step as keyof typeof ramp]).toMatch(HEX_COLOR);
      }
    }
  });
});

describe("radius", () => {
  it("matches the Blueprint's canonical 4/8/12/16px scale", () => {
    expect(radius.sm).toBe(4);
    expect(radius.md).toBe(8);
    expect(radius.lg).toBe(12);
    expect(radius.xl).toBe(16);
  });
});

describe("typography", () => {
  it("declares IBM Plex, not Geist", () => {
    expect(fontFamily.sans).toBe("IBM Plex Sans");
    expect(fontFamily.mono).toBe("IBM Plex Mono");
  });
});

describe("themes", () => {
  it("light and dark both resolve every semantic token to a real color", () => {
    for (const theme of [light, dark]) {
      const flatValues = [
        theme.color.background,
        theme.color.surface,
        theme.color.text.primary,
        theme.color.text.secondary,
        theme.color.action.primary,
        theme.color.action.secondary,
        theme.color.status.success,
        theme.color.status.warning,
        theme.color.status.error,
        theme.color.border,
        theme.color.focus,
      ];
      for (const value of flatValues) {
        expect(value).toMatch(HEX_COLOR);
      }
    }
  });

  it("light and dark use different backgrounds", () => {
    expect(light.color.background).not.toBe(dark.color.background);
  });
});
