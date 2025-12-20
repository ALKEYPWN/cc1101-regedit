import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { BitDisplay } from './BitDisplay';
import type { Register } from '../../types/cc1101';

// Mock register for testing
const mockRegister: Register = {
  name: 'IOCFG2',
  default: 0x29,
  description: 'GDO2 Output Pin Configuration',
  fields: [
    { name: 'GDO2_CFG', bits: [0, 1, 2, 3, 4, 5], description: 'GDO2 config' },
  ],
};

const mockRegisterAllBits: Register = {
  name: 'TEST',
  default: 0x00,
  description: 'Test Register',
  fields: [
    { name: 'ALL', bits: [0, 1, 2, 3, 4, 5, 6, 7], description: 'All bits' },
  ],
};

describe('BitDisplay Component', () => {
  it('renders 8 bits', () => {
    const { container } = render(
      <BitDisplay value={0b10101010} register={mockRegisterAllBits} onToggleBit={vi.fn()} />
    );
    const bits = container.querySelectorAll('.bit');
    expect(bits.length).toBe(8);
  });

  it('displays correct bit states (active class for 1)', () => {
    const { container } = render(
      <BitDisplay value={0b10101010} register={mockRegisterAllBits} onToggleBit={vi.fn()} />
    );
    const bits = container.querySelectorAll('.bit');
    
    // 0b10101010 = bits 7,5,3,1 are active (1), bits 6,4,2,0 are inactive (0)
    // Bits are displayed MSB first (bit 7 at index 0)
    expect(bits[0]).toHaveClass('active'); // bit 7
    expect(bits[1]).not.toHaveClass('active'); // bit 6
    expect(bits[2]).toHaveClass('active'); // bit 5
    expect(bits[3]).not.toHaveClass('active'); // bit 4
  });

  it('shows bit values (1 or 0) as text content', () => {
    const { container } = render(
      <BitDisplay value={0b10101010} register={mockRegisterAllBits} onToggleBit={vi.fn()} />
    );
    const bits = container.querySelectorAll('.bit');
    
    expect(bits[0].textContent).toBe('1'); // bit 7
    expect(bits[1].textContent).toBe('0'); // bit 6
  });

  it('calls onToggleBit when a valid bit is clicked', () => {
    const onToggleBit = vi.fn();
    const { container } = render(
      <BitDisplay value={0b10101010} register={mockRegisterAllBits} onToggleBit={onToggleBit} />
    );
    const bits = container.querySelectorAll('.bit');
    
    // Click bit 7 (first in display, MSB)
    fireEvent.click(bits[0]);
    expect(onToggleBit).toHaveBeenCalledWith(7);
  });

  it('marks reserved bits correctly (bits not in fields)', () => {
    // mockRegister only has bits 0-5 defined, so 6-7 are reserved
    const { container } = render(
      <BitDisplay value={0xFF} register={mockRegister} onToggleBit={vi.fn()} />
    );
    const bits = container.querySelectorAll('.bit');
    
    // Bits 7 and 6 (indices 0 and 1 in display) should be reserved
    expect(bits[0]).toHaveClass('reserved'); // bit 7
    expect(bits[1]).toHaveClass('reserved'); // bit 6
    // Bits 5-0 should not be reserved
    expect(bits[2]).not.toHaveClass('reserved'); // bit 5
  });

  it('does not call onToggleBit for reserved bits', () => {
    const onToggleBit = vi.fn();
    const { container } = render(
      <BitDisplay value={0xFF} register={mockRegister} onToggleBit={onToggleBit} />
    );
    const bits = container.querySelectorAll('.bit');
    
    // Click reserved bit 7
    fireEvent.click(bits[0]);
    expect(onToggleBit).not.toHaveBeenCalled();
    
    // Click valid bit 5
    fireEvent.click(bits[2]);
    expect(onToggleBit).toHaveBeenCalledWith(5);
  });

  it('has title attributes with bit information', () => {
    const { container } = render(
      <BitDisplay value={0b10101010} register={mockRegisterAllBits} onToggleBit={vi.fn()} />
    );
    const bits = container.querySelectorAll('.bit');
    
    expect(bits[0].getAttribute('title')).toContain('7');
  });
});
