import { throwNotFoundError } from '../errors/throwHTTPErrors.js';
import { pool } from '../initDB.js';
import { snakeToCamel } from '../utils/utils.helper.js';
import { getTemplateById } from '../utils/programTemplates.helper.js';

// Inserta rutinas y ejercicios. El order_index sale de la posición en el arreglo.
const insertRoutines = async (client, templateId, routines) => {
    for (const [i, routine] of routines.entries()) {
        const { rows } = await client.query(
            `INSERT INTO program_template_routines (template_id, order_index, name)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [templateId, i + 1, routine.name]
        );
        const templateRoutineId = rows[0].id;

        for (const [j, ex] of routine.exercises.entries()) {
            await client.query(
                `INSERT INTO program_template_routine_exercises
                    (template_routine_id, exercise_id, order_index, target_sets, target_reps,
                     target_weight, target_duration_seconds, target_distance_km)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    templateRoutineId,
                    ex.exerciseId,
                    j + 1,
                    ex.targetSets ?? null,
                    ex.targetReps ?? null,
                    ex.targetWeight ?? null,
                    ex.targetDurationSeconds ?? null,
                    ex.targetDistanceKm ?? null
                ]
            );
        }
    }
};

export const getAllTemplates = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;

        const name = req.query.name || null;
        const goal = req.query.goal || null;
        const experience = req.query.experience || null;

        const filters = `
            WHERE ($1::text IS NULL OR t.name ILIKE '%' || $1 || '%')
              AND ($2::text IS NULL OR t.goal = $2)
              AND ($3::text IS NULL OR t.experience = $3)
        `;

        const { rows } = await pool.query(
            `SELECT t.id, t.name, t.goal, t.experience, t.days_per_week,
                    t.required_equipment, t.description,
                    COUNT(ptr.id)::int AS routines_count
             FROM program_templates t
             LEFT JOIN program_template_routines ptr ON ptr.template_id = t.id
             ${filters}
             GROUP BY t.id
             ORDER BY t.goal, t.experience, t.days_per_week, t.name
             LIMIT $4 OFFSET $5`,
            [name, goal, experience, pageSize, offset]
        );

        const { rows: totalRows } = await pool.query(
            `SELECT COUNT(*) FROM program_templates t ${filters}`,
            [name, goal, experience]
        );

        const totalRecords = parseInt(totalRows[0].count);
        const totalPages = Math.ceil(totalRecords / pageSize);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            pagination: { currentPage: page, totalPages, totalRecords },
            data: rows.map(snakeToCamel)
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

        const { rows } = await client.query(
            `INSERT INTO program_templates
                (name, goal, experience, days_per_week, required_equipment, description)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [name, goal, experience, daysPerWeek, requiredEquipment, description]
        );
        const templateId = rows[0].id;

        await insertRoutines(client, templateId, routines);

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

        await client.query(
            `UPDATE program_templates
             SET name = $1, goal = $2, experience = $3, days_per_week = $4,
                 required_equipment = $5, description = $6
             WHERE id = $7`,
            [name, goal, experience, daysPerWeek, requiredEquipment, description, templateId]
        );

        // ON DELETE CASCADE borra también los ejercicios de esas rutinas
        await client.query(
            `DELETE FROM program_template_routines WHERE template_id = $1`,
            [templateId]
        );

        await insertRoutines(client, templateId, routines);

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

        // Las rutinas que ya recibieron los usuarios se conservan (template_id pasa a NULL)
        const { rowCount } = await pool.query(
            `DELETE FROM program_templates WHERE id = $1`,
            [templateId]
        );

        if (rowCount === 0) {
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