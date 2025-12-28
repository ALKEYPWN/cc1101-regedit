/**
 * CC1101 TypeScript Type Definitions
 */

export interface RegisterField {
  name: string;
  bits: number[];
  description: string;
  options?: Record<number, string>;
}

export interface Register {
  name: string;
  description: string;
  default: number;
  fields: RegisterField[];
  flipperExport?: boolean; // If false, exclude from Flipper custom preset export (defaults to true)
}

export type RegisterMap = Record<number, Register>;

export type RegisterGroups = Record<string, number[]>;

export interface PresetConfig {
  frequency: number;
  modulation: number;
  dataRate: number;
  bandwidth: number;
  deviation: number;
  preamble: number;
  syncMode: number;
  registers: Record<number, number>;
  paTable: number[];
}

export type PresetMap = Record<string, PresetConfig>;

export type PATableMap = Record<string, Record<string, number[]>>;

export interface ModulationFormat {
  name: string;
  description: string;
}

export type ModulationMap = Record<number, ModulationFormat>;

export type ExportFormat = 'flipper_setting' | 'c_array' | 'raw_hex';

export interface RegisterState {
  registers: Record<number, number>;
  paTable: number[];
  currentGroup: string;
}
