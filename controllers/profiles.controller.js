import {
    throwBadRequestError,
    throwNotFoundError
} from '../errors/throwHTTPErrors.js';
import { pool } from '../initDB.js';
import * as profilesRepository from '../repositories/profiles.repository.js';
import { getTemplateById } from '../utils/programTemplates.helper.js';
import { snakeToCamel } from '../utils/utils.helper.js';

export const getMyProfile = async (req, res, next) => {
    try {
        const { id: userId } = req.user || {};

        const profile = await profilesRepository.findByUserId({ userId });

        if (!profile) {
            return throwNotFoundError("El usuario no tiene perfil de entrenamiento.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: snakeToCamel(profile)
        });
    } catch (error) {
        next(error);
    }
};

export const upsertMyProfile = async (req, res, next) => {
    try {
        const { id: userId } = req.user || {};
        const {
            goal,
            experience = 'principiante',
            daysPerWeek = null,
            sessionMinutes = null,
            availableEquipment = []
        } = req.body;

        const profile = await profilesRepository.upsert({
            userId,
            goal,
            experience,
            daysPerWeek,
            sessionMinutes,
            availableEquipment
        });

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Perfil guardado exitosamente.",
            data: snakeToCamel(profile)
        });
    } catch (error) {
        next(error);
    }
};

// Solo lectura: devuelve el programa que mejor encaja con el perfil, SIN asignarlo
export const getMyRecommendation = async (req, res, next) => {
    try {
        const { id: userId } = req.user || {};

        const hasProfile = await profilesRepository.existsByUserId({ userId });
        if (!hasProfile) {
            return throwBadRequestError("Primero debes completar tu perfil de entrenamiento.");
        }

        const templateId = await profilesRepository.findRecommendedTemplateId({ userId });
        if (!templateId) {
            return throwNotFoundError(
                "Aún no tenemos un programa para tu combinación. Puedes crear tu rutina manualmente."
            );
        }

        const template = await getTemplateById(pool, templateId);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: snakeToCamel(template)
        });
    } catch (error) {
        next(error);
    }
};