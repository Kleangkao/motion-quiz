import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopicPackIcon } from '@/components/play/TopicPackIcon';

describe('TopicPackIcon built-in logos', () => {
  it('registers MonkeDAO pack logo asset', () => {
    render(<TopicPackIcon packId="monkedao" />);
    expect(screen.getByRole('img', { name: 'MonkeDAO' })).toHaveAttribute(
      'src',
      '/packs/monkedao-logo.jpg',
    );
  });
});
