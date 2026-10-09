import {
    throwBadRequestError,
    throwNotFoundError
} from '../errors/throwHTTPErrors.js';
import * as routinesRepository from '../repositories/routines.repository.js';
import { snakeToCamel } from '../utils/utils.helper.js';

export const createRoutine = async (req, res, next) => {
    try {
        const { name } = req.body;
        const { id: userId } = req.user || {};

        if (!userId) {
            return throwBadRequestError("El userId es requerido.");
        }

        if (!name) {
            return throwBadRequestError("El nombre es requerido.");
        }

        const routine = await routinesRepository.create({ userId, name });

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            data: snakeToCamel(routine)
        });
    } catch (error) {
        next(error);
    }
};

export const getRoutine = async (req, res, next) => {
    try {
        const { routineId } = req.params;

        const routine = await routinesRepository.findByIdAndUser({
            routineId,
            userId: req.user.id
        });

        if (!routine) {
            return throwNotFoundError("Rutina no encontrada.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: snakeToCamel(routine)
        });
    } catch (error) {
        next(error);
    }
};

export const getAllRoutines = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;

        const name = req.query.name || null;
        const userId = req.user.id;

        const [routines, totalRecords] = await Promise.all([
            routinesRepository.findAll({ name, userId, limit: pageSize, offset }),
            routinesRepository.count({ name, userId })
        ]);

        const totalPages = Math.ceil(totalRecords / pageSize);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            pagination: { currentPage: page, totalPages, totalRecords },
            data: routines.map(snakeToCamel)
        });
    } catch (error) {
        next(error);
    }
};

export const updateRoutine = async (req, res, next) => {
    try {
        const { routineId } = req.params;
        const { name } = req.body || {};

        if (!name) {
            return throwBadRequestError("Debe enviar al menos un campo para actualizar.");
        }

        const routine = await routinesRepository.update({
            routineId,
            userId: req.user.id,
            name
        });

        if (!routine) {
            return throwNotFoundError("Rutina no encontrada.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Rutina actualizada exitosamente.",
            data: snakeToCamel(routine)
        });
    } catch (error) {
        next(error);
    }
};

export const deleteRoutine = async (req, res, next) => {
    try {
        const { routineId } = req.params;

        const deleted = await routinesRepository.remove({
            routineId,
            userId: req.user.id
        });

        if (!deleted) {
            return throwNotFoundError("Rutina no encontrada.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Rutina eliminada exitosamente."
        });
    } catch (error) {
        next(error);
    }
};