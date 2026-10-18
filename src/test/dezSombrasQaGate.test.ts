import { describe, expect, it } from 'vitest';
import {
  dezSombrasQaEnvironmentAllowed,
  dezSombrasQaOriginAllowed,
} from '@/lib/qa/dezSombrasQaGate';

describe('gate da área QA de Dez Sombras', () => {
  it('exige desenvolvimento e a flag exata', () => {
    expect(dezSombrasQaEnvironmentAllowed(true, '1')).toBe(true);
    expect(dezSombrasQaEnvironmentAllowed(false, '1')).toBe(false);
    expect(dezSombrasQaEnvironmentAllowed(true, undefined)).toBe(false);
    expect(dezSombrasQaEnvironmentAllowed(true, 'true')).toBe(false);
  });

  it('aceita somente o host e a porta isolados', () => {
    expect(dezSombrasQaOriginAllowed('127.0.0.1', '5181')).toBe(true);
    expect(dezSombrasQaOriginAllowed('localhost', '5181')).toBe(false);
    expect(dezSombrasQaOriginAllowed('127.0.0.1', '5180')).toBe(false);
    expect(dezSombrasQaOriginAllowed('192.168.0.10', '5181')).toBe(false);
  });
});