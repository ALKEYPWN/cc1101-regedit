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

  // Ambient animation state for random signal simulation
  const [animationTime, setAnimationTime] = useState(0);
  const animationRef = useRef<number>();

  // Animate ambient signals when not dragging
  useEffect(() => {
    if (!isDragging) {
      const animate = () => {
        setAnimationTime(t => (t + 0.016) % 1000); // ~60fps, wrap at 1000s
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
  }, [isDragging]);

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

  // Generate realistic spectrum with lobes - centered at x=50
  // SVG coordinates: Y=0 is top, Y=60 is bottom
  const envelopePath = useMemo(() => {
    const height = 60;
    const peakY = 4;
    const baseY = height;
    const bwWidth = displayData.bwPercent / 2;
    const devWidth = Math.max(displayData.devPercent, 0.5);
    
    // Ambient RF noise generator (sine-based for smoothness)
    const noise = (x: number, t: number) => {
      // Create 3 different signal bursts at different frequencies
      const signal1 = Math.sin((x / 10 + t * 0.5) * Math.PI) * Math.sin(t * 0.8);
      const signal2 = Math.sin((x / 15 - t * 0.3) * Math.PI) * Math.sin(t * 1.2);
      const signal3 = Math.sin((x / 20 + t * 0.7) * Math.PI) * Math.sin(t * 0.5);
      
      // Combine and scale (very subtle, 0-2 units of variation)
      const combined = (signal1 + signal2 + signal3) / 3;
      return combined * 1.5;
    };
    
    // Helper: Gaussian function for smooth lobes (GFSK)
    const gaussian = (x: number, center: number, sigma: number) => {
      const exp = Math.exp(-Math.pow(x - center, 2) / (2 * sigma * sigma));
      return peakY + (baseY - peakY) * (1 - exp);
    };
    
    // Helper: Sinc-like function for lobes with side lobes (2-FSK, ASK)
    const sincLobe = (x: number, center: number, width: number) => {
      const dx = (x - center) / width;
      if (Math.abs(dx) < 0.01) return peakY; // Main lobe peak
      const sinc = Math.sin(Math.PI * dx) / (Math.PI * dx);
      // Add side lobes with decreasing amplitude
      const envelope = Math.exp(-Math.abs(dx) * 0.8);
      const y = peakY + (baseY - peakY) * (1 - Math.abs(sinc) * envelope);
      return Math.max(peakY, Math.min(baseY, y));
    };
    
    // Generate spectrum points
    const points: [number, number][] = [];
    const step = 0.5; // Sample every 0.5% for smooth curves
    
    for (let x = 0; x <= 100; x += step) {
      let y = baseY;
      
      if (isASK) {
        // ASK/OOK: Single wide sinc-like main lobe centered at fc
        const lobeWidth = Math.max(dataRate / 50, 3); // Width based on data rate
        y = sincLobe(x, 50, lobeWidth);
      } else if (is4FSK) {
        // 4-FSK: Four sinc-like lobes with side lobes at ±Δf, ±3Δf
        const innerDev = devWidth;
        const outerDev = devWidth * 2.5;
        const lobeWidth = Math.max(dataRate / 30, 2.5);
        
        const y1 = sincLobe(x, 50 - outerDev, lobeWidth);
        const y2 = sincLobe(x, 50 - innerDev, lobeWidth);
        const y3 = sincLobe(x, 50 + innerDev, lobeWidth);
        const y4 = sincLobe(x, 50 + outerDev, lobeWidth);
        
        y = Math.min(y1, y2, y3, y4);
      } else if (modulation === 1) {
        // GFSK: Two smooth Gaussian lobes at ±Δf
        const sigma = Math.max(dataRate / 40, 2.5);
        const y1 = gaussian(x, 50 - devWidth, sigma);
        const y2 = gaussian(x, 50 + devWidth, sigma);
        y = Math.min(y1, y2);
      } else {
        // 2-FSK / MSK: Two lobes with side lobes at ±Δf
        const lobeWidth = Math.max(dataRate / 30, 2.5);
        const y1 = sincLobe(x, 50 - devWidth, lobeWidth);
        const y2 = sincLobe(x, 50 + devWidth, lobeWidth);
        y = Math.min(y1, y2);
      }
      
      // Clip to bandwidth edges
      if (x < 50 - bwWidth || x > 50 + bwWidth) {
        y = baseY;
      } else {
        // Add ambient RF noise to active bandwidth region
        y = Math.max(peakY, Math.min(baseY, y + noise(x, animationTime)));
      }
      
      points.push([x, y]);
    }
    
    // Build smooth path using cubic bezier curves
    let path = `M 0,${baseY} L ${50 - bwWidth},${baseY}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      
      if (x1 >= 50 - bwWidth && x2 <= 50 + bwWidth) {
        // Use quadratic curves for smoothness
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        path += ` Q ${cx},${cy} ${x2},${y2}`;
      }
    }
    
    path += ` L ${50 + bwWidth},${baseY} L 100,${baseY} Z`;
    return path;
  }, [isASK, is4FSK, modulation, displayData.devPercent, displayData.bwPercent, dataRate, animationTime]);

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
          >
            <span className="bw-freq-label">
              {(frequency - bandwidth / 2000).toFixed(3)}
            </span>
          </div>
          <div 
            className={`bw-handle right ${isDragging === 'bw-right' ? 'active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setIsDragging('bw-right'); }}
            onTouchStart={(e) => { e.preventDefault(); setIsDragging('bw-right'); }}
            title="Drag to adjust bandwidth"
          >
            <span className="bw-freq-label">
              {(frequency + bandwidth / 2000).toFixed(3)}
            </span>
          </div>
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
