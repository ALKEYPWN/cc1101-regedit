import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRegisters } from './useRegisters';

describe('useRegisters Hook', () => {
  it('initializes with default register values', () => {
    const { result } = renderHook(() => useRegisters());
    
    expect(result.current.registers).toBeDefined();
    expect(typeof result.current.registers[0x00]).toBe('number');
  });

  it('initializes with default PA table', () => {
    const { result } = renderHook(() => useRegisters());
    
    expect(result.current.paTable).toHaveLength(8);
    expect(result.current.paTable[0]).toBe(0xC0);
  });

  it('provides derived frequency value', () => {
    const { result } = renderHook(() => useRegisters());
    
    expect(result.current.derived.frequency).toBeGreaterThan(0);
  });

  it('can set frequency', () => {
    const { result } = renderHook(() => useRegisters());
    
    act(() => {
      result.current.actions.setFrequency(433.92);
    });
    
    expect(result.current.derived.frequency).toBeCloseTo(433.92, 1);
  });

  it('can set modulation', () => {
    const { result } = renderHook(() => useRegisters());
    
    act(() => {
      result.current.actions.setModulation(3); // ASK
    });
    
    expect(result.current.derived.modulation).toBe(3);
  });

  it('can toggle bits', () => {
    const { result } = renderHook(() => useRegisters());
    
    const originalValue = result.current.registers[0x00];
    
    act(() => {
      result.current.actions.toggleBit(0x00, 0);
    });
    
    expect(result.current.registers[0x00]).not.toBe(originalValue);
  });

  it('can set individual registers', () => {
    const { result } = renderHook(() => useRegisters());
    
    act(() => {
      result.current.actions.setRegister(0x00, 0xAB);
    });
    
    expect(result.current.registers[0x00]).toBe(0xAB);
  });

  it('can set PA table bytes', () => {
    const { result } = renderHook(() => useRegisters());
    
    act(() => {
      result.current.actions.setPaTableByte(0, 0x50);
    });
    
    expect(result.current.paTable[0]).toBe(0x50);
  });

  it('can set bandwidth', () => {
    const { result } = renderHook(() => useRegisters());
    
    act(() => {
      result.current.actions.setBandwidth(200);
    });
    
    // Bandwidth should snap to nearest valid value
    expect(result.current.derived.bandwidth).toBeGreaterThan(0);
  });

  it('can set deviation', () => {
    const { result } = renderHook(() => useRegisters());
    
    act(() => {
      result.current.actions.setDeviation(50);
    });
    
    // Deviation may not be exact due to discrete register values
    expect(result.current.derived.deviation).toBeGreaterThan(40);
    expect(result.current.derived.deviation).toBeLessThan(60);
  });

  it('computes RF validation', () => {
    const { result } = renderHook(() => useRegisters());
    
    expect(result.current.derived.rfValidation).toBeDefined();
    expect(result.current.derived.rfValidation.modulationIndex).toBeGreaterThanOrEqual(0);
    expect(result.current.derived.rfValidation.warnings).toBeDefined();
  });

  it('can reset registers', () => {
    const { result } = renderHook(() => useRegisters());
    
    // Modify a register
    act(() => {
      result.current.actions.setRegister(0x00, 0xFF);
    });
    
    // Reset
    act(() => {
      result.current.actions.reset();
    });
    
    expect(result.current.registers[0x00]).not.toBe(0xFF);
  });
});
