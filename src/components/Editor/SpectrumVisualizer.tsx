/**
 * SpectrumVisualizer Component
 * Shows visual representation of RF configuration:
 * - Carrier frequency
 * - RX bandwidth (draggable)
 * - Deviation (draggable, for FSK)
 * - Modulation type indicator
 */

import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { MODULATION_FORMATS } from '../../data/registers';
import type { RfValidation } from '../../utils/calculations';
import './SpectrumVisualizer.css';

interface SpectrumVisualizerProps {
  frequency: number;      // MHz
  bandwidth: number;      // kHz
  deviation: number;      // kHz
  modulation: number;     // 0=2-FSK, 1=GFSK, 3=ASK/OOK, 4=4-FSK, 7=MSK
  dataRate: number;       // kbps
  rfValidation: RfValidation;
  onBandwidthChange?: (bwKHz: number) => void;
  onDeviationChange?: (devKHz: number) => void;
}

// Available bandwidth values (CC1101 supports discrete values)
const BANDWIDTH_VALUES = [58, 68, 81, 102, 116, 135, 162, 203, 232, 270, 325, 406, 464, 541, 650, 812];

export function SpectrumVisualizer({
  frequency,
  bandwidth,
  deviation,
  modulation,
  dataRate,
  rfValidation,
  onBandwidthChange,
  onDeviationChange
}: SpectrumVisualizerProps) {
  const modName = MODULATION_FORMATS[modulation]?.name || 'Unknown';
  const isASK = modulation === 3;
  const is4FSK = modulation === 4;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'bw-left' | 'bw-right' | 'dev-left' | 'dev-right' | null>(null);

  // Calculate display values (scaled for visualization)
  const displayData = useMemo(() => {
    // Scale bandwidth to percentage of display width (max 100%)
    const bwPercent = Math.min((bandwidth / 800) * 100, 100);
    // Scale deviation to percentage of half-width (so ±devPercent from center)
    // Linear scale: 400 kHz = 45%, 1.5 kHz = 0.17%
    // For visual clarity, we don't enforce a minimum here - the envelope handles it
    const devPercent = isASK ? 0 : Math.min((deviation / 400) * 45, 45);
    
    return {
      bwPercent,
      devPercent,
      bwLeft: 50 - bwPercent / 2,
      bwRight: 50 + bwPercent / 2,
    };
  }, [bandwidth, deviation, isASK]);

  // Convert mouse/touch position to percentage
  const getPercentFromEvent = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return 50;
    const rect = containerRef.current.getBoundingClientRect();
    // Handle both mouse and touch events
    const clientX = 'touches' in e 
      ? (e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0)
      : e.clientX;
    const x = clientX - rect.left;
    return (x / rect.width) * 100;
  }, []);

  // Handle move during drag (mouse or touch)
  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    
    const percent = getPercentFromEvent(e);
    
    if (isDragging === 'bw-left' || isDragging === 'bw-right') {
      // Calculate new bandwidth from drag position
      const distFromCenter = Math.abs(percent - 50);
      const newBwPercent = distFromCenter * 2;
      const newBwKHz = (newBwPercent / 100) * 800;
      
      // Snap to nearest valid bandwidth value
      const closest = BANDWIDTH_VALUES.reduce((prev, curr) =>
        Math.abs(curr - newBwKHz) < Math.abs(prev - newBwKHz) ? curr : prev
      );
      
      if (onBandwidthChange && closest !== bandwidth) {
        onBandwidthChange(closest);
      }
    } else if (isDragging === 'dev-left' || isDragging === 'dev-right') {
      // Calculate new deviation from drag position
      // Linear scale: 45% from center = 400 kHz
      const distFromCenter = Math.abs(percent - 50);
      const newDevKHz = (distFromCenter / 45) * 400;
      
      // Clamp deviation to valid range
      const clampedDev = Math.max(1.5, Math.min(380, newDevKHz));
      
      if (onDeviationChange) {
        onDeviationChange(clampedDev);
      }
    }
  }, [isDragging, getPercentFromEvent, bandwidth, onBandwidthChange, onDeviationChange]);

  // Handle end of drag (mouse up or touch end)
  const handleEnd = useCallback(() => {
    setIsDragging(null);
  }, []);

  // Add/remove global mouse and touch listeners
  useEffect(() => {
    if (isDragging) {
      // Mouse events
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      // Touch events
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
      window.addEventListener('touchcancel', handleEnd);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMove, handleEnd]);

  // Generate modulation envelope path - centered at x=50
  // SVG coordinates: Y=0 is top, Y=60 is bottom
  const envelopePath = useMemo(() => {
    const height = 60;
    const peakY = 2;
    const baseY = height;  // Baseline at bottom of viewBox
    const midY = height * 0.4;
    // bwWidth is the offset from center (50) to the edge
    // Should match bandwidth marker positions exactly
    const bwWidth = displayData.bwPercent / 2;
    // Use devPercent directly so peaks align with deviation markers
    // Small minimum (0.5) to prevent path collapse, but still allows sub-1% positioning
    const devWidth = Math.max(displayData.devPercent, 0.5);
    
    if (isASK) {
      return `
        M 0,${baseY}
        L ${50 - bwWidth},${baseY}
        Q ${50 - bwWidth},${midY} 50,${peakY}
        Q ${50 + bwWidth},${midY} ${50 + bwWidth},${baseY}
        L 100,${baseY}
      `;
    } else {
      if (is4FSK) {
        // 4-FSK has 4 frequency levels: -3Δf, -Δf, +Δf, +3Δf
        // Outer peaks at ±3× deviation, inner peaks at ±deviation
        const innerDev = devWidth;           // Inner peaks at ±Δf (matches markers)
        const outerDev = devWidth * 2.5;     // Outer peaks at ±3Δf
        const saddleY = midY * 0.7;
        
        return `
          M 0,${baseY}
          L ${50 - bwWidth},${baseY}
          Q ${50 - outerDev - 3},${midY} ${50 - outerDev},${peakY}
          Q ${50 - outerDev + 2},${midY * 0.5} ${50 - (outerDev + innerDev) / 2},${saddleY}
          Q ${50 - innerDev - 2},${midY * 0.5} ${50 - innerDev},${peakY}
          Q ${50 - innerDev + 2},${midY * 0.6} 50,${midY * 0.5}
          Q ${50 + innerDev - 2},${midY * 0.6} ${50 + innerDev},${peakY}
          Q ${50 + innerDev + 2},${midY * 0.5} ${50 + (outerDev + innerDev) / 2},${saddleY}
          Q ${50 + outerDev - 2},${midY * 0.5} ${50 + outerDev},${peakY}
          Q ${50 + outerDev + 3},${midY} ${50 + bwWidth},${baseY}
          L 100,${baseY}
        `;
      }
      
      // 2-FSK / GFSK / MSK - two peaks at ±Δf (aligned with deviation markers)
      return `
        M 0,${baseY}
        L ${50 - bwWidth},${baseY}
        Q ${50 - devWidth * 1.2},${midY} ${50 - devWidth},${peakY}
        Q ${50 - devWidth * 0.3},${midY * 0.5} 50,${midY * 0.4}
        Q ${50 + devWidth * 0.3},${midY * 0.5} ${50 + devWidth},${peakY}
        Q ${50 + devWidth * 1.2},${midY} ${50 + bwWidth},${baseY}
        L 100,${baseY}
      `;
    }
  }, [isASK, is4FSK, displayData.devPercent, displayData.bwPercent]);

  const freqMarkers = useMemo(() => {
    // Use fixed maximum span for frequency axis (max bandwidth = 812 kHz)
    // This way BW markers show correct position within the fixed window
    const maxHalfSpan = 812 / 2000; // 406 kHz = 0.406 MHz on each side
    const quarterSpan = maxHalfSpan / 2; // 203 kHz steps
    return [
      { pos: 0, label: `${(frequency - maxHalfSpan).toFixed(2)}`, edge: 'left' },
      { pos: 25, label: `${(frequency - quarterSpan).toFixed(2)}` },
      { pos: 50, label: `${frequency.toFixed(3)} MHz`, isCenter: true },
      { pos: 75, label: `${(frequency + quarterSpan).toFixed(2)}` },
      { pos: 100, label: `${(frequency + maxHalfSpan).toFixed(2)}`, edge: 'right' },
    ];
  }, [frequency]);

  return (
    <div className="spectrum-visualizer">
      <div className="spectrum-header">
        <span className="spectrum-title">RF Spectrum</span>
        <div className="spectrum-stats">
          <span className="stat">
            <span className="stat-label">Carrier</span>
            <span className="stat-value">{frequency.toFixed(3)} MHz</span>
          </span>
          <span className="stat">
            <span className="stat-label">BW</span>
            <span className={`stat-value ${rfValidation.warnings.some(w => w.field === 'bandwidth' && w.type !== 'info') ? 'has-warning' : ''}`}>
              {bandwidth} kHz
            </span>
          </span>
          {!isASK && (
            <>
              <span className="stat">
                <span className="stat-label">Dev</span>
                <span className={`stat-value ${rfValidation.warnings.some(w => w.field === 'deviation') ? 'has-warning' : ''}`}>
                  ±{deviation.toFixed(1)} kHz
                </span>
              </span>
              <span className="stat">
                <span className="stat-label">h</span>
                <span className={`stat-value ${rfValidation.modulationIndex < 0.5 ? 'mod-low' : rfValidation.modulationIndex > 2 ? 'mod-high' : ''}`}>
                  {rfValidation.modulationIndex.toFixed(2)}
                </span>
              </span>
            </>
          )}
          <span className="stat">
            <span className="stat-label">Rate</span>
            <span className="stat-value">{dataRate.toFixed(2)} kbps</span>
          </span>
          <span className="stat mod-badge">
            <span className={`mod-type mod-${modulation}`}>{modName}</span>
          </span>
          {rfValidation.warnings.filter(w => w.type !== 'info').length > 0 && (
            <span className="stat warning-badge" title={rfValidation.warnings.map(w => w.message).join('\n')}>
              ⚠️ {rfValidation.warnings.filter(w => w.type !== 'info').length}
            </span>
          )}
        </div>
      </div>
      
      <div className="spectrum-display" ref={containerRef}>
        <div className="spectrum-grid">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="grid-line" style={{ left: `${(i + 1) * 10}%` }} />
          ))}
        </div>

        <div 
          className="bandwidth-indicator"
          style={{
            left: `${displayData.bwLeft}%`,
            width: `${displayData.bwPercent}%`
          }}
        >
          <div 
            className={`bw-handle left ${isDragging === 'bw-left' ? 'active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setIsDragging('bw-left'); }}
            onTouchStart={(e) => { e.preventDefault(); setIsDragging('bw-left'); }}
            title="Drag to adjust bandwidth"
          />
          <div 
            className={`bw-handle right ${isDragging === 'bw-right' ? 'active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setIsDragging('bw-right'); }}
            onTouchStart={(e) => { e.preventDefault(); setIsDragging('bw-right'); }}
            title="Drag to adjust bandwidth"
          />
        </div>

        <div className="spectrum-envelope">
          <svg 
            viewBox="0 0 100 60" 
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="spectrumGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="askGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4ade80" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#4ade80" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path 
              d={envelopePath} 
              fill={isASK ? 'url(#askGradient)' : 'url(#spectrumGradient)'}
              stroke={isASK ? '#4ade80' : 'var(--accent-primary)'}
              strokeWidth="0.1"
            />
          </svg>
        </div>

        <div className="carrier-marker">
          <div className="carrier-line" />
          <span className="carrier-label">fc</span>
        </div>

        {!isASK && deviation > 0 && (
          <>
            <div 
              className={`deviation-marker left draggable ${isDragging === 'dev-left' ? 'active' : ''}`}
              style={{ left: `calc(50% - ${displayData.devPercent}%)` }}
              onMouseDown={(e) => { e.preventDefault(); setIsDragging('dev-left'); }}
              onTouchStart={(e) => { e.preventDefault(); setIsDragging('dev-left'); }}
              title="Drag to adjust deviation"
            >
              <div className="dev-line" />
              <span className="dev-label">-Δf</span>
            </div>
            <div 
              className={`deviation-marker right draggable ${isDragging === 'dev-right' ? 'active' : ''}`}
              style={{ left: `calc(50% + ${displayData.devPercent}%)` }}
              onMouseDown={(e) => { e.preventDefault(); setIsDragging('dev-right'); }}
              onTouchStart={(e) => { e.preventDefault(); setIsDragging('dev-right'); }}
              title="Drag to adjust deviation"
            >
              <div className="dev-line" />
              <span className="dev-label">+Δf</span>
            </div>
          </>
        )}

        <div className="frequency-axis">
          {freqMarkers.map((marker, i) => (
            <span 
              key={i} 
              className={`freq-label ${marker.isCenter ? 'center' : ''} ${marker.edge || ''}`}
              style={{ left: `${marker.pos}%` }}
            >
              {marker.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
