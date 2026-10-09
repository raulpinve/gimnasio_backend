import {
    throwBadRequestError,
    throwNotFoundError
} from '../errors/throwHTTPErrors.js';
import { pool } from '../initDB.js';
import * as routineExercisesRepository from '../repositories/routineExercises.repository.js';
import { snakeToCamel } from '../utils/utils.helper.js';

export const createRoutineExercise = async (req, res, next) => {
    try {
        const {
            routineId,
            exerciseId,
            targetSets,
            targetReps,
            targetWeight,
            targetDurationSeconds,
            targetDistanceKm
        } = req.body;

        if (!routineId || !exerciseId) {
            return throwBadRequestError("routineId y exerciseId son requeridos.");
        }

        const routineExercise = await routineExercisesRepository.create({
            routineId,
            exerciseId,
            targetSets,
            targetReps,
            targetWeight,
            targetDurationSeconds,
            targetDistanceKm
        });

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            data: snakeToCamel(routineExercise)
        });
    } catch (error) {
        // unique_violation: el ejercicio ya está en la rutina
        if (error.code === '23505') {
            return res.status(400).json({
                status: "error",
                message: "Este ejercicio ya existe en la rutina."
            });
        }
        next(error);
    }
};

export const getRoutineExercise = async (req, res, next) => {
    try {
        const { routineExerciseId } = req.params;

        const routineExercise = await routineExercisesRepository.findById({ routineExerciseId });

        if (!routineExercise) {
            return throwNotFoundError("Ejercicio de rutina no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: snakeToCamel(routineExercise)
        });
    } catch (error) {
        next(error);
    }
};

export const getRoutineExercises = async (req, res, next) => {
    try {
        const { routineId } = req.params;

        if (!routineId) {
            return throwBadRequestError("routineId es requerido.");
        }

        const routineExercises = await routineExercisesRepository.findAllByRoutine({ routineId });

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: routineExercises.map(snakeToCamel)
        });
    } catch (error) {
        next(error);
    }
};

export const updateRoutineExercise = async (req, res, next) => {
    try {
        const { routineExerciseId } = req.params;
        const {
            targetSets,
            targetReps,
            targetWeight,
            targetDurationSeconds,
            targetDistanceKm
        } = req.body || {};

        const routineExercise = await routineExercisesRepository.update({
            routineExerciseId,
            targetSets,
            targetReps,
            targetWeight,
            targetDurationSeconds,
            targetDistanceKm
        });

        if (!routineExercise) {
            return throwNotFoundError("Ejercicio de rutina no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Ejercicio de rutina actualizado.",
            data: snakeToCamel(routineExercise)
        });
    } catch (error) {
        next(error);
    }
};

export const deleteRoutineExercise = async (req, res, next) => {
    try {
        const { routineExerciseId } = req.params;

        const deleted = await routineExercisesRepository.remove({ routineExerciseId });

        if (!deleted) {
            return throwNotFoundError("Ejercicio de rutina no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Ejercicio de rutina eliminado."
        });
    } catch (error) {
        next(error);
    }
};

// Actualiza los pesos de una rutina basados en el progreso del workout
export const updateRoutineProgress = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { routineId } = req.params;
        const { updates } = req.body; // Array de { exerciseId, newWeight }

        await client.query("BEGIN");

        for (const { exerciseId, newWeight } of updates) {
            await routineExercisesRepository.updateWeight(
                { routineId, exerciseId, newWeight },
                client // mismo client => misma transacción
            );
        }

        await client.query("COMMIT");

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Rutina actualizada correctamente"
        });
    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
};