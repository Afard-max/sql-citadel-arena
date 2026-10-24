import { describe, it, expect } from 'vitest';
import {
  createDefaultProfile,
  sanitizeAndValidateProfile,
  progressStore
} from '../src/store/progress.js';

describe('ProgressStore y saneamiento de perfil (Sección 5.4 y 8.2 SDD)', () => {
  it('valida un perfil legítimo y recalcula su rango derivado', () => {
    const profile = createDefaultProfile('Alex_SQL');
    profile.xp = 1700;
    const sanitized = sanitizeAndValidateProfile(profile);
    expect(sanitized).not.toBeNull();
    expect(sanitized.rank).toBe('Comandante');
  });

  it('rechaza nombres de invocador malformados o con posible XSS', () => {
    const bad = createDefaultProfile();
    bad.player.name = '<script>alert(1)</script>';
    expect(sanitizeAndValidateProfile(bad)).toBeNull();
  });

  it('rechaza importaciones JSON corruptas o con esquema inválido', () => {
    expect(() => progressStore.importProfileJson('{corrupto')).toThrow();
    expect(() => progressStore.importProfileJson(JSON.stringify({ xp: -99 }))).toThrow();
  });
});
