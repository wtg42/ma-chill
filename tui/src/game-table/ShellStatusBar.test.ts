import { describe, expect, it } from "bun:test";
import { formatScoreLine } from "./ShellStatusBar";

describe("formatScoreLine", () => {
  it("用冒號後空格顯示零分，並讓玩家編號貼近名稱", () => {
    expect(formatScoreLine([0, 0, 0, 0])).toBe("你: 0 / 玩家2: 0 / 玩家3: 0 / 玩家4: 0");
  });

  it("保留負分符號且維持分數欄位辨識度", () => {
    expect(formatScoreLine([12, -3, 0, 8])).toBe("你: 12 / 玩家2: -3 / 玩家3: 0 / 玩家4: 8");
  });
});
