/**
 * CC1101 Calculation Utilities
 */

import { XOSC_FREQ, PA_TABLES } from '../data/registers';
import type { Register } from '../types/cc1101';

/**
 * Calculate FREQ registers from MHz
 * Formula: FREQ = (f_carrier × 2^16) / f_XOSC
 */
export function frequencyToRegisters(freqMHz: number): { FREQ2: number; FREQ1: number; FREQ0: number } {
  const freq = Math.round((freqMHz * 1000000 * 65536) / XOSC_FREQ);
  return {
    FREQ2: (freq >> 16) & 0x3F,
    FREQ1: (freq >> 8) & 0xFF,
    FREQ0: freq & 0xFF
  };
}

/**
 * Calculate MHz from FREQ registers
 */
export function registersToFrequency(freq2: number, freq1: number, freq0: number): number {
  const freq = ((freq2 & 0x3F) << 16) | (freq1 << 8) | freq0;
  return (freq * XOSC_FREQ) / (65536 * 1000000);
}

/**
 * Calculate data rate registers from kbps
 */
export function dataRateToRegisters(dataRateKbps: number): { DRATE_E: number; DRATE_M: number } {
  const dataRate = dataRateKbps * 1000;
  let bestE = 0, bestM = 0;
  let bestError = Infinity;

  for (let e = 0; e < 16; e++) {
    const m = Math.round(((dataRate * Math.pow(2, 28)) / (XOSC_FREQ * Math.pow(2, e))) - 256);
    if (m >= 0 && m < 256) {
      const actualRate = ((256 + m) * Math.pow(2, e) / Math.pow(2, 28)) * XOSC_FREQ;
      const error = Math.abs(actualRate - dataRate);
      if (error < bestError) {
        bestError = error;
        bestE = e;
        bestM = m;
      }
    }
  }

  return { DRATE_E: bestE, DRATE_M: bestM };
}

/**
 * Calculate kbps from MDMCFG registers
 */
export function registersToDataRate(mdmcfg4: number, mdmcfg3: number): number {
  const drateE = mdmcfg4 & 0x0F;
  const drateM = mdmcfg3;
  const dataRate = ((256 + drateM) * Math.pow(2, drateE) / Math.pow(2, 28)) * XOSC_FREQ;
  return dataRate / 1000;
}

/**
 * Get bandwidth settings from kHz
 */
export function bandwidthToRegisters(bwKHz: number): { CHANBW_E: number; CHANBW_M: number } {
  const bandwidths = [
    { bw: 812, e: 0, m: 0 }, { bw: 650, e: 0, m: 1 }, { bw: 541, e: 0, m: 2 }, { bw: 464, e: 0, m: 3 },
    { bw: 406, e: 1, m: 0 }, { bw: 325, e: 1, m: 1 }, { bw: 270, e: 1, m: 2 }, { bw: 232, e: 1, m: 3 },
    { bw: 203, e: 2, m: 0 }, { bw: 162, e: 2, m: 1 }, { bw: 135, e: 2, m: 2 }, { bw: 116, e: 2, m: 3 },
    { bw: 102, e: 3, m: 0 }, { bw: 81, e: 3, m: 1 }, { bw: 68, e: 3, m: 2 }, { bw: 58, e: 3, m: 3 }
  ];

  const match = bandwidths.find(b => b.bw === bwKHz) || bandwidths[6];
  return { CHANBW_E: match.e, CHANBW_M: match.m };
}

/**
 * Calculate bandwidth kHz from MDMCFG4 register
 * BW = f_XOSC / (8 × (4 + CHANBW_M) × 2^CHANBW_E)
 */
export function getBandwidthFromRegister(mdmcfg4: number): number {
  const chanbwE = (mdmcfg4 >> 6) & 0x03;
  const chanbwM = (mdmcfg4 >> 4) & 0x03;
  const bw = XOSC_FREQ / (8 * (4 + chanbwM) * Math.pow(2, chanbwE));
  return Math.round(bw / 1000); // Return kHz
}

/**
 * Calculate deviation register from kHz
 */
export function deviationToRegister(devKHz: number): number {
  const deviation = devKHz * 1000;
  let bestE = 0, bestM = 0;
  let bestError = Infinity;

  for (let e = 0; e < 8; e++) {
    for (let m = 0; m < 8; m++) {
      const actualDev = (XOSC_FREQ / Math.pow(2, 17)) * (8 + m) * Math.pow(2, e);
      const error = Math.abs(actualDev - deviation);
      if (error < bestError) {
        bestError = error;
        bestE = e;
        bestM = m;
      }
    }
  }

  return (bestE << 4) | bestM;
}

/**
 * Calculate kHz from DEVIATN register
 */
export function registerToDeviation(deviatn: number): number {
  const devE = (deviatn >> 4) & 0x07;
  const devM = deviatn & 0x07;
  const deviation = (XOSC_FREQ / Math.pow(2, 17)) * (8 + devM) * Math.pow(2, devE);
  return deviation / 1000;
}

/**
 * Get PA table for frequency, power, and modulation
 * For FSK/GFSK/MSK: Only PA[0] is used
 * For ASK/OOK: PA[0] = off power (0x00), PA[1] = on power
 */
export function getPaTable(freqMHz: number, powerDbm: number, isASK: boolean = false): number[] {
  let band = '433MHz';
  if (freqMHz < 350) band = '315MHz';
  else if (freqMHz < 500) band = '433MHz';
  else if (freqMHz < 900) band = '868MHz';
  else band = '915MHz';

  const table = PA_TABLES[band];
  const powers = Object.keys(table).map(p => parseInt(p));
  const closest = powers.reduce((prev, curr) =>
    Math.abs(curr - powerDbm) < Math.abs(prev - powerDbm) ? curr : prev
  );
  const closestStr = closest >= 0 ? `+${closest}dBm` : `${closest}dBm`;

  const basePaValue = table[closestStr]?.[0] || table['+10dBm']?.[0] || 0xC0;
  
  if (isASK) {
    // ASK/OOK: PA[0] = 0x00 (off), PA[1] = power (on)
    // FREND0.PA_POWER should be set to 1 to use PA[1]
    return [0x00, basePaValue, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
  } else {
    // FSK/GFSK/MSK: Only PA[0] is used
    // FREND0.PA_POWER should be set to 0 to use PA[0]
    return [basePaValue, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
  }
}

/**
 * Get valid bit indices for a register
 */
export function getValidBits(reg: Register): Set<number> {
  const validBits = new Set<number>();
  if (reg && reg.fields) {
    for (const field of reg.fields) {
      for (const bit of field.bits) {
        validBits.add(bit);
      }
    }
  }
  return validBits;
}

/**
 * Get field name for a specific bit
 */
export function getFieldNameForBit(reg: Register, bitIndex: number): string | null {
  if (reg && reg.fields) {
    for (const field of reg.fields) {
      if (field.bits.includes(bitIndex)) {
        return field.name;
      }
    }
  }
  return null;
}

/**
 * Extract field value from register value
 */
export function extractFieldValue(regValue: number, bits: number[]): number {
  if (bits.length === 1) {
    return (regValue >> bits[0]) & 1;
  }
  const highBit = Math.max(...bits);
  const lowBit = Math.min(...bits);
  const mask = (1 << (highBit - lowBit + 1)) - 1;
  return (regValue >> lowBit) & mask;
}

/**
 * Format byte as hex string
 */
export function toHex(value: number, padLength = 2): string {
  return value.toString(16).toUpperCase().padStart(padLength, '0');
}

// ========================================
// RF Parameter Validation & Calculations
// ========================================

export interface RfValidation {
  modulationIndex: number;
  suggestedBandwidth: number;
  warnings: RfWarning[];
  isValid: boolean;
}

export interface RfWarning {
  type: 'error' | 'warning' | 'info';
  message: string;
  field: 'bandwidth' | 'deviation' | 'dataRate' | 'general';
}

/**
 * Calculate modulation index for FSK
 * h = 2 × Δf / R where Δf is deviation (kHz) and R is data rate (kbps)
 */
export function calculateModulationIndex(deviationKHz: number, dataRateKbps: number): number {
  if (dataRateKbps <= 0) return 0;
  return (2 * deviationKHz) / dataRateKbps;
}

/**
 * Calculate suggested bandwidth using Carson's rule
 * BW ≈ 2 × (Δf + R/2) where Δf is deviation and R is data rate
 */
export function calculateSuggestedBandwidth(deviationKHz: number, dataRateKbps: number): number {
  // Carson's rule: BW = 2(Δf + fm), where fm ≈ dataRate/2 for digital signals
  return 2 * (deviationKHz + dataRateKbps / 2);
}

/**
 * Validate RF parameters and return warnings
 */
export function validateRfParameters(
  bandwidthKHz: number,
  deviationKHz: number,
  dataRateKbps: number,
  modulation: number // 0=2FSK, 1=GFSK, 3=ASK, 4=4FSK, 7=MSK
): RfValidation {
  const warnings: RfWarning[] = [];
  const isASK = modulation === 3;
  
  // For ASK, deviation is not relevant
  if (isASK) {
    const suggestedBw = dataRateKbps * 2; // Basic rule for ASK
    
    if (bandwidthKHz < suggestedBw) {
      warnings.push({
        type: 'warning',
        message: `Bandwidth may be too narrow for ${dataRateKbps} kbps ASK. Suggested: ${suggestedBw.toFixed(0)} kHz`,
        field: 'bandwidth'
      });
    }
    
    return {
      modulationIndex: 0,
      suggestedBandwidth: suggestedBw,
      warnings,
      isValid: warnings.filter(w => w.type === 'error').length === 0
    };
  }
  
  // FSK modulation calculations
  const modulationIndex = calculateModulationIndex(deviationKHz, dataRateKbps);
  const suggestedBandwidth = calculateSuggestedBandwidth(deviationKHz, dataRateKbps);
  
  // Check modulation index
  if (modulationIndex < 0.3) {
    warnings.push({
      type: 'warning',
      message: `Modulation index (${modulationIndex.toFixed(2)}) is very low. Signal may be hard to detect. Consider increasing deviation.`,
      field: 'deviation'
    });
  } else if (modulationIndex < 0.5) {
    warnings.push({
      type: 'info',
      message: `Modulation index: ${modulationIndex.toFixed(2)} (low but usable)`,
      field: 'general'
    });
  } else if (modulationIndex > 2) {
    warnings.push({
      type: 'info',
      message: `Modulation index: ${modulationIndex.toFixed(2)} (wideband FM)`,
      field: 'general'
    });
  }
  
  // Check if bandwidth can contain the signal
  // For 4-FSK: uses ±Δf and ±3Δf, so needs 6× deviation minimum
  // For 2-FSK/GFSK/MSK: uses ±Δf, so needs 2× deviation minimum
  const is4FSK = modulation === 4;
  const minBandwidth = is4FSK ? 6 * deviationKHz : 2 * deviationKHz;
  
  if (bandwidthKHz < minBandwidth) {
    warnings.push({
      type: 'error',
      message: is4FSK 
        ? `4-FSK: Bandwidth (${bandwidthKHz} kHz) is less than 6× deviation (${minBandwidth.toFixed(0)} kHz). Outer tones will be clipped!`
        : `Bandwidth (${bandwidthKHz} kHz) is less than 2× deviation (${minBandwidth.toFixed(0)} kHz). Sidebands will be clipped!`,
      field: 'bandwidth'
    });
  }
  
  // Calculate suggested bandwidth using Carson's rule
  // For 4-FSK: BW ≈ 2 × (3Δf + R/2) since outer tones are at ±3Δf
  const suggested4FSKBw = 2 * (3 * deviationKHz + dataRateKbps / 2);
  const effectiveSuggestedBw = is4FSK ? suggested4FSKBw : suggestedBandwidth;
  
  // Check if bandwidth is sufficient per Carson's rule
  if (bandwidthKHz < effectiveSuggestedBw * 0.8) {
    warnings.push({
      type: 'warning',
      message: is4FSK
        ? `4-FSK bandwidth may be too narrow. Suggested: ~${effectiveSuggestedBw.toFixed(0)} kHz`
        : `Bandwidth may be too narrow. Carson's rule suggests ~${effectiveSuggestedBw.toFixed(0)} kHz`,
      field: 'bandwidth'
    });
  } else if (bandwidthKHz > effectiveSuggestedBw * 3) {
    warnings.push({
      type: 'info',
      message: `Bandwidth is wider than needed. May pick up more noise.`,
      field: 'bandwidth'
    });
  }
  
  // For 4-FSK, modulation index requirements are different
  if (is4FSK && modulationIndex < 0.8) {
    warnings.push({
      type: 'warning',
      message: `4-FSK typically needs modulation index ≥ 0.8 for reliable detection. Current: ${modulationIndex.toFixed(2)}`,
      field: 'deviation'
    });
  }
  
  return {
    modulationIndex,
    suggestedBandwidth,
    warnings,
    isValid: warnings.filter(w => w.type === 'error').length === 0
  };
}
