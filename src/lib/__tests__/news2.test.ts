import { describe, it, expect } from "vitest";
import { getNews2Severity, getNews2Color, calculateNews2Score } from "../news2";

describe("getNews2Severity", () => {
  it("returns low for score 0", () => {
    expect(getNews2Severity(0)).toBe("low");
  });
  it("returns medium for scores 1-4", () => {
    expect(getNews2Severity(1)).toBe("medium");
    expect(getNews2Severity(4)).toBe("medium");
  });
  it("returns high for score 5+", () => {
    expect(getNews2Severity(5)).toBe("high");
    expect(getNews2Severity(9)).toBe("high");
  });
});

describe("getNews2Color", () => {
  it("returns green for low", () => {
    expect(getNews2Color(0)).toBe("#22C55E");
  });
  it("returns amber for medium", () => {
    expect(getNews2Color(3)).toBe("#F59E0B");
  });
  it("returns red for high", () => {
    expect(getNews2Color(6)).toBe("#E8403A");
  });
});

describe("calculateNews2Score", () => {
  it("scores 0 for normal vitals", () => {
    expect(
      calculateNews2Score({
        respiratoryRate: 16,
        spO2: 98,
        systolicBP: 120,
        heartRate: 72,
        temperature: 37.0,
        consciousnessAlert: true,
      })
    ).toBe(0);
  });
  it("adds 3 for unconscious patient", () => {
    expect(calculateNews2Score({ consciousnessAlert: false })).toBe(3);
  });
  it("adds 3 for very low SpO2", () => {
    expect(calculateNews2Score({ spO2: 90 })).toBe(3);
  });
});
