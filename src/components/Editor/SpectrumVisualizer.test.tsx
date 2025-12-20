import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpectrumVisualizer } from './SpectrumVisualizer';
import type { RfValidation } from '../../utils/calculations';

// Default RF validation for tests
const defaultRfValidation: RfValidation = {
  modulationIndex: 1.0,
  suggestedBandwidth: 200,
  warnings: [],
  isValid: true,
};

describe('SpectrumVisualizer Component', () => {
  it('renders carrier frequency in header', () => {
    render(
      <SpectrumVisualizer
        frequency={433.92}
        bandwidth={200}
        deviation={50}
        modulation={0}
        dataRate={100}
        rfValidation={defaultRfValidation}
      />
    );
    
    // There are multiple frequency elements - use getAllByText
    const freqElements = screen.getAllByText(/433\.92/);
    expect(freqElements.length).toBeGreaterThan(0);
  });

  it('renders bandwidth value', () => {
    render(
      <SpectrumVisualizer
        frequency={433.92}
        bandwidth={200}
        deviation={50}
        modulation={0}
        dataRate={100}
        rfValidation={defaultRfValidation}
      />
    );
    
    expect(screen.getByText('200 kHz')).toBeInTheDocument();
  });

  it('renders deviation for FSK modulation', () => {
    render(
      <SpectrumVisualizer
        frequency={433.92}
        bandwidth={200}
        deviation={50}
        modulation={0}
        dataRate={100}
        rfValidation={defaultRfValidation}
      />
    );
    
    expect(screen.getByText('±50.0 kHz')).toBeInTheDocument();
  });

  it('hides deviation for ASK modulation', () => {
    render(
      <SpectrumVisualizer
        frequency={433.92}
        bandwidth={200}
        deviation={50}
        modulation={3}
        dataRate={100}
        rfValidation={{ ...defaultRfValidation, modulationIndex: 0 }}
      />
    );
    
    expect(screen.queryByText('±50.0 kHz')).not.toBeInTheDocument();
  });

  it('renders data rate', () => {
    render(
      <SpectrumVisualizer
        frequency={433.92}
        bandwidth={200}
        deviation={50}
        modulation={0}
        dataRate={100}
        rfValidation={defaultRfValidation}
      />
    );
    
    expect(screen.getByText('100.00 kbps')).toBeInTheDocument();
  });

  it('renders modulation type', () => {
    render(
      <SpectrumVisualizer
        frequency={433.92}
        bandwidth={200}
        deviation={50}
        modulation={0}
        dataRate={100}
        rfValidation={defaultRfValidation}
      />
    );
    
    expect(screen.getByText('2-FSK')).toBeInTheDocument();
  });

  it('renders modulation index for FSK', () => {
    render(
      <SpectrumVisualizer
        frequency={433.92}
        bandwidth={200}
        deviation={50}
        modulation={0}
        dataRate={100}
        rfValidation={defaultRfValidation}
      />
    );
    
    expect(screen.getByText('1.00')).toBeInTheDocument();
  });

  it('shows warning badge when there are warnings', () => {
    const rfValidationWithWarnings: RfValidation = {
      ...defaultRfValidation,
      warnings: [
        { type: 'warning', message: 'Bandwidth too narrow', field: 'bandwidth' }
      ],
    };
    
    const { container } = render(
      <SpectrumVisualizer
        frequency={433.92}
        bandwidth={50}
        deviation={50}
        modulation={0}
        dataRate={100}
        rfValidation={rfValidationWithWarnings}
      />
    );
    
    expect(container.querySelector('.warning-badge')).toBeInTheDocument();
  });

  it('renders SVG spectrum envelope', () => {
    const { container } = render(
      <SpectrumVisualizer
        frequency={433.92}
        bandwidth={200}
        deviation={50}
        modulation={0}
        dataRate={100}
        rfValidation={defaultRfValidation}
      />
    );
    
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('path')).toBeInTheDocument();
  });

  it('renders carrier marker', () => {
    const { container } = render(
      <SpectrumVisualizer
        frequency={433.92}
        bandwidth={200}
        deviation={50}
        modulation={0}
        dataRate={100}
        rfValidation={defaultRfValidation}
      />
    );
    
    expect(container.querySelector('.carrier-marker')).toBeInTheDocument();
    expect(screen.getByText('fc')).toBeInTheDocument();
  });

  it('renders deviation markers for FSK', () => {
    const { container } = render(
      <SpectrumVisualizer
        frequency={433.92}
        bandwidth={200}
        deviation={50}
        modulation={0}
        dataRate={100}
        rfValidation={defaultRfValidation}
      />
    );
    
    const devMarkers = container.querySelectorAll('.deviation-marker');
    expect(devMarkers.length).toBe(2); // left and right
  });

  it('renders bandwidth indicator', () => {
    const { container } = render(
      <SpectrumVisualizer
        frequency={433.92}
        bandwidth={200}
        deviation={50}
        modulation={0}
        dataRate={100}
        rfValidation={defaultRfValidation}
      />
    );
    
    // Uses bandwidth-indicator class, not bandwidth-marker
    const bwIndicator = container.querySelector('.bandwidth-indicator');
    expect(bwIndicator).toBeInTheDocument();
  });

  it('renders frequency axis with labels', () => {
    const { container } = render(
      <SpectrumVisualizer
        frequency={433.92}
        bandwidth={200}
        deviation={50}
        modulation={0}
        dataRate={100}
        rfValidation={defaultRfValidation}
      />
    );
    
    expect(container.querySelector('.frequency-axis')).toBeInTheDocument();
    const labels = container.querySelectorAll('.freq-label');
    expect(labels.length).toBeGreaterThan(0);
  });
});
