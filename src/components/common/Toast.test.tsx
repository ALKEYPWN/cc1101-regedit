import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toast } from '../../components/common/Toast';

describe('Toast Component', () => {
  it('hides when not visible (no show class)', () => {
    const { container } = render(<Toast message="Test" type="success" visible={false} />);
    const toast = container.querySelector('.toast');
    expect(toast).not.toHaveClass('show');
  });

  it('renders message when visible', () => {
    render(<Toast message="Success!" type="success" visible={true} />);
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('has show class when visible', () => {
    const { container } = render(<Toast message="Test" type="success" visible={true} />);
    const toast = container.querySelector('.toast');
    expect(toast).toHaveClass('show');
  });

  it('applies success type class', () => {
    const { container } = render(<Toast message="Success!" type="success" visible={true} />);
    const toast = container.querySelector('.toast');
    expect(toast).toHaveClass('success');
  });

  it('applies error type class', () => {
    const { container } = render(<Toast message="Error!" type="error" visible={true} />);
    const toast = container.querySelector('.toast');
    expect(toast).toHaveClass('error');
  });

  it('applies info type class', () => {
    const { container } = render(<Toast message="Info" type="info" visible={true} />);
    const toast = container.querySelector('.toast');
    expect(toast).toHaveClass('info');
  });
});
