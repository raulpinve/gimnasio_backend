import { pool } from '../initDB.js';

/**
 * Repository de routine_exercises.
 * Solo acceso a datos; todos los métodos aceptan un `db` opcional
 * (pool por defecto, o un client si se está dentro de una transacción).
 *
 * Todas las operaciones exigen `userId`: un ejercicio de rutina solo es
 * accesible si su rutina pertenece al usuario.
 */

// Devuelve null si la rutina no existe o no pertenece al usuario
export const create = async (
    {
        userId,
        routineId,
        exerciseId,
        targetSets,
        targetReps,
        targetWeight,
        targetDurationSeconds,
        targetDistanceKm
    },
    db = pool
) => {
    const { rowCount } = await db.query(
        `SELECT 1 FROM routines WHERE id = $1 AND user_id = $2`,
        [routineId, userId]
    );
    if (rowCount === 0) return null;

    const { rows } = await db.query(
        `INSERT INTO routine_exercises (
            routine_id,
            exercise_id,
            target_sets,
            target_reps,
            target_weight,
            target_duration_seconds,
            target_distance_km
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
            routineId,
            exerciseId,
            targetSets ?? null,
            targetReps ?? null,
            targetWeight ?? null,
            targetDurationSeconds ?? null,
            targetDistanceKm ?? null
        ]
    );
    return rows[0];
};

export const findById = async ({ routineExerciseId, userId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT re.*, e.id AS exercise_id, e.name AS exercise_name, e.type AS exercise_type
         FROM routine_exercises re
         INNER JOIN exercises AS e ON e.id = re.exercise_id
         INNER JOIN routines AS r ON r.id = re.routine_id
         WHERE re.id = $1 AND r.user_id = $2`,
        [routineExerciseId, userId]
    );
    return rows[0] || null;
};

// Si la rutina no es del usuario, devuelve una lista vacía
export const findAllByRoutine = async ({ routineId, userId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT re.*, e.id AS exercise_id, e.name AS exercise_name, e.type AS exercise_type,
                e.avatar, e.avatar_thumbnail
         FROM routine_exercises AS re
         INNER JOIN exercises AS e ON e.id = re.exercise_id
         INNER JOIN routines AS r ON r.id = re.routine_id
         WHERE re.routine_id = $1 AND r.user_id = $2`,
        [routineId, userId]
    );
    return rows;
};

export const update = async (
    {
        routineExerciseId,
        userId,
        targetSets,
        targetReps,
        targetWeight,
        targetDurationSeconds,
        targetDistanceKm
    },
    db = pool
) => {
    const { rows } = await db.query(
        `UPDATE routine_exercises
         SET target_sets = COALESCE($1, target_sets),
             target_reps = COALESCE($2, target_reps),
             target_weight = COALESCE($3, target_weight),
             target_duration_seconds = COALESCE($4, target_duration_seconds),
             target_distance_km = COALESCE($5, target_distance_km)
         WHERE id = $6
           AND routine_id IN (SELECT id FROM routines WHERE user_id = $7)
         RETURNING *`,
        [
            targetSets,
            targetReps,
            targetWeight,
            targetDurationSeconds,
            targetDistanceKm,
            routineExerciseId,
            userId
        ]
    );
    return rows[0] || null;
};

export const remove = async ({ routineExerciseId, userId }, db = pool) => {
    const { rowCount } = await db.query(
        `DELETE FROM routine_exercises
         WHERE id = $1
           AND routine_id IN (SELECT id FROM routines WHERE user_id = $2)`,
        [routineExerciseId, userId]
    );
    return rowCount > 0;
};

// Actualiza el peso objetivo de un ejercicio dentro de una rutina del usuario.
// Pensado para usarse en bucle dentro de una transacción (pasando un client).
export const updateWeight = async ({ userId, routineId, exerciseId, newWeight }, db = pool) => {
    const { rowCount } = await db.query(
        `UPDATE routine_exercises
         SET target_weight = $1
         WHERE routine_id = $2
           AND exercise_id = $3
           AND routine_id IN (SELECT id FROM routines WHERE user_id = $4)`,
        [newWeight, routineId, exerciseId, userId]
    );
    return rowCount > 0;
};