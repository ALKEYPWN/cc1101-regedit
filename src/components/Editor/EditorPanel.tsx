/**
 * EditorPanel Component - Main register editing area
 */

import { CC1101_REGISTERS, REGISTER_GROUPS } from '../../data/registers';
import { RegisterCard } from './RegisterCard';
import { SpectrumVisualizer } from './SpectrumVisualizer';
import { PATableEditor } from './PATableEditor';
import type { RfValidation } from '../../utils/calculations';
import './EditorPanel.css';

interface EditorPanelProps {
  currentGroup: string;
  registers: Record<number, number>;
  onRegisterChange: (addr: number, value: number) => void;
  onBitToggle: (addr: number, bit: number) => void;
  onToggleBitWithToast: (addr: number, bit: number, fieldName: string) => void;
  // Derived values for spectrum visualizer
  frequency: number;
  bandwidth: number;
  deviation: number;
  modulation: number;
  dataRate: number;
  rfValidation: RfValidation;
  // Spectrum drag callbacks
  onBandwidthChange?: (bwKHz: number) => void;
  onDeviationChange?: (devKHz: number) => void;
  // PA Table
  paTable: number[];
  onPaTableByteChange: (index: number, value: number) => void;
}

export function EditorPanel({
  currentGroup,
  registers,
  onRegisterChange,
  onToggleBitWithToast,
  frequency,
  bandwidth,
  deviation,
  modulation,
  dataRate,
  rfValidation,
  onBandwidthChange,
  onDeviationChange,
  paTable,
  onPaTableByteChange
}: EditorPanelProps) {
  const addresses = REGISTER_GROUPS[currentGroup] || [];
  const isPATableGroup = currentGroup === 'PA Table';

  return (
    <section className="editor-panel">
      {/* Spectrum Visualizer */}
      <SpectrumVisualizer
        frequency={frequency}
        bandwidth={bandwidth}
        deviation={deviation}
        modulation={modulation}
        dataRate={dataRate}
        rfValidation={rfValidation}
        onBandwidthChange={onBandwidthChange}
        onDeviationChange={onDeviationChange}
      />

      <div className="panel-header">
        <h2>{currentGroup}</h2>
      </div>

      {isPATableGroup ? (
        <PATableEditor
          paTable={paTable}
          onByteChange={onPaTableByteChange}
        />
      ) : (
        <div className="register-list">
          {addresses.map(addr => {
            const reg = CC1101_REGISTERS[addr];
            if (!reg) return null;

            return (
              <RegisterCard
                key={addr}
                address={addr}
                register={reg}
                value={registers[addr] ?? reg.default}
                onValueChange={(value) => onRegisterChange(addr, value)}
                onBitToggle={(bit) => {
                  const fieldName = reg.fields.find(f => f.bits.includes(bit))?.name || `Bit ${bit}`;
                  onToggleBitWithToast(addr, bit, fieldName);
                }}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
