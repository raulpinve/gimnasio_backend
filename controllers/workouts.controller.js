import {
    throwBadRequestError,
    throwNotFoundError,
} from '../errors/throwHTTPErrors.js';
import { pool } from '../initDB.js';
import * as workoutsRepository from '../repositories/workout.repository.js';
import { snakeToCamel } from '../utils/utils.helper.js';

export const createWorkout = async (req, res, next) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const { routineId } = req.body || {};
        const { id: userId } = req.user;
        const routine = req.routine;

        const defaultName = routine?.name || "Entrenamiento libre";

        // 1. Verificar si hay workouts abiertos
        const activeWorkout = await workoutsRepository.findActiveByUser({ userId }, client);
        if (activeWorkout) {
            await client.query("ROLLBACK");
            return throwBadRequestError(
                undefined,
                "No se puede crear el workout porque ya tienes uno en curso."
            );
        }

        // 2. Crear el workout principal
        const workout = await workoutsRepository.create(
            { name: defaultName, userId, routineId },
            client
        );

        // 3. Si viene de una rutina, copiar sus ejercicios al workout
        if (routine && routineId) {
            await workoutsRepository.copyExercisesFromRoutine(
                { workoutId: workout.id, routineId },
                client
            );
        }

        await client.query("COMMIT");

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            data: snakeToCamel(workout)
        });
    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
};

export const getWorkout = async (req, res, next) => {
    try {
        const { workoutId } = req.params;
        const { id: userId } = req.user;

        const workout = await workoutsRepository.findByIdAndUser({ workoutId, userId });

        if (!workout) {
            return throwNotFoundError("Workout no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: snakeToCamel(workout)
        });
    } catch (error) {
        next(error);
    }
};

export const getWorkoutActive = async (req, res, next) => {
    try {
        const { id: userId } = req.user;

        if (!userId) {
            return throwBadRequestError("userId es requerido.");
        }

        const workout = await workoutsRepository.findActiveByUser({ userId });

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: workout ? snakeToCamel(workout) : null
        });
    } catch (error) {
        next(error);
    }
};

export const getAllWorkouts = async (req, res, next) => {
    try {
        const { id: userId } = req.user;

        if (!userId) {
            return throwBadRequestError("userId es requerido.");
        }

        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const routineId = req.query.routineId || null;
        const offset = (page - 1) * pageSize;

        const [workouts, totalRecords] = await Promise.all([
            workoutsRepository.findAll({ userId, routineId, limit: pageSize, offset }),
            workoutsRepository.count({ userId, routineId })
        ]);

        const totalPages = Math.ceil(totalRecords / pageSize);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            pagination: { currentPage: page, totalPages, totalRecords },
            data: workouts.map(snakeToCamel)
        });
    } catch (error) {
        next(error);
    }
};

export const finishWorkout = async (req, res, next) => {
    const { workoutId } = req.params;
    const { id: userId } = req.user;
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Validar que todos los ejercicios tengan al menos un registro
        const incompleteExercises = await workoutsRepository.findExercisesWithoutLogs(
            { workoutId, userId },
            client
        );

        if (incompleteExercises.length > 0) {
            await client.query("ROLLBACK");
            return throwBadRequestError(
                undefined,
                "Debes registrar al menos una serie o un registro de cardio en todos los ejercicios antes de finalizar el entrenamiento."
            );
        }

        const workout = await workoutsRepository.finish({ workoutId, userId }, client);

        if (!workout) {
            await client.query("ROLLBACK");
            return throwNotFoundError("Workout no encontrado o ya finalizado.");
        }

        await client.query("COMMIT");

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Entrenamiento finalizado exitosamente.",
            data: snakeToCamel(workout)
        });
    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
};

export const deleteWorkout = async (req, res, next) => {
    try {
        const { workoutId } = req.params;
        const { id: userId } = req.user;

        const deleted = await workoutsRepository.remove({ workoutId, userId });

        if (!deleted) {
            return throwNotFoundError("Entrenamiento no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Entrenamiento eliminado"
        });
    } catch (error) {
        next(error);
    }
};