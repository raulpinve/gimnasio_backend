import { pool } from '../initDB.js';

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

export const findById = async ({ workoutSetId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT * FROM workout_sets WHERE id = $1`,
        [workoutSetId]
    );
    return rows[0] || null;
};

export const findAllByWorkoutExercise = async ({ workoutExerciseId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT ws.*
         FROM workout_sets ws
         JOIN workout_exercises we ON ws.workout_exercise_id = we.id
         WHERE we.id = $1
         ORDER BY ws.created_at ASC`,
        [workoutExerciseId]
    );
    return rows;
};

export const update = async ({ workoutSetId, reps, weight }, db = pool) => {
    const { rows } = await db.query(
        `UPDATE workout_sets
         SET reps = COALESCE($1, reps),
             weight = COALESCE($2, weight)
         WHERE id = $3
         RETURNING *`,
        [reps, weight, workoutSetId]
    );
    return rows[0] || null;
};

export const remove = async ({ workoutSetId }, db = pool) => {
    const { rowCount } = await db.query(
        `DELETE FROM workout_sets WHERE id = $1`,
        [workoutSetId]
    );
    return rowCount > 0;
};