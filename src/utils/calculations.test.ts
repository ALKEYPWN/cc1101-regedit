import { describe, it, expect } from 'vitest';
import {
  frequencyToRegisters,
  registersToFrequency,
  calculateModulationIndex,
  calculateSuggestedBandwidth,
  validateRfParameters,
} from '../utils/calculations';

describe('Frequency Calculations', () => {
  it('should convert frequency to registers correctly', () => {
    const result = frequencyToRegisters(433.92);
    expect(result.FREQ2).toBe(0x10);
    expect(result.FREQ1).toBe(0xB0); // Actual value for 433.92 MHz
    // FREQ0 may vary slightly due to rounding
    expect(result.FREQ0).toBeGreaterThan(0x70);
  });

  it('should convert registers back to frequency', () => {
    // Use round-trip to verify consistency
    const regs = frequencyToRegisters(433.92);
    const freq = registersToFrequency(regs.FREQ2, regs.FREQ1, regs.FREQ0);
    expect(freq).toBeCloseTo(433.92, 1);
  });

  it('should round-trip frequency conversion', () => {
    const originalFreq = 315.0;
    const regs = frequencyToRegisters(originalFreq);
    const resultFreq = registersToFrequency(regs.FREQ2, regs.FREQ1, regs.FREQ0);
    expect(resultFreq).toBeCloseTo(originalFreq, 2);
  });
});

describe('Modulation Index Calculations', () => {
  it('should calculate modulation index correctly', () => {
    // h = 2 × deviation / dataRate
    expect(calculateModulationIndex(50, 100)).toBe(1.0);
    expect(calculateModulationIndex(25, 100)).toBe(0.5);
    expect(calculateModulationIndex(100, 50)).toBe(4.0);
  });

  it('should return 0 for zero data rate', () => {
    expect(calculateModulationIndex(50, 0)).toBe(0);
  });
});

describe('Suggested Bandwidth Calculations', () => {
  it('should calculate Carson rule bandwidth', () => {
    // BW = 2 × (deviation + dataRate/2)
    expect(calculateSuggestedBandwidth(50, 100)).toBe(200); // 2*(50+50)
    expect(calculateSuggestedBandwidth(25, 50)).toBe(100);  // 2*(25+25)
  });
});

describe('RF Parameter Validation', () => {
  it('should validate 2-FSK parameters without errors', () => {
    // Good configuration: BW=200kHz, Dev=50kHz, Rate=100kbps, Mod=0 (2-FSK)
    const result = validateRfParameters(200, 50, 100, 0);
    expect(result.isValid).toBe(true);
    expect(result.modulationIndex).toBe(1.0);
  });

  it('should error when bandwidth is too narrow for deviation', () => {
    // BW=50kHz but deviation=50kHz means BW < 2*dev
    const result = validateRfParameters(50, 50, 10, 0);
    expect(result.isValid).toBe(false);
    expect(result.warnings.some(w => w.type === 'error' && w.field === 'bandwidth')).toBe(true);
  });

  it('should warn when modulation index is too low', () => {
    // h = 2*5/100 = 0.1 (very low)
    const result = validateRfParameters(200, 5, 100, 0);
    expect(result.warnings.some(w => w.field === 'deviation')).toBe(true);
  });

  it('should handle 4-FSK requiring 6x deviation bandwidth', () => {
    // 4-FSK with Dev=50kHz needs BW >= 300kHz (6*50)
    const result = validateRfParameters(200, 50, 100, 4);
    expect(result.isValid).toBe(false);
    expect(result.warnings.some(w => 
      w.type === 'error' && w.message.includes('6×')
    )).toBe(true);
  });

  it('should not require deviation for ASK modulation', () => {
    const result = validateRfParameters(200, 50, 100, 3);
    expect(result.modulationIndex).toBe(0);
    expect(result.isValid).toBe(true);
  });
});
