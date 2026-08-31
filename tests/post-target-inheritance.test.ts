// docs/08 #4: PostTarget.caption null herda o baseCaption; setar valor
// específico sobrepõe; passar null volta a herdar.

import { describe, expect, it } from "vitest";
import { captionEfetiva } from "@/server/services/queries";

describe("PostTarget.caption herda o baseCaption", () => {
  it("null herda", () => {
    expect(captionEfetiva("texto base", null)).toBe("texto base");
    expect(captionEfetiva("texto base", undefined)).toBe("texto base");
  });
  it("string vazia é considerada versão específica (vazia)", () => {
    expect(captionEfetiva("texto base", "")).toBe("");
  });
  it("valor sobrepõe", () => {
    expect(captionEfetiva("texto base", "só para Instagram")).toBe("só para Instagram");
  });
});
