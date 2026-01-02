import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportPanel } from '../../components/Export/ExportPanel';
import type { FlipperBridge } from '../../hooks/useFlipperBridge';

describe('ExportPanel Component', () => {
  const defaultRegisters: Record<number, number> = {
    0x00: 0x2E,
    0x01: 0x2E,
  };
  const defaultPaTable = [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

  // Mock Flipper bridge
  const mockFlipperBridge: FlipperBridge = {
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendRegisters: vi.fn(),
    writeRegister: vi.fn(),
    ping: vi.fn()
  };

  it('renders export header', () => {
    render(
      <ExportPanel 
        registers={defaultRegisters} 
        paTable={defaultPaTable} 
        onImport={vi.fn()} 
        showToast={vi.fn()} 
        flipperBridge={mockFlipperBridge}
        autoSync={false}
        onAutoSyncChange={vi.fn()}
      />
    );
    
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('renders format selector', () => {
    render(
      <ExportPanel 
        registers={defaultRegisters} 
        paTable={defaultPaTable} 
        onImport={vi.fn()} 
        showToast={vi.fn()} 
        flipperBridge={mockFlipperBridge}
        autoSync={false}
        onAutoSyncChange={vi.fn()}
      />
    );
    
    expect(screen.getByLabelText('Format')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('flipper_setting');
  });

  it('renders preset name input', () => {
    render(
      <ExportPanel 
        registers={defaultRegisters} 
        paTable={defaultPaTable} 
        onImport={vi.fn()} 
        showToast={vi.fn()} 
        flipperBridge={mockFlipperBridge}
        autoSync={false}
        onAutoSyncChange={vi.fn()}
      />
    );
    
    expect(screen.getByLabelText('Preset Name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Custom_433')).toBeInTheDocument();
  });

  it('renders code preview with export content', () => {
    const { container } = render(
      <ExportPanel 
        registers={defaultRegisters} 
        paTable={defaultPaTable} 
        onImport={vi.fn()} 
        showToast={vi.fn()} 
        flipperBridge={mockFlipperBridge}
        autoSync={false}
        onAutoSyncChange={vi.fn()}
      />
    );
    
    const codePreview = container.querySelector('.code-preview code');
    expect(codePreview).toBeInTheDocument();
    // Should contain Flipper format content
    expect(codePreview?.textContent).toContain('Custom_preset_name');
    expect(codePreview?.textContent).toContain('Custom_433');
  });

  it('changes format when selector changes', () => {
    const { container } = render(
      <ExportPanel 
        registers={defaultRegisters} 
        paTable={defaultPaTable} 
        onImport={vi.fn()} 
        showToast={vi.fn()} 
        flipperBridge={mockFlipperBridge}
        autoSync={false}
        onAutoSyncChange={vi.fn()}
      />
    );
    
    const formatSelect = screen.getByRole('combobox');
    fireEvent.change(formatSelect, { target: { value: 'c_array' } });
    
    // Should now show C array format
    const codePreview = container.querySelector('.code-preview code');
    expect(codePreview?.textContent).toContain('static const uint8_t');
  });

  it('shows copy button', () => {
    render(
      <ExportPanel 
        registers={defaultRegisters} 
        paTable={defaultPaTable} 
        onImport={vi.fn()} 
        showToast={vi.fn()} 
        flipperBridge={mockFlipperBridge}
        autoSync={false}
        onAutoSyncChange={vi.fn()}
      />
    );
    
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('renders import textarea', () => {
    render(
      <ExportPanel 
        registers={defaultRegisters} 
        paTable={defaultPaTable} 
        onImport={vi.fn()} 
        showToast={vi.fn()} 
        flipperBridge={mockFlipperBridge}
        autoSync={false}
        onAutoSyncChange={vi.fn()}
      />
    );
    
    expect(screen.getByLabelText('Import Preset Data')).toBeInTheDocument();
  });

  it('shows error when trying to import empty data', () => {
    const showToast = vi.fn();
    render(
      <ExportPanel 
        registers={defaultRegisters} 
        paTable={defaultPaTable} 
        onImport={vi.fn()} 
        showToast={showToast} 
        flipperBridge={mockFlipperBridge}
        autoSync={false}
        onAutoSyncChange={vi.fn()}
      />
    );
    
    // Click import with empty textarea
    fireEvent.click(screen.getByText('Import'));
    
    expect(showToast).toHaveBeenCalledWith('No data to import', 'error');
  });

  it('calls onImport with parsed data', () => {
    const onImport = vi.fn();
    const showToast = vi.fn();
    render(
      <ExportPanel 
        registers={defaultRegisters} 
        paTable={defaultPaTable} 
        onImport={onImport} 
        showToast={showToast} 
        flipperBridge={mockFlipperBridge}
        autoSync={false}
        onAutoSyncChange={vi.fn()}
      />
    );
    
    const textarea = screen.getByLabelText('Import Preset Data');
    fireEvent.change(textarea, { 
      target: { value: '00 2E 01 2E 00 00 C0 00 00 00 00 00 00 00' } 
    });
    
    fireEvent.click(screen.getByText('Import'));
    
    expect(onImport).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Import successful!');
  });

  it('updates preset name when input changes', () => {
    const { container } = render(
      <ExportPanel 
        registers={defaultRegisters} 
        paTable={defaultPaTable} 
        onImport={vi.fn()} 
        showToast={vi.fn()} 
        flipperBridge={mockFlipperBridge}
        autoSync={false}
        onAutoSyncChange={vi.fn()}
      />
    );
    
    const nameInput = screen.getByLabelText('Preset Name');
    fireEvent.change(nameInput, { target: { value: 'MyPreset_868' } });
    
    // The export preview should update with new name
    const codePreview = container.querySelector('.code-preview code');
    expect(codePreview?.textContent).toContain('MyPreset_868');
  });
});
