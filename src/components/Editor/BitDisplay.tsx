/**
 * BitDisplay Component - Interactive bit visualization
 */

import type { Register } from '../../types/cc1101';
import { getValidBits, getFieldNameForBit } from '../../utils/calculations';
import './BitDisplay.css';

interface BitDisplayProps {
  value: number;
  register: Register;
  onToggleBit: (bit: number) => void;
}

export function BitDisplay({ value, register, onToggleBit }: BitDisplayProps) {
  const binary = value.toString(2).padStart(8, '0');
  const validBits = getValidBits(register);

  return (
    <div className="bit-display">
      {binary.split('').map((b, i) => {
        const bitIndex = 7 - i;
        const isValid = validBits.has(bitIndex);
        const isActive = b === '1';
        const fieldName = getFieldNameForBit(register, bitIndex);
        const tooltip = isValid 
          ? `Bit ${bitIndex} (${fieldName})` 
          : `Bit ${bitIndex} (Reserved)`;

        return (
          <span
            key={bitIndex}
            className={`bit ${isActive ? 'active' : ''} ${!isValid ? 'reserved' : ''}`}
            title={tooltip}
            onClick={(e) => {
              e.stopPropagation();
              if (isValid) {
                onToggleBit(bitIndex);
              }
            }}
          >
            {b}
          </span>
        );
      })}
    </div>
  );
}
