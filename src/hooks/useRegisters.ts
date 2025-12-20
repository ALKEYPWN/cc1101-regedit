/**
 * Register State Management Hook
 */

import { useState, useCallback, useMemo } from 'react';
import { CC1101_REGISTERS, PRESETS } from '../data/registers';
import {
  frequencyToRegisters,
  registersToFrequency,
  dataRateToRegisters,
  registersToDataRate,
  bandwidthToRegisters,
  getBandwidthFromRegister,
  deviationToRegister,
  registerToDeviation,
  getPaTable,
  validateRfParameters
} from '../utils/calculations';
import type { RfValidation } from '../utils/calculations';

export interface RegisterActions {
  setRegister: (addr: number, value: number) => void;
  toggleBit: (addr: number, bit: number) => void;
  setFrequency: (freqMHz: number) => void;
  setModulation: (modFormat: number) => void;
  setDataRate: (dataRateKbps: number) => void;
  setBandwidth: (bwKHz: number) => void;
  setDeviation: (devKHz: number) => void;
  setTxPower: (powerDbm: number) => void;
  setPaTableByte: (index: number, value: number) => void;
  loadPreset: (presetName: string) => void;
  reset: () => void;
}

export interface DerivedValues {
  frequency: number;
  modulation: number;
  dataRate: number;
  bandwidth: number;
  deviation: number;
  rfValidation: RfValidation;
}

function initializeRegisters(): Record<number, number> {
  const registers: Record<number, number> = {};
  for (const [addr, reg] of Object.entries(CC1101_REGISTERS)) {
    registers[Number(addr)] = reg.default;
  }
  return registers;
}

const DEFAULT_PA_TABLE = [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

export function useRegisters() {
  const [registers, setRegisters] = useState<Record<number, number>>(initializeRegisters);
  const [paTable, setPaTable] = useState<number[]>(DEFAULT_PA_TABLE);
  const [currentGroup, setCurrentGroup] = useState<string>('GPIO & FIFO');

  // Derived values computed from registers
  const derived = useMemo<DerivedValues>(() => {
    const freq = registersToFrequency(
      registers[0x0D] ?? 0x10,
      registers[0x0E] ?? 0xB0,
      registers[0x0F] ?? 0x71
    );
    const mdmcfg2 = registers[0x12] ?? 0;
    const mod = (mdmcfg2 >> 4) & 0x07;
    const mdmcfg4 = registers[0x10] ?? 0xCA;
    const dr = registersToDataRate(mdmcfg4, registers[0x11] ?? 0x83);
    const bw = getBandwidthFromRegister(mdmcfg4);
    const dev = registerToDeviation(registers[0x15] ?? 0x35);
    
    // Validate RF parameters
    const rfValidation = validateRfParameters(bw, dev, dr, mod);

    return {
      frequency: freq,
      modulation: mod,
      dataRate: dr,
      bandwidth: bw,
      deviation: dev,
      rfValidation
    };
  }, [registers]);

  const setRegister = useCallback((addr: number, value: number) => {
    setRegisters(prev => ({ ...prev, [addr]: value & 0xFF }));
  }, []);

  const toggleBit = useCallback((addr: number, bit: number) => {
    setRegisters(prev => {
      const currentValue = prev[addr] ?? 0;
      const newValue = currentValue ^ (1 << bit);
      return { ...prev, [addr]: newValue };
    });
  }, []);

  const setFrequency = useCallback((freqMHz: number) => {
    const { FREQ2, FREQ1, FREQ0 } = frequencyToRegisters(freqMHz);
    setRegisters(prev => ({
      ...prev,
      0x0D: FREQ2,
      0x0E: FREQ1,
      0x0F: FREQ0
    }));
    // Update PA table for new frequency
    // Check if current modulation is ASK
    const modulation = ((registers[0x12] ?? 0) >> 4) & 0x07;
    const isASK = modulation === 3;
    setPaTable(getPaTable(freqMHz, 10, isASK)); // Default to +10dBm
  }, [registers]);

  const setModulation = useCallback((modFormat: number) => {
    setRegisters(prev => {
      const mdmcfg2 = prev[0x12] ?? 0;
      const newValue = (mdmcfg2 & 0x8F) | (modFormat << 4);
      return { ...prev, 0x12: newValue };
    });
    // Update PA table for new modulation (ASK uses different PA table format)
    const freq = registersToFrequency(
      registers[0x0D] ?? 0x10,
      registers[0x0E] ?? 0xB0,
      registers[0x0F] ?? 0x71
    );
    const isASK = modFormat === 3;
    setPaTable(getPaTable(freq, 10, isASK));
    
    // Also update FREND0.PA_POWER to point to correct PA table entry
    // ASK needs PA_POWER=1 (to use PA[1]), FSK needs PA_POWER=0 (to use PA[0])
    setRegisters(prev => {
      const frend0 = prev[0x22] ?? 0x10;
      const newFrend0 = isASK ? (frend0 & 0xF8) | 0x01 : (frend0 & 0xF8);
      return { ...prev, 0x22: newFrend0 };
    });
  }, [registers]);

  const setDataRate = useCallback((dataRateKbps: number) => {
    const { DRATE_E, DRATE_M } = dataRateToRegisters(dataRateKbps);
    setRegisters(prev => {
      const mdmcfg4 = prev[0x10] ?? 0;
      const newMdmcfg4 = (mdmcfg4 & 0xF0) | (DRATE_E & 0x0F);
      return { ...prev, 0x10: newMdmcfg4, 0x11: DRATE_M };
    });
  }, []);

  const setBandwidth = useCallback((bwKHz: number) => {
    const { CHANBW_E, CHANBW_M } = bandwidthToRegisters(bwKHz);
    setRegisters(prev => {
      const mdmcfg4 = prev[0x10] ?? 0;
      const newMdmcfg4 = (mdmcfg4 & 0x0F) | (CHANBW_E << 6) | (CHANBW_M << 4);
      return { ...prev, 0x10: newMdmcfg4 };
    });
  }, []);

  const setDeviation = useCallback((devKHz: number) => {
    const deviatn = deviationToRegister(devKHz);
    setRegisters(prev => ({ ...prev, 0x15: deviatn }));
  }, []);

  const setTxPower = useCallback((powerDbm: number) => {
    const freq = registersToFrequency(
      registers[0x0D] ?? 0x10,
      registers[0x0E] ?? 0xB0,
      registers[0x0F] ?? 0x71
    );
    const modulation = ((registers[0x12] ?? 0) >> 4) & 0x07;
    const isASK = modulation === 3;
    setPaTable(getPaTable(freq, powerDbm, isASK));
  }, [registers]);

  const loadPreset = useCallback((presetName: string) => {
    const preset = PRESETS[presetName];
    if (preset) {
      setRegisters(prev => ({ ...prev, ...preset.registers }));
      setPaTable([...preset.paTable]);
    }
  }, []);

  const reset = useCallback(() => {
    setRegisters(initializeRegisters());
    setPaTable(DEFAULT_PA_TABLE);
    setCurrentGroup('GPIO & FIFO');
  }, []);

  const setPaTableByte = useCallback((index: number, value: number) => {
    if (index >= 0 && index < 8) {
      setPaTable(prev => {
        const newTable = [...prev];
        newTable[index] = value & 0xFF;
        return newTable;
      });
    }
  }, []);

  const actions: RegisterActions = {
    setRegister,
    toggleBit,
    setFrequency,
    setModulation,
    setDataRate,
    setBandwidth,
    setDeviation,
    setTxPower,
    setPaTableByte,
    loadPreset,
    reset
  };

  return {
    registers,
    setRegisters,
    paTable,
    setPaTable,
    currentGroup,
    setCurrentGroup,
    derived,
    actions
  };
}
