/**
 * RegisterCard Component - Single register editor
 */

import { useState, useCallback } from 'react';
import type { Register } from '../../types/cc1101';
import { BitDisplay } from './BitDisplay';
import { extractFieldValue, toHex } from '../../utils/calculations';
import './RegisterCard.css';

interface RegisterCardProps {
  address: number;
  register: Register;
  value: number;
  onValueChange: (value: number) => void;
  onBitToggle: (bit: number) => void;
}

export function RegisterCard({ 
  address, 
  register, 
  value, 
  onValueChange,
  onBitToggle 
}: RegisterCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [inputValue, setInputValue] = useState(`0x${toHex(value)}`);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleInputBlur = useCallback(() => {
    let parsed: number;
    const trimmed = inputValue.trim();
    
    if (trimmed.toLowerCase().startsWith('0x')) {
      parsed = parseInt(trimmed, 16);
    } else {
      parsed = parseInt(trimmed, 10);
    }

    if (!isNaN(parsed) && parsed >= 0 && parsed <= 255) {
      onValueChange(parsed);
      setInputValue(`0x${toHex(parsed)}`);
    } else {
      setInputValue(`0x${toHex(value)}`);
    }
  }, [inputValue, value, onValueChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  }, [handleInputBlur]);

  // Update input when external value changes
  if (`0x${toHex(value)}` !== inputValue && document.activeElement?.tagName !== 'INPUT') {
    setInputValue(`0x${toHex(value)}`);
  }

  return (
    <div className={`register-card ${expanded ? 'expanded' : ''}`}>
      <div 
        className="register-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="register-info">
          <span className="register-addr">0x{toHex(address)}</span>
          <span className="register-name">{register.name}</span>
          <span className="register-desc">{register.description}</span>
        </div>
        <div className="register-value" onClick={(e) => e.stopPropagation()}>
          <BitDisplay 
            value={value} 
            register={register} 
            onToggleBit={onBitToggle}
          />
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="register-input"
            maxLength={4}
          />
        </div>
      </div>
      
      {expanded && (
        <div className="register-body">
          <div className="field-list">
            {register.fields.map((field, idx) => {
              const fieldValue = extractFieldValue(value, field.bits);
              return (
                <div key={idx} className="field-item">
                  <span className="field-name">{field.name}</span>
                  <span className="field-desc">{field.description}</span>
                  <span className="field-bits">
                    [{field.bits.join(':')}] = {fieldValue}
                    {field.options && field.options[fieldValue] && (
                      <span className="field-option"> ({field.options[fieldValue]})</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
