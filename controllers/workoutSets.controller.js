import { throwNotFoundError } from '../errors/throwHTTPErrors.js';
import { pool } from '../initDB.js';
import * as workoutSetsRepository from '../repositories/workoutSets.repository.js';
import { snakeToCamel } from '../utils/utils.helper.js';

export const createWorkoutSet = async (req, res, next) => {
    const client = await pool.connect();

    try {
        const { workoutExerciseId, reps, weight, rpe, weightUnit } = req.body;

        await client.query("BEGIN");

        // 1. Calcular el siguiente número de serie
        const setNumber = await workoutSetsRepository.getNextSetNumber(
            { workoutExerciseId },
            client
        );

        // 2. Insertar la serie con su número secuencial
        const workoutSet = await workoutSetsRepository.create(
            { workoutExerciseId, setNumber, reps, weight, rpe, weightUnit },
            client
        );

        await client.query("COMMIT");

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            data: snakeToCamel(workoutSet)
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
        const { workoutExerciseId: workoutSetId } = req.params;

        const workoutSet = await workoutSetsRepository.findById({ workoutSetId });

        if (!workoutSet) {
            return throwNotFoundError("Set no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: snakeToCamel(workoutSet)
        });
    } catch (error) {
        next(error);
    }
};

export const getAllWorkoutSets = async (req, res, next) => {
    try {
        const { workoutExerciseId } = req.query;

        const workoutSets = await workoutSetsRepository.findAllByWorkoutExercise({
            workoutExerciseId
        });

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: workoutSets.map(snakeToCamel)
        });
    } catch (error) {
        next(error);
    }
};

export const updateWorkoutSet = async (req, res, next) => {
    try {
        const { workoutSetId } = req.params;
        const { reps, weight } = req.body || {};

        const workoutSet = await workoutSetsRepository.update({ workoutSetId, reps, weight });

        if (!workoutSet) {
            return throwNotFoundError("Set no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Set actualizado.",
            data: snakeToCamel(workoutSet)
        });
    } catch (error) {
        next(error);
    }
};

export const deleteWorkoutSet = async (req, res, next) => {
    try {
        const { workoutSetId } = req.params;

        const deleted = await workoutSetsRepository.remove({ workoutSetId });

        if (!deleted) {
            return throwNotFoundError("Set no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Set eliminado correctamente."
        });
    } catch (error) {
        next(error);
    }
};