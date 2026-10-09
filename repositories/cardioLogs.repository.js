import { pool } from '../initDB.js';

/**
 * Repository de cardio_logs.
 * Solo acceso a datos; todos los métodos aceptan un `db` opcional
 * (pool por defecto, o un client si se está dentro de una transacción).
 */

export const create = async (
    { workoutExerciseId, durationSeconds, distanceKm, calories, avgHeartRate },
    db = pool
) => {
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

export const findById = async ({ cardioLogId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT * FROM cardio_logs WHERE id = $1`,
        [cardioLogId]
    );
    return rows[0] || null;
};

export const findAllByWorkoutExercise = async ({ workoutExerciseId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT cl.*
         FROM cardio_logs cl
         JOIN workout_exercises we ON cl.workout_exercise_id = we.id
         WHERE we.id = $1
         ORDER BY cl.created_at ASC`,
        [workoutExerciseId]
    );
    return rows;
};

export const update = async (
    { cardioLogId, durationSeconds, distanceKm, calories, avgHeartRate },
    db = pool
) => {
    const { rows } = await db.query(
        `UPDATE cardio_logs
         SET duration_seconds = COALESCE($1, duration_seconds),
             distance_km = COALESCE($2, distance_km),
             calories = COALESCE($3, calories),
             avg_heart_rate = COALESCE($4, avg_heart_rate)
         WHERE id = $5
         RETURNING *`,
        [durationSeconds, distanceKm, calories, avgHeartRate, cardioLogId]
    );
    return rows[0] || null;
};

export const remove = async ({ cardioLogId }, db = pool) => {
    const { rowCount } = await db.query(
        `DELETE FROM cardio_logs WHERE id = $1`,
        [cardioLogId]
    );
    return rowCount > 0;
};