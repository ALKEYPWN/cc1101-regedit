/**
 * Flipper Connection Panel Component
 * UI for managing Flipper Zero USB connection
 */

import { useState } from 'react';
import type { FlipperBridge } from '../../hooks/useFlipperBridge';
import './FlipperConnectionPanel.css';

interface FlipperConnectionPanelProps {
  bridge: FlipperBridge;
  autoSync: boolean;
  onAutoSyncChange: (enabled: boolean) => void;
}

export function FlipperConnectionPanel({
  bridge,
  autoSync,
  onAutoSyncChange
}: FlipperConnectionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getStatusColor = (): string => {
    if (bridge.connectionError) return 'error';
    if (bridge.isConnecting) return 'connecting';
    if (bridge.isConnected) return autoSync ? 'connected-sync' : 'connected';
    return 'disconnected';
  };

  const getStatusText = (): string => {
    if (bridge.connectionError) return `Error: ${bridge.connectionError}`;
    if (bridge.isConnecting) return 'Connecting...';
    if (bridge.isConnected) return autoSync ? 'Connected (Auto-sync ON)' : 'Connected (Auto-sync OFF)';
    return 'Disconnected';
  };

  const getStatusIcon = (): string => {
    const status = getStatusColor();
    switch (status) {
      case 'error': return '🔴';
      case 'connecting': return '🟡';
      case 'connected-sync': return '🟢';
      case 'connected': return '⚪';
      case 'disconnected': 
      default: return '⚫';
    }
  };

  const handleConnect = async () => {
    try {
      await bridge.connect();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleDisconnect = () => {
    bridge.disconnect();
  };

  return (
    <div className="flipper-connection-panel">
      <div 
        className="flipper-connection-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3>Flipper Bridge</h3>
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="flipper-connection-content">
          <div className={`status-indicator status-${getStatusColor()}`}>
            <span className="status-icon">{getStatusIcon()}</span>
            <span className="status-text">{getStatusText()}</span>
          </div>

          <div className="connection-actions">
            {!bridge.isConnected ? (
              <button 
                className="btn-connect"
                onClick={handleConnect}
                disabled={bridge.isConnecting}
              >
                {bridge.isConnecting ? 'Connecting...' : 'Connect to Flipper'}
              </button>
            ) : (
              <>
                <button 
                  className="btn-disconnect"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </button>
                <label className="auto-sync-toggle">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => onAutoSyncChange(e.target.checked)}
                  />
                  <span>Auto-sync changes</span>
                </label>
              </>
            )}
          </div>

          {bridge.isConnected && !autoSync && (
            <p className="hint-text">
              💡 Enable auto-sync to automatically push register changes to Flipper
            </p>
          )}

          {!bridge.isConnected && (
            <p className="hint-text">
              Connect your Flipper Zero via USB to push configurations to hardware
            </p>
          )}
        </div>
      )}
    </div>
  );
}
