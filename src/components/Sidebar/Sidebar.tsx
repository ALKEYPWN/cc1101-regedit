/**
 * Sidebar Component - Quick config and register navigation
 */

import { useMemo } from 'react';
import { REGISTER_GROUPS, PRESETS } from '../../data/registers';
import type { DerivedValues, RegisterActions } from '../../hooks/useRegisters';
import { frequencyToRegisters, toHex } from '../../utils/calculations';
import './Sidebar.css';

interface SidebarProps {
  currentGroup: string;
  onGroupChange: (group: string) => void;
  derived: DerivedValues;
  actions: RegisterActions;
}

const BANDWIDTH_OPTIONS = [58, 68, 81, 102, 116, 135, 162, 203, 232, 270, 325, 406, 464, 541, 650, 812];

// Check if keyfob presets should be shown
function areKeyFobsUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('keyfobs') === 'unlocked';
}

export function Sidebar({ currentGroup, onGroupChange, derived, actions }: SidebarProps) {
  const freqRegs = frequencyToRegisters(derived.frequency);
  const freqHint = `FREQ: 0x${toHex(freqRegs.FREQ2)}${toHex(freqRegs.FREQ1)}${toHex(freqRegs.FREQ0)}`;

  // Filter presets - hide keyfob presets unless query string unlocks them
  const visiblePresets = useMemo(() => {
    const keyfobsUnlocked = areKeyFobsUnlocked();
    return Object.keys(PRESETS).filter(name => {
      if (name.toLowerCase().startsWith('keyfob')) {
        return keyfobsUnlocked;
      }
      return true;
    });
  }, []);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value;
    if (preset) {
      actions.loadPreset(preset);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3 className="sidebar-title">Quick Config</h3>

        {/* Preset Selector */}
        <div className="control-group">
          <label htmlFor="presetSelect">Load Preset</label>
          <select id="presetSelect" className="select-input" onChange={handlePresetChange} defaultValue="">
            <option value="">-- Select Preset --</option>
            {visiblePresets.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* Frequency */}
        <div className="control-group">
          <label htmlFor="frequencyInput">Frequency (MHz)</label>
          <input
            type="number"
            id="frequencyInput"
            className="text-input"
            step="0.001"
            min="300"
            max="928"
            defaultValue={derived.frequency.toFixed(3)}
            key={`freq-${Math.round(derived.frequency * 1000)}`}
            onBlur={(e) => {
              const freq = parseFloat(e.target.value);
              if (!isNaN(freq) && freq >= 300 && freq <= 928) {
                actions.setFrequency(freq);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const freq = parseFloat(e.currentTarget.value);
                if (!isNaN(freq) && freq >= 300 && freq <= 928) {
                  actions.setFrequency(freq);
                }
              }
            }}
          />
          <span className="input-hint">{freqHint}</span>
        </div>

        {/* Modulation */}
        <div className="control-group">
          <label htmlFor="modulationSelect">Modulation</label>
          <select
            id="modulationSelect"
            className="select-input"
            value={derived.modulation}
            onChange={(e) => actions.setModulation(parseInt(e.target.value))}
          >
            <option value="0">2-FSK</option>
            <option value="1">GFSK</option>
            <option value="3">ASK/OOK</option>
            <option value="4">4-FSK</option>
            <option value="7">MSK</option>
          </select>
        </div>

        {/* Data Rate */}
        <div className="control-group">
          <label htmlFor="dataRateInput">Data Rate (kbps)</label>
          <input
            type="number"
            id="dataRateInput"
            className="text-input"
            step="0.01"
            min="0.6"
            max="500"
            defaultValue={derived.dataRate.toFixed(2)}
            key={`dr-${Math.round(derived.dataRate * 100)}`}
            onBlur={(e) => {
              const rate = parseFloat(e.target.value);
              if (!isNaN(rate) && rate >= 0.6 && rate <= 500) {
                actions.setDataRate(rate);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const rate = parseFloat(e.currentTarget.value);
                if (!isNaN(rate) && rate >= 0.6 && rate <= 500) {
                  actions.setDataRate(rate);
                }
              }
            }}
          />
        </div>

        {/* Bandwidth */}
        <div className="control-group">
          <label htmlFor="bandwidthSelect">RX Bandwidth (kHz)</label>
          <select
            id="bandwidthSelect"
            className="select-input"
            value={BANDWIDTH_OPTIONS.reduce((prev, curr) =>
              Math.abs(curr - derived.bandwidth) < Math.abs(prev - derived.bandwidth) ? curr : prev
            )}
            onChange={(e) => actions.setBandwidth(parseInt(e.target.value))}
          >
            {BANDWIDTH_OPTIONS.map(bw => (
              <option key={bw} value={bw}>{bw}</option>
            ))}
          </select>
        </div>

        {/* Deviation (hidden for ASK/OOK) */}
        {derived.modulation !== 3 && (
          <div className="control-group">
            <label htmlFor="deviationInput">Deviation (kHz)</label>
            <input
              type="number"
              id="deviationInput"
              className="text-input"
              step="0.1"
              min="1.5"
              max="380"
              defaultValue={derived.deviation.toFixed(1)}
              key={`dev-${Math.round(derived.deviation * 10)}`}
              onBlur={(e) => {
                const dev = parseFloat(e.target.value);
                if (!isNaN(dev) && dev >= 1.5 && dev <= 380) {
                  actions.setDeviation(dev);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const dev = parseFloat(e.currentTarget.value);
                  if (!isNaN(dev) && dev >= 1.5 && dev <= 380) {
                    actions.setDeviation(dev);
                  }
                }
              }}
            />
          </div>
        )}

        {/* TX Power */}
        <div className="control-group">
          <label htmlFor="txPowerSelect">TX Power</label>
          <select
            id="txPowerSelect"
            className="select-input"
            defaultValue="10"
            onChange={(e) => actions.setTxPower(parseInt(e.target.value))}
          >
            <option value="-30">-30 dBm</option>
            <option value="-20">-20 dBm</option>
            <option value="-15">-15 dBm</option>
            <option value="-10">-10 dBm</option>
            <option value="0">0 dBm</option>
            <option value="5">+5 dBm</option>
            <option value="7">+7 dBm</option>
            <option value="10">+10 dBm</option>
          </select>
        </div>
      </div>

      {/* Register Groups Navigation */}
      <div className="sidebar-section">
        <h3 className="sidebar-title">Register Groups</h3>
        <nav className="register-nav">
          {Object.entries(REGISTER_GROUPS).map(([groupName, addresses]) => (
            <div
              key={groupName}
              className={`nav-item ${groupName === currentGroup ? 'active' : ''}`}
              onClick={() => onGroupChange(groupName)}
            >
              <span>{groupName}</span>
              <span className="count">{addresses.length}</span>
            </div>
          ))}
          {/* PA Table as special group */}
          <div
            className={`nav-item pa-table-nav ${currentGroup === 'PA Table' ? 'active' : ''}`}
            onClick={() => onGroupChange('PA Table')}
          >
            <span>PA Table</span>
            <span className="count">8</span>
          </div>
        </nav>
      </div>
    </aside>
  );
}
