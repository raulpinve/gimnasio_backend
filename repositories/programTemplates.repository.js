import { pool } from '../initDB.js';

/**
 * Repository de program_templates (con sus rutinas y ejercicios).
 * Solo acceso a datos; todos los métodos aceptan un `db` opcional
 * (pool por defecto, o un client si se está dentro de una transacción).
 *
 * La lectura de un programa completo (con rutinas y ejercicios) la hace
 * getTemplateById en utils/programTemplates.helper.js.
 */

// Filtros compartidos por findAll y count
const TEMPLATE_FILTERS = `
    WHERE ($1::text IS NULL OR t.name ILIKE '%' || $1 || '%')
      AND ($2::text IS NULL OR t.goal = $2)
      AND ($3::text IS NULL OR t.experience = $3)
`;

export const findAll = async ({ name, goal, experience, limit, offset }, db = pool) => {
    const { rows } = await db.query(
        `SELECT t.id, t.name, t.goal, t.experience, t.days_per_week,
                t.required_equipment, t.description,
                COUNT(ptr.id)::int AS routines_count
         FROM program_templates t
         LEFT JOIN program_template_routines ptr ON ptr.template_id = t.id
         ${TEMPLATE_FILTERS}
         GROUP BY t.id
         ORDER BY t.goal, t.experience, t.days_per_week, t.name
         LIMIT $4 OFFSET $5`,
        [name, goal, experience, limit, offset]
    );
    return rows;
};

export const count = async ({ name, goal, experience }, db = pool) => {
    const { rows } = await db.query(
        `SELECT COUNT(*) FROM program_templates t ${TEMPLATE_FILTERS}`,
        [name, goal, experience]
    );
    return parseInt(rows[0].count, 10);
};

// Crea la ficha del programa y devuelve su id
export const create = async (
    { name, goal, experience, daysPerWeek, requiredEquipment, description },
    db = pool
) => {
    const { rows } = await db.query(
        `INSERT INTO program_templates
            (name, goal, experience, days_per_week, required_equipment, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [name, goal, experience, daysPerWeek, requiredEquipment, description]
    );
    return rows[0].id;
};

// Actualiza la ficha del programa. Devuelve false si no existe.
export const update = async (
    { templateId, name, goal, experience, daysPerWeek, requiredEquipment, description },
    db = pool
) => {
    const { rowCount } = await db.query(
        `UPDATE program_templates
         SET name = $1, goal = $2, experience = $3, days_per_week = $4,
             required_equipment = $5, description = $6
         WHERE id = $7`,
        [name, goal, experience, daysPerWeek, requiredEquipment, description, templateId]
    );
    return rowCount > 0;
};

// ON DELETE CASCADE borra también los ejercicios de esas rutinas
export const removeRoutines = async ({ templateId }, db = pool) => {
    await db.query(
        `DELETE FROM program_template_routines WHERE template_id = $1`,
        [templateId]
    );
};

// Inserta rutinas y ejercicios. El order_index sale de la posición en el arreglo.
export const insertRoutines = async ({ templateId, routines }, db = pool) => {
    for (const [i, routine] of routines.entries()) {
        const { rows } = await db.query(
            `INSERT INTO program_template_routines (template_id, order_index, name)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [templateId, i + 1, routine.name]
        );
        const templateRoutineId = rows[0].id;

        for (const [j, ex] of routine.exercises.entries()) {
            await db.query(
                `INSERT INTO program_template_routine_exercises
                    (template_routine_id, exercise_id, order_index, target_sets, target_reps,
                     target_weight, target_duration_seconds, target_distance_km)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    templateRoutineId,
                    ex.exerciseId,
                    j + 1,
                    ex.targetSets ?? null,
                    ex.targetReps ?? null,
                    ex.targetWeight ?? null,
                    ex.targetDurationSeconds ?? null,
                    ex.targetDistanceKm ?? null
                ]
            );
        }
    }
};

// Las rutinas que ya recibieron los usuarios se conservan (template_id pasa a NULL)
export const remove = async ({ templateId }, db = pool) => {
    const { rowCount } = await db.query(
        `DELETE FROM program_templates WHERE id = $1`,
        [templateId]
    );
    return rowCount > 0;
};