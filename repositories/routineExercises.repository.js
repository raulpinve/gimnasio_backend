import { pool } from '../initDB.js';

export const create = async (
    {
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

export const findById = async ({ routineExerciseId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT re.*, e.id AS exercise_id, e.name AS exercise_name, e.type AS exercise_type
         FROM routine_exercises re
         INNER JOIN exercises AS e ON e.id = re.exercise_id
         WHERE re.id = $1`,
        [routineExerciseId]
    );
    return rows[0] || null;
};

export const findAllByRoutine = async ({ routineId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT re.*, e.id AS exercise_id, e.name AS exercise_name, e.type AS exercise_type,
                e.avatar, e.avatar_thumbnail
         FROM routine_exercises AS re
         INNER JOIN exercises AS e ON e.id = re.exercise_id
         WHERE re.routine_id = $1`,
        [routineId]
    );
    return rows;
};

export const update = async (
    {
        routineExerciseId,
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
         RETURNING *`,
        [
            targetSets,
            targetReps,
            targetWeight,
            targetDurationSeconds,
            targetDistanceKm,
            routineExerciseId
        ]
    );
    return rows[0] || null;
};

export const remove = async ({ routineExerciseId }, db = pool) => {
    const { rowCount } = await db.query(
        `DELETE FROM routine_exercises WHERE id = $1`,
        [routineExerciseId]
    );
    return rowCount > 0;
};

// Actualiza el peso objetivo de un ejercicio dentro de una rutina.
// Pensado para usarse en bucle dentro de una transacción (pasando un client).
export const updateWeight = async ({ routineId, exerciseId, newWeight }, db = pool) => {
    const { rowCount } = await db.query(
        `UPDATE routine_exercises
         SET target_weight = $1
         WHERE routine_id = $2 AND exercise_id = $3`,
        [newWeight, routineId, exerciseId]
    );
    return rowCount > 0;
};