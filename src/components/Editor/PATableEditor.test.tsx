import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PATableEditor } from '../../components/Editor/PATableEditor';

describe('PATableEditor Component', () => {
  const defaultPaTable = [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

  it('renders all 8 PA table bytes', () => {
    render(<PATableEditor paTable={defaultPaTable} onByteChange={vi.fn()} />);
    
    // Should show all 8 byte labels
    expect(screen.getByText('PA[0]')).toBeInTheDocument();
    expect(screen.getByText('PA[7]')).toBeInTheDocument();
  });

  it('displays byte values in hex format', () => {
    render(<PATableEditor paTable={defaultPaTable} onByteChange={vi.fn()} />);
    
    // 0xC0 should be displayed
    expect(screen.getByText('0xC0')).toBeInTheDocument();
    // 0x00 should appear multiple times
    const zeros = screen.getAllByText('0x00');
    expect(zeros.length).toBe(7);
  });

  it('shows raw hex view', () => {
    render(<PATableEditor paTable={defaultPaTable} onByteChange={vi.fn()} />);
    
    expect(screen.getByText('Raw:')).toBeInTheDocument();
    expect(screen.getByText('C0 00 00 00 00 00 00 00')).toBeInTheDocument();
  });

  it('allows editing a byte value', () => {
    const onByteChange = vi.fn();
    render(<PATableEditor paTable={defaultPaTable} onByteChange={onByteChange} />);
    
    // Click on the first byte to edit
    const firstByteValue = screen.getByText('0xC0');
    fireEvent.click(firstByteValue);
    
    // Should show an input field
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    
    // Change the value and blur
    fireEvent.change(input, { target: { value: '0x50' } });
    fireEvent.blur(input);
    
    expect(onByteChange).toHaveBeenCalledWith(0, 0x50);
  });

  it('handles decimal input', () => {
    const onByteChange = vi.fn();
    render(<PATableEditor paTable={defaultPaTable} onByteChange={onByteChange} />);
    
    const firstByteValue = screen.getByText('0xC0');
    fireEvent.click(firstByteValue);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '128' } });
    fireEvent.blur(input);
    
    expect(onByteChange).toHaveBeenCalledWith(0, 128);
  });

  it('displays byte descriptions', () => {
    render(<PATableEditor paTable={defaultPaTable} onByteChange={vi.fn()} />);
    
    // PA[0] and PA[1] have special descriptions for ASK
    expect(screen.getByText(/ASK\/OOK low/i)).toBeInTheDocument();
    expect(screen.getByText(/ASK\/OOK high/i)).toBeInTheDocument();
  });
});
