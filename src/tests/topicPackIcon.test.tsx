import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  TOPIC_PACK_ICON_IMAGE_CLASS,
  TOPIC_PACK_ICON_WRAPPER_CLASS,
  TopicPackIcon,
} from '@/components/play/TopicPackIcon';

describe('TopicPackIcon built-in logos', () => {
  it('registers MonkeDAO pack logo asset', () => {
    render(<TopicPackIcon packId="monkedao" />);
    expect(screen.getByRole('img', { name: 'MonkeDAO' })).toHaveAttribute(
      'src',
      '/packs/monkedao-logo.jpg',
    );
  });

  it('wraps built-in logos in a fixed square slot with centered object-contain image', () => {
    const { container } = render(<TopicPackIcon packId="solana-basics" size="md" />);

    const wrapper = container.firstElementChild;
    expect(wrapper?.tagName).toBe('SPAN');
    expect(wrapper?.className).toContain(TOPIC_PACK_ICON_WRAPPER_CLASS.md.split(' ')[0]);
    expect(wrapper?.className).toContain('h-10');
    expect(wrapper?.className).toContain('w-10');
    expect(wrapper?.className).toContain('items-center');
    expect(wrapper?.className).toContain('justify-center');

    const img = screen.getByRole('img', { name: 'Solana' });
    expect(img.className).toBe(TOPIC_PACK_ICON_IMAGE_CLASS);
    expect(img.className).toContain('object-contain');
    expect(img.className).toContain('object-center');
  });
});
