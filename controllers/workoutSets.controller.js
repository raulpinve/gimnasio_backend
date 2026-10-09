import { throwNotFoundError } from '../errors/throwHTTPErrors.js';
import { pool } from '../initDB.js';
import * as workoutSetsRepository from '../repositories/workoutSets.repository.js';
import { snakeToCamel } from '../utils/utils.helper.js';

export const createWorkoutSet = async (req, res, next) => {
    const client = await pool.connect();

    try {
        const { id: userId } = req.user;
        const { workoutExerciseId, reps, weight, rpe, weightUnit } = req.body;

        await client.query("BEGIN");

        // 1. Verificar que el ejercicio es del usuario y bloquearlo mientras dure
        //    la transacción (evita números de serie repetidos)
        const owned = await workoutSetsRepository.lockOwnedWorkoutExercise(
            { workoutExerciseId, userId },
            client
        );
        if (!owned) {
            await client.query("ROLLBACK");
            return throwNotFoundError("Ejercicio del workout no encontrado.");
        }

        // 2. Calcular el siguiente número de serie
        const setNumber = await workoutSetsRepository.getNextSetNumber(
            { workoutExerciseId },
            client
        );

        // 3. Insertar la serie con su número secuencial
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
        const { id: userId } = req.user;
        // OJO: el param de la ruta se llama workoutExerciseId pero es el id del set
        const { workoutExerciseId: workoutSetId } = req.params;

        const workoutSet = await workoutSetsRepository.findById({ workoutSetId, userId });

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
        const { id: userId } = req.user;
        const { workoutExerciseId } = req.query;

        const workoutSets = await workoutSetsRepository.findAllByWorkoutExercise({
            workoutExerciseId,
            userId
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
        const { id: userId } = req.user;
        const { workoutSetId } = req.params;
        const { reps, weight } = req.body || {};

        const workoutSet = await workoutSetsRepository.update({
            workoutSetId,
            userId,
            reps,
            weight
        });

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
        const { id: userId } = req.user;
        const { workoutSetId } = req.params;

        const deleted = await workoutSetsRepository.remove({ workoutSetId, userId });

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