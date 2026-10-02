import { throwNotFoundError } from '../errors/throwHTTPErrors.js';
import { pool } from '../initDB.js';
import { snakeToCamel } from '../utils/utils.helper.js';

export const createWorkoutSet = async (req, res, next) => {
    const client = await pool.connect();

    try {
        const { workoutExerciseId, reps, weight, rpe, weightUnit } = req.body;

        await client.query("BEGIN");

        // 2. Calculate the next set number
        // We count how many there are and add 1
        const { rows: countRows } = await client.query(
            `SELECT COALESCE(MAX(set_number), 0) + 1 as next_set
             FROM workout_sets
             WHERE workout_exercise_id = $1`,
            [workoutExerciseId]
        );

        const nextSetNumber = countRows[0].next_set;

        // 3. Insert the set with its sequential number
        const { rows: setRows } = await client.query(
            `INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight, rpe, weight_unit )
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [workoutExerciseId, nextSetNumber, reps, weight, rpe, weightUnit || 'kg' ]
        );

        await client.query("COMMIT");

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            data: snakeToCamel(setRows[0])
        });

    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
};

export const getWorkoutSet = async (req, res, next) => {
    try {
        const { workoutExerciseId } = req.params;

        const { rows } = await pool.query(
            `SELECT *
             FROM workout_sets
             WHERE id = $1`,
            [workoutExerciseId]
        );

        if (rows.length === 0) {
            return throwNotFoundError("Set no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: snakeToCamel(rows[0])
        });

    } catch (error) {
        next(error);
    }
};

export const getAllWorkoutSets = async (req, res, next) => {
    try {
        const { workoutExerciseId } = req.query;
        const { rows } = await pool.query(
            `SELECT ws.* 
                FROM workout_sets ws
                JOIN workout_exercises we ON ws.workout_exercise_id = we.id
                WHERE we.id = $1
                ORDER BY ws.created_at ASC;
            `, [
            workoutExerciseId
        ]);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: rows.map(snakeToCamel)
        });

    } catch (error) {
        next(error);
    }
};

export const updateWorkoutSet = async (req, res, next) => {
    try {
        const { workoutSetId } = req.params;

        const { reps, weight } = req.body || {};

        const { rows } = await pool.query(
            `UPDATE workout_sets
             SET 
                reps = COALESCE($1, reps),
                weight = COALESCE($2, weight)
             WHERE id = $3
             RETURNING *`,
            [
                reps,
                weight,
                workoutSetId
            ]
        );

        if (rows.length === 0) {
            return throwNotFoundError("Set no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Set actualizado.",
            data: snakeToCamel(rows[0])
        });

    } catch (error) {
        next(error);
    }
};

export const deleteWorkoutSet = async (req, res, next) => {

    const client = await pool.connect();
    
    try {
        const { workoutSetId } = req.params;
        await client.query("BEGIN");

        // 1. Get the parent anchor ID before deleting the set
        const { rows: setRows } = await client.query(
            "SELECT workout_exercise_id FROM workout_sets WHERE id = $1",
            [workoutSetId]
        );

        if (setRows.length === 0) return throwNotFoundError("Ejercicio no encontrado.");


        // 2. Delete the specific workout set
        await client.query("DELETE FROM workout_sets WHERE id = $1", [workoutSetId]);
        await client.query("COMMIT");

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Set eliminado correctamente."
        });

    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
};
