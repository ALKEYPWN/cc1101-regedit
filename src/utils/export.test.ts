import { describe, it, expect } from 'vitest';
import {
  generateFlipperPresetData,
  generateFlipperSettingUser,
  generateCArray,
  generateRawHex,
  parseFlipperPresetData,
  parseRawHex,
} from '../utils/export';

describe('Export Utilities', () => {
  const sampleRegisters: Record<number, number> = {
    0x00: 0x2E,
    0x01: 0x2E,
    0x02: 0x06,
  };
  const samplePaTable = [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

  describe('generateFlipperPresetData', () => {
    it('generates valid hex string with register pairs', () => {
      const result = generateFlipperPresetData(sampleRegisters, samplePaTable);
      
      // Should contain register address-value pairs
      expect(result).toContain('02 06');
    });

    it('includes terminator bytes', () => {
      const result = generateFlipperPresetData(sampleRegisters, samplePaTable);
      
      // Should have 00 00 terminator before PA table
      expect(result).toContain('00 00');
    });

    it('includes PA table', () => {
      const result = generateFlipperPresetData(sampleRegisters, samplePaTable);
      
      // Should end with PA table bytes
      expect(result).toContain('C0 00 00 00 00 00 00 00');
    });
  });

  describe('generateFlipperSettingUser', () => {
    it('generates valid setting_user format', () => {
      const result = generateFlipperSettingUser('TestPreset', sampleRegisters, samplePaTable);
      
      expect(result).toContain('Custom_preset_name: TestPreset');
      expect(result).toContain('Custom_preset_module: CC1101');
      expect(result).toContain('Custom_preset_data:');
    });
  });

  describe('generateCArray', () => {
    it('generates valid C array with register names', () => {
      const result = generateCArray('TestPreset', sampleRegisters, samplePaTable);
      
      expect(result).toContain('static const uint8_t TestPreset_registers[]');
      expect(result).toContain('static const uint8_t TestPreset_pa_table[]');
      expect(result).toContain('0xC0'); // PA table value
    });

    it('sanitizes preset name for C identifier', () => {
      const result = generateCArray('Test-Preset.v1', sampleRegisters, samplePaTable);
      
      expect(result).toContain('Test_Preset_v1_registers');
    });

    it('includes register comments', () => {
      const result = generateCArray('Test', sampleRegisters, samplePaTable);
      
      // Should have register name comments
      expect(result).toContain('IOCFG2');
    });
  });

  describe('generateRawHex', () => {
    it('generates space-separated hex values', () => {
      const result = generateRawHex(sampleRegisters);
      
      expect(result).toContain('2E');
      expect(result.split(' ').every(b => /^[0-9A-F]{2}$/i.test(b))).toBe(true);
    });
  });

  describe('parseFlipperPresetData', () => {
    it('parses register pairs correctly', () => {
      const data = '00 2E 01 2E 02 06 00 00 C0 00 00 00 00 00 00 00';
      const { registers } = parseFlipperPresetData(data);
      
      expect(registers[0x00]).toBe(0x2E);
      expect(registers[0x01]).toBe(0x2E);
      expect(registers[0x02]).toBe(0x06);
    });

    it('extracts PA table correctly', () => {
      const data = '00 2E 00 00 C0 00 00 00 00 00 00 00';
      const { paTable } = parseFlipperPresetData(data);
      
      expect(paTable).toHaveLength(8);
      expect(paTable[0]).toBe(0xC0);
    });

    it('handles Custom_preset_data prefix', () => {
      const data = 'Custom_preset_data: 00 2E 00 00 C0 00 00 00 00 00 00 00';
      const { registers } = parseFlipperPresetData(data);
      
      expect(registers[0x00]).toBe(0x2E);
    });
  });

  describe('parseRawHex', () => {
    it('parses sequential hex values as register map', () => {
      const data = '2E 2E 06 07 D3';
      const registers = parseRawHex(data);
      
      expect(registers[0]).toBe(0x2E);
      expect(registers[1]).toBe(0x2E);
      expect(registers[2]).toBe(0x06);
      expect(registers[3]).toBe(0x07);
      expect(registers[4]).toBe(0xD3);
    });
  });
});
