import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

const QID_REGEX = /^M(0[1-9]|1[01])-(tf|mc|fb|mt|or)-[0-9]{3}$/;
const EXPECTED_MODULES = [
  'M01',
  'M02',
  'M03',
  'M04',
  'M05',
  'M06',
  'M07',
  'M08',
  'M09',
  'M10',
  'M11'
];
const QUESTION_TYPES = ['tf', 'mc', 'fb', 'mt', 'or'];

const moduleFileSchema = {
  type: 'object',
  required: ['contentVersion', 'module', 'questions'],
  additionalProperties: false,
  properties: {
    contentVersion: { type: 'string', minLength: 1 },
    module: { type: 'string', enum: EXPECTED_MODULES },
    questions: {
      type: 'array',
      minItems: 15,
      items: {
        type: 'object',
        required: [
          'qid',
          'module',
          'type',
          'difficulty',
          'prompt',
          'timeLimit',
          'tags',
          'explanation',
          'answer'
        ],
        properties: {
          qid: { type: 'string', pattern: QID_REGEX.source },
          module: { type: 'string', enum: EXPECTED_MODULES },
          type: { type: 'string', enum: QUESTION_TYPES },
          difficulty: { type: 'integer', minimum: 1, maximum: 3 },
          prompt: { type: 'string', minLength: 5 },
          timeLimit: { type: 'integer', minimum: 5, maximum: 180 },
          tags: { type: 'array', items: { type: 'string' } },
          explanation: { type: 'string', minLength: 5 },
          executable: { type: 'boolean' },
          answer: { type: 'object' }
        }
      }
    }
  }
};

const validateModuleSchema = ajv.compile(moduleFileSchema);

const contentDir = path.resolve(process.cwd(), 'src/content');
const globalQids = new Set();
let hasErrors = false;

function reportError(context, msg) {
  console.error(`[ERROR] [${context}] ${msg}`);
  hasErrors = true;
}

for (const modId of EXPECTED_MODULES) {
  const filePath = path.join(contentDir, `${modId}.json`);
  if (!fs.existsSync(filePath)) {
    reportError(modId, `No existe el archivo ${filePath}`);
    continue;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    reportError(modId, `JSON malformado: ${err.message}`);
    continue;
  }

  const valid = validateModuleSchema(data);
  if (!valid) {
    for (const err of validateModuleSchema.errors || []) {
      reportError(modId, `Esquema Ajv (${err.instancePath}): ${err.message}`);
    }
    continue;
  }

  if (data.module !== modId) {
    reportError(modId, `El campo module (${data.module}) no coincide con el archivo ${modId}.json`);
  }

  const countsByType = { tf: 0, mc: 0, fb: 0, mt: 0, or: 0 };

  for (const q of data.questions) {
    countsByType[q.type] = (countsByType[q.type] || 0) + 1;

    if (globalQids.has(q.qid)) {
      reportError(q.qid, 'Identificador qid duplicado.');
    }
    globalQids.add(q.qid);

    if (!q.qid.startsWith(`${modId}-${q.type}-`)) {
      reportError(q.qid, `El prefijo de qid no coincide con ${modId}-${q.type}-`);
    }

    if (q.type === 'tf') {
      if (typeof q.statement !== 'string' || typeof q.answer?.value !== 'boolean') {
        reportError(q.qid, 'Pregunta tf requiere statement (string) y answer.value (boolean).');
      }
    } else if (q.type === 'mc') {
      const optIds = new Set((q.options || []).map((o) => o.id));
      if (optIds.size < 2 || !Array.isArray(q.answer?.correct)) {
        reportError(q.qid, 'Pregunta mc requiere opciones y answer.correct (array).');
      } else {
        for (const cid of q.answer.correct) {
          if (!optIds.has(cid)) {
            reportError(q.qid, `answer.correct referencia un id inexistente: ${cid}`);
          }
        }
      }
    } else if (q.type === 'fb') {
      const blanks = Number(q.blanks) || 0;
      if (blanks < 1 || !Array.isArray(q.answer?.accepted) || q.answer.accepted.length !== blanks) {
        reportError(
          q.qid,
          'Pregunta fb requiere que answer.accepted tenga longitud igual a blanks.'
        );
      }
    } else if (q.type === 'mt') {
      const leftIds = new Set((q.left || []).map((l) => l.id));
      const rightIds = new Set((q.right || []).map((r) => r.id));
      const pairs = q.answer?.pairs || {};
      if (Object.keys(pairs).length !== leftIds.size) {
        reportError(q.qid, 'Pregunta mt requiere un par por cada elemento izquierdo.');
      }
      for (const [l, r] of Object.entries(pairs)) {
        if (!leftIds.has(l) || !rightIds.has(r)) {
          reportError(q.qid, `Par inválido en mt: ${l} -> ${r}`);
        }
      }
    } else if (q.type === 'or') {
      const blockIds = new Set((q.blocks || []).map((b) => b.id));
      const order = q.answer?.order || [];
      if (order.length !== blockIds.size || new Set(order).size !== blockIds.size) {
        reportError(
          q.qid,
          'Pregunta or requiere que answer.order contenga todos los bloques sin repetir.'
        );
      }
    }
  }

  for (const t of QUESTION_TYPES) {
    if (countsByType[t] < 3) {
      reportError(
        modId,
        `El tipo "${t}" tiene ${countsByType[t]} preguntas (mínimo requerido: 3).`
      );
    }
  }
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log(
    `[OK] Lint de contenido superado: ${EXPECTED_MODULES.length} módulos y ${globalQids.size} preguntas verificadas.`
  );
}
