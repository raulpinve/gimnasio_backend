import { pool } from '../initDB.js';


// Columnas calculadas que antes estaban duplicadas en getWorkout y getAllWorkouts.
// `alias` es el alias de la tabla workouts en la query que las use.
const computedColumns = (alias) => `
    CASE
        WHEN ${alias}.finished_at IS NULL THEN 'abierto'
        ELSE 'cerrado'
    END AS estado,

    -- Fecha en español: '23 de junio de 2026'
    to_char(${alias}.started_at, 'DD "de" TMMonth "de" YYYY') AS fecha,

    -- Duración: '20 min' si dura menos de 1 hora, '1:20m' si dura 1 hora o más
    CASE
        WHEN ${alias}.finished_at IS NULL THEN NULL
        WHEN ${alias}.finished_at - ${alias}.started_at < interval '1 hour'
            THEN EXTRACT(MINUTE FROM (${alias}.finished_at - ${alias}.started_at)) || ' min'
        ELSE
            EXTRACT(HOUR FROM (${alias}.finished_at - ${alias}.started_at)) || ':' ||
            to_char(EXTRACT(MINUTE FROM (${alias}.finished_at - ${alias}.started_at)), 'FM00') || 'm'
    END AS duracion
`;

export const findActiveByUser = async ({ userId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT * FROM workouts
         WHERE finished_at IS NULL AND user_id = $1
         LIMIT 1`,
        [userId]
    );
    return rows[0] || null;
};

export const create = async ({ name, userId, routineId }, db = pool) => {
    const { rows } = await db.query(
        `INSERT INTO workouts (name, user_id, routine_id, started_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [name, userId, routineId ?? null]
    );
    return rows[0];
};

// Copia los ejercicios de una rutina al workout recién creado
export const copyExercisesFromRoutine = async ({ workoutId, routineId }, db = pool) => {
    await db.query(
        `INSERT INTO workout_exercises (workout_id, exercise_id, order_index)
         SELECT $1, exercise_id, order_index
         FROM routine_exercises
         WHERE routine_id = $2
         ORDER BY order_index`,
        [workoutId, routineId]
    );
};

export const findByIdAndUser = async ({ workoutId, userId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT w.*, ${computedColumns('w')}
         FROM workouts w
         WHERE w.id = $1 AND w.user_id = $2`,
        [workoutId, userId]
    );
    return rows[0] || null;
};

export const findAll = async ({ userId, routineId, limit, offset }, db = pool) => {
    const { rows } = await db.query(
        `SELECT w.*, r.name AS routine_name, ${computedColumns('w')}
         FROM workouts AS w
         LEFT JOIN routines AS r ON w.routine_id = r.id
         WHERE w.user_id = $1
           AND ($2::uuid IS NULL OR w.routine_id = $2)
         ORDER BY w.started_at DESC
         LIMIT $3 OFFSET $4`,
        [userId, routineId ?? null, limit, offset]
    );
    return rows;
};

export const count = async ({ userId, routineId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT COUNT(*)
         FROM workouts
         WHERE user_id = $1
           AND ($2::uuid IS NULL OR routine_id = $2)`,
        [userId, routineId ?? null]
    );
    return parseInt(rows[0].count, 10);
};

// Devuelve los workout_exercises que no tienen ningún set ni registro de cardio
export const findExercisesWithoutLogs = async ({ workoutId, userId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT we.id
         FROM workouts w
         JOIN workout_exercises we ON we.workout_id = w.id
         LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
         LEFT JOIN cardio_logs cl ON cl.workout_exercise_id = we.id
         WHERE w.id = $1 AND w.user_id = $2
         GROUP BY we.id
         HAVING COUNT(ws.id) = 0 AND COUNT(cl.id) = 0`,
        [workoutId, userId]
    );
    return rows;
};

export const finish = async ({ workoutId, userId }, db = pool) => {
    const { rows } = await db.query(
        `UPDATE workouts
         SET finished_at = NOW()
         WHERE id = $1 AND user_id = $2 AND finished_at IS NULL
         RETURNING *`,
        [workoutId, userId]
    );
    return rows[0] || null;
};

// Los ejercicios y sets se borran por ON DELETE CASCADE
export const remove = async ({ workoutId, userId }, db = pool) => {
    const { rowCount } = await db.query(
        `DELETE FROM workouts WHERE id = $1 AND user_id = $2`,
        [workoutId, userId]
    );
    return rowCount > 0;
};