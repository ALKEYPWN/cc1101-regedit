/**
 * ExportPanel Component - Export and import functionality
 */

import { useState, useCallback } from 'react';
import type { ExportFormat } from '../../types/cc1101';
import { generateExport, parseFlipperPresetData, parseRawHex } from '../../utils/export';
import { toHex } from '../../utils/calculations';
import { CC1101_REGISTERS } from '../../data/registers';
import './ExportPanel.css';

interface ExportPanelProps {
  registers: Record<number, number>;
  paTable: number[];
  onImport: (registers: Record<number, number>, paTable?: number[]) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export function ExportPanel({ registers, paTable, onImport, showToast }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('flipper_setting');
  const [presetName, setPresetName] = useState('Custom_433');
  const [importData, setImportData] = useState('');

  const exportContent = generateExport(format, presetName, registers, paTable);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportContent);
      showToast('Copied to clipboard!');
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = exportContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('Copied to clipboard!');
    }
  }, [exportContent, showToast]);

  const handleImport = useCallback(() => {
    if (!importData.trim()) {
      showToast('No data to import', 'error');
      return;
    }

    try {
      if (importData.includes('00 00') || importData.includes('Custom_preset_data')) {
        const { registers: newRegs, paTable: newPa } = parseFlipperPresetData(importData);
        onImport(newRegs, newPa.length > 0 ? newPa : undefined);
      } else {
        const newRegs = parseRawHex(importData);
        onImport(newRegs);
      }
      setImportData('');
      showToast('Import successful!');
    } catch (err) {
      showToast('Import failed', 'error');
    }
  }, [importData, onImport, showToast]);

  return (
    <aside className="export-panel">
      <div className="panel-header">
        <h2>Export</h2>
      </div>

      <div className="control-group">
        <label htmlFor="exportFormat">Format</label>
        <select
          id="exportFormat"
          className="select-input"
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
        >
          <option value="flipper_setting">Flipper setting_user</option>
          <option value="c_array">C Array</option>
          <option value="raw_hex">Raw Hex</option>
        </select>
      </div>

      <div className="control-group">
        <label htmlFor="presetName">Preset Name</label>
        <input
          type="text"
          id="presetName"
          className="text-input"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          placeholder="e.g., Custom_433"
        />
      </div>

      <div className="export-preview">
        <div className="preview-header">
          <span>Preview</span>
          <button className="btn btn-primary btn-sm" onClick={handleCopy}>
            <CopyIcon />
            Copy
          </button>
        </div>
        {format === 'flipper_setting' ? (
          <HighlightedFlipperPreview
            registers={registers}
            paTable={paTable}
            presetName={presetName}
          />
        ) : (
          <pre className="code-preview">
            <code>{exportContent}</code>
          </pre>
        )}
      </div>

      <div className="import-section">
        <div className="section-divider">
          <span>OR</span>
        </div>
        <div className="control-group">
          <label htmlFor="importData">Import Preset Data</label>
          <textarea
            id="importData"
            className="textarea-input"
            placeholder="Paste Custom_preset_data or raw hex values..."
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary btn-full" onClick={handleImport}>
          <ImportIcon />
          Import
        </button>
      </div>
    </aside>
  );
}

interface HighlightedFlipperPreviewProps {
  registers: Record<number, number>;
  paTable: number[];
  presetName: string;
}

function HighlightedFlipperPreview({ registers, paTable, presetName }: HighlightedFlipperPreviewProps) {
  // Check sync mode from MDMCFG2 to determine if SYNC words should be included
  const mdmcfg2 = registers[0x12] ?? 0x13; // Default value
  const syncMode = mdmcfg2 & 0x03; // Bits 1:0
  const isSyncEnabled = syncMode !== 0;

  // Build register pairs (only those meant for Flipper export)
  const registerPairs: Array<{ addr: number; value: number }> = [];
  for (let addr = 0; addr <= 0x2E; addr++) {
    const value = registers[addr];
    const regDef = CC1101_REGISTERS[addr];
    
    // Skip SYNC1/SYNC0 if sync mode is disabled
    if ((addr === 0x04 || addr === 0x05) && !isSyncEnabled) {
      continue;
    }
    
    // Only include if explicitly marked for Flipper export
    if (value !== undefined && regDef?.flipperExport === true) {
      registerPairs.push({ addr, value });
    }
  }

  return (
    <div className="highlighted-preview">
      <div className="preview-legend">
        <span className="legend-item">
          <span className="legend-color legend-register"></span>
          Registers
        </span>
        <span className="legend-item">
          <span className="legend-color legend-terminator"></span>
          Terminator
        </span>
        <span className="legend-item">
          <span className="legend-color legend-pa-table"></span>
          PA Table
        </span>
      </div>
      <pre className="code-preview code-preview-highlighted">
        <code>
          <span className="preset-header">Custom_preset_name: {presetName}</span>
          {'\n'}
          <span className="preset-header">Custom_preset_module: CC1101</span>
          {'\n'}
          <span className="preset-header">Custom_preset_data: </span>
          {registerPairs.map((pair, i) => (
            <span key={`reg-${pair.addr}`} className="hex-register">
              {toHex(pair.addr)} {toHex(pair.value)}{i < registerPairs.length - 1 ? ' ' : ''}
            </span>
          ))}
          <span className="hex-terminator"> 00 00 </span>
          {paTable.map((byte, i) => (
            <span key={`pa-${i}`} className="hex-pa-table">
              {toHex(byte)}{i < paTable.length - 1 ? ' ' : ''}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6z"/>
      <path d="M2 6a2 2 0 0 1 2-2v10a1 1 0 0 0 1 1h8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"/>
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
      <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
    </svg>
  );
}
