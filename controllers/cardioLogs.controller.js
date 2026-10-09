import { throwNotFoundError } from '../errors/throwHTTPErrors.js';
import * as cardioLogsRepository from '../repositories/cardioLogs.repository.js';
import { snakeToCamel } from '../utils/utils.helper.js';

export const createCardioLog = async (req, res, next) => {
    try {
        const { id: userId } = req.user;
        const {
            workoutExerciseId,
            durationSeconds,
            distanceKm,
            calories,
            avgHeartRate
        } = req.body;

        const cardioLog = await cardioLogsRepository.create({
            userId,
            workoutExerciseId,
            durationSeconds,
            distanceKm,
            calories,
            avgHeartRate
        });

        if (!cardioLog) {
            return throwNotFoundError("Ejercicio del workout no encontrado.");
        }

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            data: snakeToCamel(cardioLog)
        });
    } catch (error) {
        next(error);
    }
};

export const getCardioLog = async (req, res, next) => {
    try {
        const { id: userId } = req.user;
        const { cardioLogId } = req.params;

        const cardioLog = await cardioLogsRepository.findById({ cardioLogId, userId });

        if (!cardioLog) {
            return throwNotFoundError("Registro de cardio no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: snakeToCamel(cardioLog)
        });
    } catch (error) {
        next(error);
    }
};

export const getAllCardioLogs = async (req, res, next) => {
    try {
        const { id: userId } = req.user;
        const { workoutExerciseId } = req.query;

        const cardioLogs = await cardioLogsRepository.findAllByWorkoutExercise({
            workoutExerciseId,
            userId
        });

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: cardioLogs.map(snakeToCamel)
        });
    } catch (error) {
        next(error);
    }
};

export const updateCardioLog = async (req, res, next) => {
    try {
        const { id: userId } = req.user;
        const { cardioLogId } = req.params;
        const { durationSeconds, distanceKm, calories, avgHeartRate } = req.body || {};

        const cardioLog = await cardioLogsRepository.update({
            cardioLogId,
            userId,
            durationSeconds,
            distanceKm,
            calories,
            avgHeartRate
        });

        if (!cardioLog) {
            return throwNotFoundError("Registro de cardio no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Cardio actualizado.",
            data: snakeToCamel(cardioLog)
        });
    } catch (error) {
        next(error);
    }
};

export const deleteCardioLog = async (req, res, next) => {
    try {
        const { id: userId } = req.user;
        const { cardioLogId } = req.params;

        const deleted = await cardioLogsRepository.remove({ cardioLogId, userId });

        if (!deleted) {
            return throwNotFoundError("Registro de cardio no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Registro de cardio eliminado exitosamente."
        });
    } catch (error) {
        next(error);
    }
};