import { pool } from '../initDB.js';

/**
 * Repository de workout_sets.
 * Solo acceso a datos; todos los métodos aceptan un `db` opcional
 * (pool por defecto, o un client si se está dentro de una transacción).
 *
 * Un set solo es accesible si su workout_exercise pertenece a un workout del usuario.
 */

// Comprueba que el workout_exercise sea del usuario y lo bloquea (FOR UPDATE)
// hasta el final de la transacción. Así, dos peticiones simultáneas para el mismo
// ejercicio se ejecutan una detrás de otra y no repiten el set_number.
// Debe llamarse dentro de una transacción (con un client).
export const lockOwnedWorkoutExercise = async ({ workoutExerciseId, userId }, db = pool) => {
    const { rowCount } = await db.query(
        `SELECT we.id
         FROM workout_exercises we
         JOIN workouts w ON w.id = we.workout_id
         WHERE we.id = $1 AND w.user_id = $2
         FOR UPDATE OF we`,
        [workoutExerciseId, userId]
    );
    return rowCount > 0;
};

// Siguiente número de serie dentro de un workout_exercise (1, 2, 3...)
export const getNextSetNumber = async ({ workoutExerciseId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT COALESCE(MAX(set_number), 0) + 1 AS next_set
         FROM workout_sets
         WHERE workout_exercise_id = $1`,
        [workoutExerciseId]
    );
    return rows[0].next_set;
};

export const create = async (
    { workoutExerciseId, setNumber, reps, weight, rpe, weightUnit },
    db = pool
) => {
    const { rows } = await db.query(
        `INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight, rpe, weight_unit)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [workoutExerciseId, setNumber, reps, weight, rpe, weightUnit || 'kg']
    );
    return rows[0];
};

export const findById = async ({ workoutSetId, userId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT ws.*
         FROM workout_sets ws
         JOIN workout_exercises we ON we.id = ws.workout_exercise_id
         JOIN workouts w ON w.id = we.workout_id
         WHERE ws.id = $1 AND w.user_id = $2`,
        [workoutSetId, userId]
    );
    return rows[0] || null;
};

// Si el workout_exercise no es del usuario, devuelve una lista vacía
export const findAllByWorkoutExercise = async ({ workoutExerciseId, userId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT ws.*
         FROM workout_sets ws
         JOIN workout_exercises we ON ws.workout_exercise_id = we.id
         JOIN workouts w ON w.id = we.workout_id
         WHERE we.id = $1 AND w.user_id = $2
         ORDER BY ws.created_at ASC`,
        [workoutExerciseId, userId]
    );
    return rows;
};

export const update = async ({ workoutSetId, userId, reps, weight }, db = pool) => {
    const { rows } = await db.query(
        `UPDATE workout_sets
         SET reps = COALESCE($1, reps),
             weight = COALESCE($2, weight)
         WHERE id = $3
           AND workout_exercise_id IN (
               SELECT we.id
               FROM workout_exercises we
               JOIN workouts w ON w.id = we.workout_id
               WHERE w.user_id = $4
           )
         RETURNING *`,
        [reps, weight, workoutSetId, userId]
    );
    return rows[0] || null;
};

export const remove = async ({ workoutSetId, userId }, db = pool) => {
    const { rowCount } = await db.query(
        `DELETE FROM workout_sets
         WHERE id = $1
           AND workout_exercise_id IN (
               SELECT we.id
               FROM workout_exercises we
               JOIN workouts w ON w.id = we.workout_id
               WHERE w.user_id = $2
           )`,
        [workoutSetId, userId]
    );
    return rowCount > 0;
};