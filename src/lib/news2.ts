export type News2Severity = "low" | "medium" | "high";

export function getNews2Severity(score: number): News2Severity {
  if (score === 0) return "low";
  if (score <= 4) return "medium";
  return "high";
}

export function getNews2Color(score: number): string {
  const severity = getNews2Severity(score);
  if (severity === "low") return "#22C55E";
  if (severity === "medium") return "#F59E0B";
  return "#E8403A";
}

export interface VitalsForNews2 {
  respiratoryRate?: number;
  spO2?: number;
  systolicBP?: number;
  heartRate?: number;
  temperature?: number;
  consciousnessAlert?: boolean;
}

export function calculateNews2Score(vitals: VitalsForNews2): number {
  let score = 0;

  if (vitals.respiratoryRate !== undefined) {
    const rr = vitals.respiratoryRate;
    if (rr <= 8) score += 3;
    else if (rr <= 11) score += 1;
    else if (rr <= 20) score += 0;
    else if (rr <= 24) score += 2;
    else score += 3;
  }

  if (vitals.spO2 !== undefined) {
    const spo2 = vitals.spO2;
    if (spo2 <= 91) score += 3;
    else if (spo2 <= 93) score += 2;
    else if (spo2 <= 95) score += 1;
  }

  if (vitals.systolicBP !== undefined) {
    const sbp = vitals.systolicBP;
    if (sbp <= 90) score += 3;
    else if (sbp <= 100) score += 2;
    else if (sbp <= 110) score += 1;
    else if (sbp > 219) score += 3;
  }

  if (vitals.heartRate !== undefined) {
    const hr = vitals.heartRate;
    if (hr <= 40) score += 3;
    else if (hr <= 50) score += 1;
    else if (hr <= 90) score += 0;
    else if (hr <= 110) score += 1;
    else if (hr <= 130) score += 2;
    else score += 3;
  }

  if (vitals.temperature !== undefined) {
    const t = vitals.temperature;
    if (t <= 35.0) score += 3;
    else if (t <= 36.0) score += 1;
    else if (t <= 38.0) score += 0;
    else if (t <= 39.0) score += 1;
    else score += 2;
  }

  if (vitals.consciousnessAlert === false) score += 3;

  return score;
}
