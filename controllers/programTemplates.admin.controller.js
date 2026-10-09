import { throwNotFoundError } from '../errors/throwHTTPErrors.js';
import { pool } from '../initDB.js';
import * as programTemplatesRepository from '../repositories/programTemplates.repository.js';
import { getTemplateById } from '../utils/programTemplates.helper.js';
import { snakeToCamel } from '../utils/utils.helper.js';

export const getAllTemplates = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;

        const name = req.query.name || null;
        const goal = req.query.goal || null;
        const experience = req.query.experience || null;

        const [templates, totalRecords] = await Promise.all([
            programTemplatesRepository.findAll({
                name, goal, experience, limit: pageSize, offset
            }),
            programTemplatesRepository.count({ name, goal, experience })
        ]);

        const totalPages = Math.ceil(totalRecords / pageSize);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            pagination: { currentPage: page, totalPages, totalRecords },
            data: templates.map(snakeToCamel)
        });
    } catch (error) {
        next(error);
    }
};

export const getTemplate = async (req, res, next) => {
    try {
        const { templateId } = req.params;

        const template = await getTemplateById(pool, templateId);
        if (!template) {
            return throwNotFoundError("Programa no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: snakeToCamel(template)
        });
    } catch (error) {
        next(error);
    }
};

export const createTemplate = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const {
            name, goal, experience = 'principiante', daysPerWeek,
            requiredEquipment = [], description = null, routines
        } = req.body;

        await client.query('BEGIN');

        const templateId = await programTemplatesRepository.create(
            { name, goal, experience, daysPerWeek, requiredEquipment, description },
            client
        );

        await programTemplatesRepository.insertRoutines({ templateId, routines }, client);

        // Se lee dentro de la transacción para ver lo recién insertado
        const template = await getTemplateById(client, templateId);

        await client.query('COMMIT');

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            message: "Programa creado exitosamente.",
            data: snakeToCamel(template)
        });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

// Reemplaza el programa completo: actualiza la ficha y recrea rutinas y ejercicios
export const replaceTemplate = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { templateId } = req.params;
        const {
            name, goal, experience = 'principiante', daysPerWeek,
            requiredEquipment = [], description = null, routines
        } = req.body;

        await client.query('BEGIN');

        const updated = await programTemplatesRepository.update(
            { templateId, name, goal, experience, daysPerWeek, requiredEquipment, description },
            client
        );

        if (!updated) {
            await client.query('ROLLBACK');
            return throwNotFoundError("Programa no encontrado.");
        }

        await programTemplatesRepository.removeRoutines({ templateId }, client);
        await programTemplatesRepository.insertRoutines({ templateId, routines }, client);

        const template = await getTemplateById(client, templateId);

        await client.query('COMMIT');

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Programa actualizado exitosamente.",
            data: snakeToCamel(template)
        });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

export const deleteTemplate = async (req, res, next) => {
    try {
        const { templateId } = req.params;

        const deleted = await programTemplatesRepository.remove({ templateId });

        if (!deleted) {
            return throwNotFoundError("Programa no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Programa eliminado exitosamente."
        });
    } catch (error) {
        next(error);
    }
};