import { describe, it, expect } from 'vitest';
import {
  SERVICE_WINDOW_MS,
  FREE_ENTRY_WINDOW_MS,
  computeWindowExpiry,
  openWindowOnInbound,
  isWindowOpen,
  windowMsRemaining,
  canSendFreeform,
} from './window';

const T0 = '2026-06-15T00:00:00.000Z';

describe('service window', () => {
  it('opens a 24h window for a normal inbound', () => {
    const expiry = computeWindowExpiry(T0, false);
    expect(new Date(expiry).getTime() - new Date(T0).getTime()).toBe(SERVICE_WINDOW_MS);
  });

  it('opens a 72h window for a free-entry (CTWA) inbound', () => {
    const expiry = computeWindowExpiry(T0, true);
    expect(new Date(expiry).getTime() - new Date(T0).getTime()).toBe(FREE_ENTRY_WINDOW_MS);
  });

  it('is open before expiry and closed after', () => {
    const w = openWindowOnInbound(T0, false);
    expect(isWindowOpen(w.expiresAt, '2026-06-15T12:00:00.000Z')).toBe(true);
    expect(isWindowOpen(w.expiresAt, '2026-06-16T01:00:00.000Z')).toBe(false);
    expect(isWindowOpen(null)).toBe(false);
  });

  it('reports remaining time for a countdown', () => {
    const w = openWindowOnInbound(T0, false);
    expect(windowMsRemaining(w.expiresAt, '2026-06-15T00:00:00.000Z')).toBe(SERVICE_WINDOW_MS);
    expect(windowMsRemaining(w.expiresAt, '2026-06-16T01:00:00.000Z')).toBe(0);
  });

  it('gates free-form sending on the window', () => {
    const w = openWindowOnInbound(T0, false);
    expect(canSendFreeform(w, '2026-06-15T10:00:00.000Z')).toBe(true);
    expect(canSendFreeform(w, '2026-06-16T10:00:00.000Z')).toBe(false);
  });
});
