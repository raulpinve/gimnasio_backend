import { throwNotFoundError } from '../errors/throwHTTPErrors.js';
import * as cardioLogsRepository from '../repositories/cardioLogs.repository.js';
import { snakeToCamel } from '../utils/utils.helper.js';

export const createCardioLog = async (req, res, next) => {
    try {
        const {
            workoutExerciseId,
            durationSeconds,
            distanceKm,
            calories,
            avgHeartRate
        } = req.body;

        const cardioLog = await cardioLogsRepository.create({
            workoutExerciseId,
            durationSeconds,
            distanceKm,
            calories,
            avgHeartRate
        });

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
        const { cardioLogId } = req.params;

        const cardioLog = await cardioLogsRepository.findById({ cardioLogId });

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
        const { workoutExerciseId } = req.query;

        const cardioLogs = await cardioLogsRepository.findAllByWorkoutExercise({
            workoutExerciseId
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
        const { cardioLogId } = req.params;
        const { durationSeconds, distanceKm, calories, avgHeartRate } = req.body || {};

        const cardioLog = await cardioLogsRepository.update({
            cardioLogId,
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
        const { cardioLogId } = req.params;

        const deleted = await cardioLogsRepository.remove({ cardioLogId });

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