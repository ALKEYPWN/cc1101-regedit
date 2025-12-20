/**
 * PATableEditor Component - Edit the 8-byte PA power table
 */

import { useCallback, useState } from 'react';
import { toHex } from '../../utils/calculations';
import './PATableEditor.css';

interface PATableEditorProps {
  paTable: number[];
  onByteChange: (index: number, value: number) => void;
}

const PA_DESCRIPTIONS = [
  'PA Power 0 (used for ASK/OOK low)',
  'PA Power 1 (used for ASK/OOK high)',
  'PA Power 2',
  'PA Power 3',
  'PA Power 4',
  'PA Power 5',
  'PA Power 6',
  'PA Power 7'
];

export function PATableEditor({ paTable, onByteChange }: PATableEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');

  const handleStartEdit = useCallback((index: number) => {
    setEditingIndex(index);
    setInputValue(`0x${toHex(paTable[index])}`);
  }, [paTable]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleInputBlur = useCallback(() => {
    if (editingIndex !== null) {
      let parsed: number;
      const trimmed = inputValue.trim();
      
      if (trimmed.toLowerCase().startsWith('0x')) {
        parsed = parseInt(trimmed, 16);
      } else {
        parsed = parseInt(trimmed, 10);
      }

      if (!isNaN(parsed) && parsed >= 0 && parsed <= 255) {
        onByteChange(editingIndex, parsed);
      }
    }
    setEditingIndex(null);
  }, [editingIndex, inputValue, onByteChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
    }
  }, [handleInputBlur]);

  return (
    <div className="pa-table-editor">
      <div className="pa-table-header">
        <h3>PA Table (8 bytes)</h3>
        <span className="pa-table-hint">Power Amplifier output power settings</span>
      </div>
      
      <div className="pa-table-grid">
        {paTable.map((value, index) => (
          <div key={index} className="pa-byte">
            <div className="pa-byte-header">
              <span className="pa-byte-index">PA[{index}]</span>
              <span className="pa-byte-desc">{PA_DESCRIPTIONS[index]}</span>
            </div>
            <div className="pa-byte-value">
              {editingIndex === index ? (
                <input
                  type="text"
                  className="pa-byte-input"
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  maxLength={4}
                />
              ) : (
                <span 
                  className="pa-byte-display"
                  onClick={() => handleStartEdit(index)}
                  title="Click to edit"
                >
                  0x{toHex(value)}
                </span>
              )}
              <span className="pa-byte-decimal">({value})</span>
            </div>
          </div>
        ))}
      </div>

      <div className="pa-table-footer">
        <div className="pa-raw-view">
          <span className="pa-raw-label">Raw:</span>
          <code className="pa-raw-value">
            {paTable.map(v => toHex(v)).join(' ')}
          </code>
        </div>
      </div>
    </div>
  );
}
