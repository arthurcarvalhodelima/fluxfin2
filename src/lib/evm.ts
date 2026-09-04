export function calculateCPI(EV: number, AC: number): number {
  if (AC === 0 || AC < 0 || EV < 0) return 0;
  return Math.round((EV / AC) * 100) / 100;
}

export function calculateSPI(EV: number, PV: number): number {
  if (PV === 0 || PV < 0 || EV < 0) return 0;
  return Math.round((EV / PV) * 100) / 100;
}

export function calculateEAC(BAC: number, CPI: number): number {
  if (BAC < 0) return 0;
  if (CPI === 0) return Infinity;
  return Math.round((BAC / CPI) * 100) / 100;
}

export function calculateETC(
  BAC: number,
  EV: number,
  CPI: number
): number {
  if (BAC < 0 || EV < 0) return 0;
  if (CPI === 0) return Infinity;
  return Math.round(((BAC - EV) / CPI) * 100) / 100;
}

export function calculateVAC(BAC: number, EAC: number): number {
  if (BAC < 0) return 0;
  if (!isFinite(EAC)) return -Infinity;
  return Math.round((BAC - EAC) * 100) / 100;
}

export function calculateTCPI(
  BAC: number,
  EV: number,
  AC: number
): number {
  if (BAC < 0 || EV < 0 || AC < 0) return 0;
  const remainingWork = BAC - EV;
  const remainingBudget = BAC - AC;
  if (remainingBudget === 0) return Infinity;
  return Math.round((remainingWork / remainingBudget) * 100) / 100;
}
