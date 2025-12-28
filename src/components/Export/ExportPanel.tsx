/**
 * ExportPanel Component - Export and import functionality
 */

import { useState, useCallback, useEffect } from 'react';
import type { ExportFormat } from '../../types/cc1101';
import { generateExport, parseFlipperPresetData, parseRawHex } from '../../utils/export';
import { HighlightedFlipperPreview } from './HighlightedFlipperPreview';
import { CopyIcon, ImportIcon, ExportIcon } from './icons';
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
  const [isOpen, setIsOpen] = useState(false);

  // Detect if we're on mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 900);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


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

  const panelContent = (
    <>
      <div className="panel-header">
        <h2>Export</h2>
        {isMobile && isOpen && (
          <button 
            className="close-button" 
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
        )}
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
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* FAB Button */}
        <button 
          className="export-fab" 
          onClick={() => setIsOpen(true)}
          aria-label="Export"
        >
          <ExportIcon />
        </button>

        {/* Bottom Sheet Overlay */}
        {isOpen && (
          <>
            <div className="export-overlay" onClick={() => setIsOpen(false)} />
            <aside className="export-panel export-panel-mobile">
              {panelContent}
            </aside>
          </>
        )}
      </>
    );
  }

  return (
    <aside className="export-panel">
      {panelContent}
    </aside>
  );
}
