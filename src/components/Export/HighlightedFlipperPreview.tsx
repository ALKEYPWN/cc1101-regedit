/**
 * HighlightedFlipperPreview Component
 * Displays Flipper preset data with syntax highlighting
 */

import { CC1101_REGISTERS } from '../../data/registers';
import { toHex } from '../../utils/calculations';

interface HighlightedFlipperPreviewProps {
  registers: Record<number, number>;
  paTable: number[];
  presetName: string;
}

export function HighlightedFlipperPreview({ registers, paTable, presetName }: HighlightedFlipperPreviewProps) {
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
