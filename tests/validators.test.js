import { describe, it, expect } from 'vitest';
import { evaluate, hint, normalizeBlankText, toPublicQuestion } from '../src/engine/validators.js';

describe('Validadores puros y pistas (Sección 5.2 y 10 SDD)', () => {
  it('evalúa verdadero/falso (tf) correctamente', () => {
    const q = {
      qid: 'M01-tf-001',
      type: 'tf',
      explanation: 'Exp',
      answer: { value: true }
    };
    expect(evaluate(q, { value: true }).correct).toBe(true);
    expect(evaluate(q, { value: false }).score).toBe(0);
  });

  it('evalúa opción múltiple (mc) con aciertos parciales y caso ninguna es correcta', () => {
    const qMulti = {
      qid: 'M01-mc-002',
      type: 'mc',
      options: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
        { id: 'c', text: 'C' }
      ],
      answer: { correct: ['a', 'b'] }
    };
    expect(evaluate(qMulti, { selected: ['a', 'b'] }).score).toBe(1);
    expect(evaluate(qMulti, { selected: ['a'] }).score).toBe(0.5);
    expect(evaluate(qMulti, { selected: ['a', 'c'] }).score).toBe(0);

    const qNone = {
      qid: 'M01-mc-003',
      type: 'mc',
      options: [{ id: 'a', text: 'A' }],
      answer: { correct: [] }
    };
    expect(evaluate(qNone, { selected: [] }).correct).toBe(true);
    expect(evaluate(qNone, { selected: ['a'] }).correct).toBe(false);
  });

  it('normaliza y evalúa completar huecos (fb)', () => {
    expect(normalizeBlankText('  VARCHAR   ', false)).toBe('varchar');
    const qFb = {
      qid: 'M01-fb-001',
      type: 'fb',
      blanks: 2,
      answer: {
        accepted: [['CREATE'], ['TABLE']],
        caseSensitive: false
      }
    };
    expect(evaluate(qFb, { answers: [' create ', 'table'] }).correct).toBe(true);
    expect(evaluate(qFb, { answers: ['create', 'database'] }).score).toBe(0.5);
  });

  it('evalúa unir con flechas (mt) y ordenar bloques (or)', () => {
    const qMt = {
      qid: 'M01-mt-001',
      type: 'mt',
      answer: { pairs: { l1: 'r1', l2: 'r2' } }
    };
    expect(evaluate(qMt, { pairs: { l1: 'r1', l2: 'r2' } }).score).toBe(1);
    expect(evaluate(qMt, { pairs: { l1: 'r1', l2: 'r1' } }).score).toBe(0.5);

    const qOr = {
      qid: 'M01-or-001',
      type: 'or',
      blocks: [
        { id: 'b1', text: 'SELECT *' },
        { id: 'b2', text: 'FROM t;' }
      ],
      answer: { order: ['b1', 'b2'] }
    };
    expect(evaluate(qOr, { order: ['b1', 'b2'] }).correct).toBe(true);
    expect(evaluate(qOr, { order: ['b2', 'b1'] }).score).toBe(0);
    expect(hint(qOr).firstBlockId).toBe('b1');
  });

  it('oculta el campo answer en toPublicQuestion', () => {
    const raw = {
      qid: 'M01-tf-001',
      type: 'tf',
      answer: { value: true }
    };
    const pub = toPublicQuestion(raw);
    expect(pub.answer).toBeUndefined();
  });
});
