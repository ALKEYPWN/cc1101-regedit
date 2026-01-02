/**
 * CC1101 Register Editor - Main App Component
 */

import { useCallback, useState, useEffect } from 'react';
import { useRegisters } from './hooks/useRegisters';
import { useToast } from './hooks/useToast';
import { useFlipperBridge } from './hooks/useFlipperBridge';
import { Sidebar } from './components/Sidebar';
import { EditorPanel } from './components/Editor';
import { ExportPanel } from './components/Export';
import { Header } from './components/Header';
import { Toast } from './components/common';
import { toHex } from './utils/calculations';
import './styles/index.css';

function App() {
  const {
    registers,
    setRegisters,
    paTable,
    setPaTable,
    currentGroup,
    setCurrentGroup,
    derived,
    actions
  } = useRegisters();

  const { toast, showToast } = useToast();

  // Flipper bridge
  const flipperBridge = useFlipperBridge();
  const [autoSync, setAutoSync] = useState(false);

  const handleBitToggleWithToast = useCallback((addr: number, bit: number, fieldName: string) => {
    actions.toggleBit(addr, bit);
    const newValue = (registers[addr] ?? 0) ^ (1 << bit);
    showToast(`${fieldName}[${bit}] → 0x${toHex(newValue)}`);
  }, [actions, registers, showToast]);

  const handleImport = useCallback((newRegisters: Record<number, number>, newPaTable?: number[]) => {
    setRegisters(prev => ({ ...prev, ...newRegisters }));
    if (newPaTable) {
      setPaTable(newPaTable);
    }
  }, [setRegisters, setPaTable]);

  const handleReset = useCallback(() => {
    actions.reset();
    showToast('Reset to defaults');
  }, [actions, showToast]);

  // Auto-sync registers to Flipper when enabled and connected
  useEffect(() => {
    if (autoSync && flipperBridge.isConnected) {
      const syncRegisters = async () => {
        try {
          await flipperBridge.sendRegisters(registers, paTable);
        } catch (error) {
          console.error('Failed to sync registers:', error);
          showToast('Failed to sync to Flipper');
        }
      };

      // Debounce to avoid spamming Flipper with updates
      const timeoutId = setTimeout(syncRegisters, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [autoSync, flipperBridge.isConnected, registers, paTable, flipperBridge, showToast]);

  return (
    <div className="app-container">
      <Header onReset={handleReset} />

      <main className="main-content">
        <Sidebar
          currentGroup={currentGroup}
          onGroupChange={setCurrentGroup}
          derived={derived}
          actions={actions}
        />
        
        <EditorPanel
          currentGroup={currentGroup}
          registers={registers}
          onRegisterChange={actions.setRegister}
          onBitToggle={actions.toggleBit}
          onToggleBitWithToast={handleBitToggleWithToast}
          frequency={derived.frequency}
          bandwidth={derived.bandwidth}
          deviation={derived.deviation}
          modulation={derived.modulation}
          dataRate={derived.dataRate}
          rfValidation={derived.rfValidation}
          onBandwidthChange={actions.setBandwidth}
          onDeviationChange={actions.setDeviation}
          paTable={paTable}
          onPaTableByteChange={actions.setPaTableByte}
        />
        
        <ExportPanel
          registers={registers}
          paTable={paTable}
          onImport={handleImport}
          showToast={showToast}
          flipperBridge={flipperBridge}
          autoSync={autoSync}
          onAutoSyncChange={setAutoSync}
        />
      </main>

      <Toast {...toast} />
    </div>
  );
}

export default App;
