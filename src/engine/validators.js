/**
 * Normaliza entradas para completar (fb):
 * recorte, espacios múltiples a uno, minúsculas salvo caseSensitive.
 */
export function normalizeBlankText(input, caseSensitive = false) {
  if (typeof input !== 'string') return '';
  const collapsed = input.trim().replace(/\s+/g, ' ');
  return caseSensitive ? collapsed : collapsed.toLowerCase();
}

/**
 * Devuelve una copia pública de la pregunta sin el campo `answer` (Sección 5.2 SDD).
 */
export function toPublicQuestion(question, prng = null) {
  if (!question || typeof question !== 'object') {
    throw new Error('Pregunta inválida');
  }
  const copy = structuredClone(question);
  delete copy.answer;

  if (copy.type === 'mc' && Array.isArray(copy.options) && prng) {
    copy.options = prng.shuffle(copy.options);
  }
  if (copy.type === 'mt' && Array.isArray(copy.right) && prng) {
    copy.right = prng.shuffle(copy.right);
  }
  if (copy.type === 'or' && Array.isArray(copy.blocks) && prng) {
    copy.blocks = prng.shuffle(copy.blocks);
  }
  return copy;
}

/**
 * Evalúa la respuesta de un jugador contra la pregunta completa.
 * Función pura conforme a la sección 5.2 del SDD.
 */
export function evaluate(question, response) {
  if (!question || !question.answer) {
    throw new Error('Pregunta sin estructura answer válida');
  }

  const { type, answer, explanation = '' } = question;
  const safeResponse = response && typeof response === 'object' ? response : {};
  let score = 0;

  switch (type) {
    case 'tf': {
      const expected = Boolean(answer.value);
      const given = typeof safeResponse.value === 'boolean' ? safeResponse.value : null;
      score = given === expected ? 1 : 0;
      break;
    }

    case 'mc': {
      const correctIds = Array.isArray(answer.correct) ? answer.correct : [];
      const selectedIds = Array.isArray(safeResponse.selected)
        ? Array.from(new Set(safeResponse.selected))
        : null;

      if (!selectedIds) {
        score = 0;
        break;
      }

      if (correctIds.length === 0) {
        score = selectedIds.length === 0 ? 1 : 0;
      } else {
        const correctSet = new Set(correctIds);
        let hits = 0;
        let mistakes = 0;
        for (const id of selectedIds) {
          if (correctSet.has(id)) hits++;
          else mistakes++;
        }
        score = Math.max(0, (hits - mistakes) / correctIds.length);
      }
      break;
    }

    case 'fb': {
      const acceptedPerBlank = Array.isArray(answer.accepted) ? answer.accepted : [];
      const caseSensitive = Boolean(answer.caseSensitive);
      const userAnswers = Array.isArray(safeResponse.answers) ? safeResponse.answers : [];
      const totalBlanks = acceptedPerBlank.length;

      if (totalBlanks === 0) {
        score = 0;
        break;
      }

      let matched = 0;
      for (let i = 0; i < totalBlanks; i++) {
        const rawUser = typeof userAnswers[i] === 'string' ? userAnswers[i].slice(0, 64) : '';
        const normalizedUser = normalizeBlankText(rawUser, caseSensitive);
        const variants = Array.isArray(acceptedPerBlank[i]) ? acceptedPerBlank[i] : [];
        const isHit = variants.some(
          (variant) => normalizeBlankText(String(variant), caseSensitive) === normalizedUser
        );
        if (isHit) matched++;
      }
      score = matched / totalBlanks;
      break;
    }

    case 'mt': {
      const expectedPairs = answer.pairs && typeof answer.pairs === 'object' ? answer.pairs : {};
      const givenPairs =
        safeResponse.pairs && typeof safeResponse.pairs === 'object' ? safeResponse.pairs : {};
      const leftKeys = Object.keys(expectedPairs);

      if (leftKeys.length === 0) {
        score = 0;
        break;
      }

      let correctCount = 0;
      for (const leftId of leftKeys) {
        if (givenPairs[leftId] && givenPairs[leftId] === expectedPairs[leftId]) {
          correctCount++;
        }
      }
      score = correctCount / leftKeys.length;
      break;
    }

    case 'or': {
      const expectedOrder = Array.isArray(answer.order) ? answer.order : [];
      const givenOrder = Array.isArray(safeResponse.order) ? safeResponse.order : [];

      if (expectedOrder.length === 0) {
        score = 0;
        break;
      }

      let inPlace = 0;
      for (let i = 0; i < expectedOrder.length; i++) {
        if (givenOrder[i] === expectedOrder[i]) {
          inPlace++;
        }
      }
      score = inPlace / expectedOrder.length;
      break;
    }

    default:
      throw new Error(`Tipo de pregunta desconocido: ${type}`);
  }

  const roundedScore = Number(score.toFixed(4));
  return {
    score: roundedScore,
    correct: roundedScore === 1,
    solution: structuredClone(answer),
    explanation
  };
}

/**
 * Genera una pista determinista para la pregunta según sección 4.4 del SDD.
 */
export function hint(question) {
  if (!question || !question.answer) {
    return { type: 'none', message: 'Sin pista disponible.' };
  }

  const { type, answer } = question;

  switch (type) {
    case 'tf': {
      const clue = question.explanation
        ? question.explanation.split('.')[0] + '.'
        : 'Revisa si las palabras clave están en el orden estándar de MySQL 8.4.';
      return {
        type: 'tf',
        message: `Pista conceptual: ${clue}`
      };
    }

    case 'mc': {
      const correctSet = new Set(answer.correct || []);
      const wrongOption = (question.options || []).find((opt) => !correctSet.has(opt.id));
      if (wrongOption) {
        return {
          type: 'mc',
          discardOptionId: wrongOption.id,
          message: `Puedes descartar la opción "${wrongOption.text}".`
        };
      }
      return {
        type: 'mc',
        message: 'Ninguna de las opciones listadas es correcta.'
      };
    }

    case 'fb': {
      const firstVariants = answer.accepted?.[0] ?? [];
      const firstWord = String(firstVariants[0] ?? '');
      const firstChar = firstWord.charAt(0);
      return {
        type: 'fb',
        blankIndex: 0,
        firstChar,
        length: firstWord.length,
        message: `El primer hueco comienza por "${firstChar}" (${firstWord.length} caracteres).`
      };
    }

    case 'mt': {
      const entries = Object.entries(answer.pairs || {});
      if (entries.length === 0) {
        return { type: 'mt', message: 'Sin pares disponibles.' };
      }
      const [leftId, rightId] = entries[0];
      const leftText = question.left?.find((l) => l.id === leftId)?.text ?? leftId;
      const rightText = question.right?.find((r) => r.id === rightId)?.text ?? rightId;
      return {
        type: 'mt',
        pair: { leftId, rightId },
        message: `Empareja "${leftText}" con "${rightText}".`
      };
    }

    case 'or': {
      const firstId = answer.order?.[0];
      const firstBlock = question.blocks?.find((b) => b.id === firstId);
      return {
        type: 'or',
        firstBlockId: firstId,
        message: `El primer bloque de la sentencia es "${firstBlock?.text ?? firstId}".`
      };
    }

    default:
      return { type: 'none', message: 'Sin pista disponible.' };
  }
}
