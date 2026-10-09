import { body, query } from 'express-validator';
import { throwNotFoundError } from '../errors/throwHTTPErrors.js';
import handleValidationErrors from './handleValidationErrors.js';
import { pool } from '../initDB.js';
import { validateUUID } from './validator.js';

const GOALS = ['hipertrofia', 'perdida_grasa', 'fuerza', 'salud_general'];
const EXPERIENCES = ['principiante', 'intermedio', 'avanzado'];
const EQUIPMENT = [
    'barras', 'mancuernas', 'maquinas', 'poleas', 'banco',
    'peso_corporal', 'bandas', 'kettlebells', 'ninguno'
];

// Equipo que siempre se considera disponible (igual que en generate_routines_for_user)
const ALWAYS_AVAILABLE = ['ninguno', 'peso_corporal'];

export const validateTemplateId = async (req, res, next) => {
    try {
        const templateId = req?.params?.templateId;
        if (!validateUUID(templateId)) {
            return throwNotFoundError("El ID del programa no es válido.");
        }

        const { rows } = await pool.query(
            `SELECT id FROM program_templates WHERE id = $1`,
            [templateId]
        );

        if (rows.length === 0) {
            return throwNotFoundError("El programa no existe.");
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Validación del contenido de las rutinas (nombres, ejercicios, equipo, tipo de ejercicio)
const validateRoutinesContent = async (routines, { req }) => {
    // 1) Nombres de rutina únicos dentro del programa
    const names = routines.map((r) => String(r?.name ?? '').trim().toLowerCase());
    if (new Set(names).size !== names.length) {
        throw new Error("Hay rutinas con el mismo nombre dentro del programa.");
    }

    // 2) Ejercicios sin repetir dentro de cada rutina
    for (const r of routines) {
        const ids = (r?.exercises ?? []).map((e) => e?.exerciseId);
        if (new Set(ids).size !== ids.length) {
            throw new Error(`La rutina "${r.name}" tiene ejercicios repetidos.`);
        }
    }

    // 3) Todos los exerciseId deben existir
    const allIds = [...new Set(
        routines.flatMap((r) => (r?.exercises ?? []).map((e) => e?.exerciseId))
    )].filter((id) => validateUUID(id));

    const { rows } = await pool.query(
        `SELECT id, name, type, equipment FROM exercises WHERE id = ANY($1::uuid[])`,
        [allIds]
    );
    const byId = new Map(rows.map((e) => [e.id, e]));

    const missing = allIds.filter((id) => !byId.has(id));
    if (missing.length > 0) {
        throw new Error(`Estos ejercicios no existen: ${missing.join(", ")}.`);
    }

    // 4) El equipo de cada ejercicio debe estar cubierto por requiredEquipment
    const allowed = new Set([...(req.body.requiredEquipment ?? []), ...ALWAYS_AVAILABLE]);
    for (const ex of byId.values()) {
        if (ex.equipment && !allowed.has(ex.equipment)) {
            throw new Error(
                `El ejercicio "${ex.name}" requiere "${ex.equipment}", que no está en requiredEquipment.`
            );
        }
    }

    // 5) Fuerza necesita series y reps; cardio necesita duración o distancia
    for (const r of routines) {
        for (const e of r.exercises ?? []) {
            const ex = byId.get(e?.exerciseId);
            if (!ex) continue;

            if (ex.type === 'strength' && (!e.targetSets || !e.targetReps)) {
                throw new Error(`"${ex.name}" es de fuerza: requiere targetSets y targetReps.`);
            }
            if (ex.type === 'cardio' && !e.targetDurationSeconds && !e.targetDistanceKm) {
                throw new Error(`"${ex.name}" es cardio: requiere targetDurationSeconds o targetDistanceKm.`);
            }
        }
    }

    return true;
};

// Se usa tanto en POST (crear) como en PUT (reemplazar)
export const validateTemplate = [
    body("name")
        .notEmpty().withMessage("El nombre es requerido.")
        .isLength({ min: 2, max: 150 })
        .withMessage("El nombre debe tener entre 2 y 150 caracteres.")
        .trim()
        .custom(async (value, { req }) => {
            const templateId = req.params?.templateId ?? null; // en PUT se excluye a sí mismo
            const { rows } = await pool.query(
                `SELECT id FROM program_templates
                 WHERE LOWER(name) = LOWER($1)
                   AND ($2::uuid IS NULL OR id <> $2)`,
                [value, templateId]
            );

            if (rows.length > 0) {
                throw new Error("Ya existe un programa con ese nombre.");
            }
            return true;
        }),

    body("goal")
        .notEmpty().withMessage("El objetivo es requerido.")
        .isIn(GOALS)
        .withMessage(`El objetivo debe ser uno de: ${GOALS.join(", ")}.`),

    body("experience")
        .optional()
        .isIn(EXPERIENCES)
        .withMessage(`La experiencia debe ser una de: ${EXPERIENCES.join(", ")}.`),

    body("daysPerWeek")
        .notEmpty().withMessage("Los días por semana son requeridos.")
        .isInt({ min: 1, max: 7 })
        .withMessage("Los días por semana deben estar entre 1 y 7.")
        .toInt(),

    body("requiredEquipment")
        .optional()
        .isArray().withMessage("requiredEquipment debe ser un arreglo."),

    body("requiredEquipment.*")
        .isIn(EQUIPMENT)
        .withMessage(`Equipo inválido. Valores permitidos: ${EQUIPMENT.join(", ")}.`),

    body("description")
        .optional({ nullable: true })
        .isString().withMessage("La descripción debe ser texto.")
        .trim(),

    body("routines")
        .isArray({ min: 1, max: 10 })
        .withMessage("Debe enviar entre 1 y 10 rutinas.")
        .bail()
        .custom(validateRoutinesContent),

    body("routines.*.name")
        .notEmpty().withMessage("El nombre de la rutina es requerido.")
        .isLength({ min: 2, max: 100 })
        .withMessage("El nombre de la rutina debe tener entre 2 y 100 caracteres.")
        .trim(),

    body("routines.*.exercises")
        .isArray({ min: 1, max: 20 })
        .withMessage("Cada rutina debe tener entre 1 y 20 ejercicios."),

    body("routines.*.exercises.*.exerciseId")
        .custom((value) => {
            if (!validateUUID(value)) {
                throw new Error("exerciseId debe ser un UUID válido.");
            }
            return true;
        }),

    body("routines.*.exercises.*.targetSets")
        .optional({ nullable: true })
        .isInt({ min: 1, max: 20 })
        .withMessage("targetSets debe estar entre 1 y 20.")
        .toInt(),

    body("routines.*.exercises.*.targetReps")
        .optional({ nullable: true })
        .isInt({ min: 1, max: 100 })
        .withMessage("targetReps debe estar entre 1 y 100.")
        .toInt(),

    body("routines.*.exercises.*.targetWeight")
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage("targetWeight debe ser un número mayor o igual a 0.")
        .toFloat(),

    body("routines.*.exercises.*.targetDurationSeconds")
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage("targetDurationSeconds debe ser mayor a 0.")
        .toInt(),

    body("routines.*.exercises.*.targetDistanceKm")
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage("targetDistanceKm debe ser un número mayor o igual a 0.")
        .toFloat(),

    handleValidationErrors
];

export const validateGetAllTemplates = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page debe ser un número mayor a 0."),

    query("pageSize")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("PageSize debe estar entre 1 y 100."),

    query("name")
        .optional()
        .isString(),

    query("goal")
        .optional()
        .isIn(GOALS)
        .withMessage(`El objetivo debe ser uno de: ${GOALS.join(", ")}.`),

    query("experience")
        .optional()
        .isIn(EXPERIENCES)
        .withMessage(`La experiencia debe ser una de: ${EXPERIENCES.join(", ")}.`),

    handleValidationErrors
];