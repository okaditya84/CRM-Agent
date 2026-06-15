import { describe, it, expect } from 'vitest';
import { buildWaLink } from './wa-link';

describe('buildWaLink', () => {
  it('strips formatting and encodes the prefilled text', () => {
    expect(buildWaLink('+91 98765 43210', 'Hi there')).toBe(
      'https://wa.me/919876543210?text=Hi%20there',
    );
  });

  it('omits the query when there is no text', () => {
    expect(buildWaLink('919876543210')).toBe('https://wa.me/919876543210');
  });
});
