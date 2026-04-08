import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TitleH1 from '../TitleH1';

describe('TitleH1', () => {
  it('should render children text', () => {
    render(<TitleH1>Test Title</TitleH1>);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should render as h1 element', () => {
    render(<TitleH1>Test Title</TitleH1>);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Test Title');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <TitleH1 className="custom-class">Test Title</TitleH1>
    );
    const heading = container.querySelector('h1');
    expect(heading).toHaveClass('custom-class');
  });
});
