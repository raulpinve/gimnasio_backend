import { pool } from '../initDB.js';

/**
 * Repository de cardio_logs.
 * Solo acceso a datos; todos los métodos aceptan un `db` opcional
 * (pool por defecto, o un client si se está dentro de una transacción).
 *
 * Un registro de cardio solo es accesible si su workout_exercise pertenece
 * a un workout del usuario.
 */

// Devuelve null si el workout_exercise no existe o no pertenece al usuario
export const create = async (
    { userId, workoutExerciseId, durationSeconds, distanceKm, calories, avgHeartRate },
    db = pool
) => {
    const { rowCount } = await db.query(
        `SELECT 1
         FROM workout_exercises we
         JOIN workouts w ON w.id = we.workout_id
         WHERE we.id = $1 AND w.user_id = $2`,
        [workoutExerciseId, userId]
    );
    if (rowCount === 0) return null;

    const { rows } = await db.query(
        `INSERT INTO cardio_logs (
            workout_exercise_id,
            duration_seconds,
            distance_km,
            calories,
            avg_heart_rate
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [workoutExerciseId, durationSeconds, distanceKm, calories, avgHeartRate]
    );
    return rows[0];
};

export const findById = async ({ cardioLogId, userId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT cl.*
         FROM cardio_logs cl
         JOIN workout_exercises we ON we.id = cl.workout_exercise_id
         JOIN workouts w ON w.id = we.workout_id
         WHERE cl.id = $1 AND w.user_id = $2`,
        [cardioLogId, userId]
    );
    return rows[0] || null;
};

// Si el workout_exercise no es del usuario, devuelve una lista vacía
export const findAllByWorkoutExercise = async ({ workoutExerciseId, userId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT cl.*
         FROM cardio_logs cl
         JOIN workout_exercises we ON cl.workout_exercise_id = we.id
         JOIN workouts w ON w.id = we.workout_id
         WHERE we.id = $1 AND w.user_id = $2
         ORDER BY cl.created_at ASC`,
        [workoutExerciseId, userId]
    );
    return rows;
};

export const update = async (
    { cardioLogId, userId, durationSeconds, distanceKm, calories, avgHeartRate },
    db = pool
) => {
    const { rows } = await db.query(
        `UPDATE cardio_logs
         SET duration_seconds = COALESCE($1, duration_seconds),
             distance_km = COALESCE($2, distance_km),
             calories = COALESCE($3, calories),
             avg_heart_rate = COALESCE($4, avg_heart_rate)
         WHERE id = $5
           AND workout_exercise_id IN (
               SELECT we.id
               FROM workout_exercises we
               JOIN workouts w ON w.id = we.workout_id
               WHERE w.user_id = $6
           )
         RETURNING *`,
        [durationSeconds, distanceKm, calories, avgHeartRate, cardioLogId, userId]
    );
    return rows[0] || null;
};

export const remove = async ({ cardioLogId, userId }, db = pool) => {
    const { rowCount } = await db.query(
        `DELETE FROM cardio_logs
         WHERE id = $1
           AND workout_exercise_id IN (
               SELECT we.id
               FROM workout_exercises we
               JOIN workouts w ON w.id = we.workout_id
               WHERE w.user_id = $2
           )`,
        [cardioLogId, userId]
    );
    return rowCount > 0;
};