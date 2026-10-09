import {
    throwBadRequestError,
    throwNotFoundError,
    throwConflictError
} from '../errors/throwHTTPErrors.js';
import * as workoutExercisesRepository from '../repositories/workoutExercises.repository.js';
import { snakeToCamel } from '../utils/utils.helper.js';

export const createWorkoutExercise = async (req, res, next) => {
    try {
        const { id: userId } = req.user;
        const { workoutId, exerciseId } = req.body;

        let workoutExercise;
        try {
            workoutExercise = await workoutExercisesRepository.create({
                userId,
                workoutId,
                exerciseId
            });
        } catch (error) {
            // unique_violation: el ejercicio ya está en el workout
            if (error.code === '23505') {
                return throwConflictError(undefined, "Este ejercicio ya ha sido añadido a la sesión.");
            }
            throw error;
        }

        if (!workoutExercise) {
            return throwNotFoundError("Workout no encontrado.");
        }

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            data: snakeToCamel(workoutExercise)
        });
    } catch (error) {
        next(error);
    }
};

export const getWorkoutExercise = async (req, res, next) => {
    try {
        const { id: userId } = req.user;
        const { workoutExerciseId } = req.params;

        const workoutExercise = await workoutExercisesRepository.findById({
            workoutExerciseId,
            userId
        });

        if (!workoutExercise) {
            return throwNotFoundError("Workout exercise no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: workoutExercise // la query ya devuelve los alias en camelCase
        });
    } catch (error) {
        next(error);
    }
};

export const getWorkoutExercises = async (req, res, next) => {
    try {
        const { id: userId } = req.user;
        const { workoutId } = req.query;

        if (!workoutId) {
            return throwBadRequestError(undefined, "workoutId es requerido.");
        }

        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20; // 20 es buen valor para mobile
        const offset = (page - 1) * pageSize;

        const [workoutExercises, totalRecords] = await Promise.all([
            workoutExercisesRepository.findAllByWorkout({
                workoutId, userId, limit: pageSize, offset
            }),
            workoutExercisesRepository.countByWorkout({ workoutId, userId })
        ]);

        const totalPages = Math.ceil(totalRecords / pageSize);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            pagination: { currentPage: page, totalPages, totalRecords },
            data: workoutExercises.map(snakeToCamel)
        });
    } catch (error) {
        next(error);
    }
};

export const getWorkoutActiveExercises = async (req, res, next) => {
    try {
        const { id: userId } = req.user;
        const { workoutId } = req.query;

        if (!workoutId) {
            return throwBadRequestError(undefined, "workoutId es requerido.");
        }

        const exercises = await workoutExercisesRepository.findActiveByWorkout({
            workoutId,
            userId
        });

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: exercises // la query ya devuelve los alias en camelCase
        });
    } catch (error) {
        next(error);
    }
};

export const deleteWorkoutExercise = async (req, res, next) => {
    try {
        const { id: userId } = req.user;
        const { workoutExerciseId } = req.params;

        const deleted = await workoutExercisesRepository.remove({ workoutExerciseId, userId });

        if (!deleted) {
            return throwNotFoundError("Workout exercise no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Ejercicio eliminado del workout."
        });
    } catch (error) {
        next(error);
    }
};