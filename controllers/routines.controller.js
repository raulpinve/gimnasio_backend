const { throwBadRequestError, throwNotFoundError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");
const { snakeToCamel } = require("../utils/utils.helper");

exports.createRoutine = async (req, res, next) => {
    try {
        const { name } = req.body;
        const { id: userId } = req.user || {};

        if (!userId) {
            return throwBadRequestError("El userId es requerido.");
        }

        if (!name) {
            return throwBadRequestError("El nombre es requerido.");
        }

        const { rows } = await pool.query(
            `INSERT INTO routines (user_id, name)
             VALUES ($1, $2)
             RETURNING id, name`,
            [
                userId,
                name
            ]
        );

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            data: snakeToCamel(rows[0])
        });

    } catch (error) {
        next(error);
    }
};

exports.getRoutine = async (req, res, next) => {
    try {
        const { routineId } = req.params;

        const { rows } = await pool.query(
            `SELECT r.id, r.name,
                    COALESCE(
                        JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'id', e.id,
                                'name', e.name,
                                'target_sets', re.target_sets,
                                'target_reps', re.target_reps
                            )
                        ) FILTER (WHERE e.id IS NOT NULL), 
                        '[]'
                    ) as exercises
             FROM routines r
             LEFT JOIN routine_exercises re ON r.id = re.routine_id
             LEFT JOIN exercises e ON re.exercise_id = e.id
             WHERE r.id = $1
             GROUP BY r.id`,
            [routineId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Rutina no encontrada." });
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: snakeToCamel(rows[0])
        });
    } catch (error) {
        next(error);
    }
};


exports.getAllRoutines = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;

        const name = req.query.name || null;
        const userId = req.query.userId || null;

        const query = `
            SELECT r.id, r.name,
                   COALESCE(
                       JSON_AGG(JSON_BUILD_OBJECT('name', e.name)) FILTER (WHERE e.id IS NOT NULL), 
                       '[]'
                   ) as exercises
            FROM routines r
            LEFT JOIN routine_exercises re ON r.id = re.routine_id
            LEFT JOIN exercises e ON re.exercise_id = e.id
            WHERE ($1::text IS NULL OR r.name ILIKE '%' || $1 || '%')
              AND ($2::uuid IS NULL OR r.user_id = $2)
            GROUP BY r.id
            ORDER BY r.name
            LIMIT $3 OFFSET $4
        `;

        const { rows } = await pool.query(query, [name, userId, pageSize, offset]);
        const { rows: totalRows } = await pool.query(
            `SELECT COUNT(*) FROM routines WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%') AND ($2::uuid IS NULL OR user_id = $2)`,
            [name, userId]
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


exports.updateRoutine = async (req, res, next) => {
    try {
        const { routineId } = req.params;
        const { name } = req.body || {};

        if (!name) {
            return throwBadRequestError("Debe enviar al menos un campo para actualizar.");
        }

        const { rows } = await pool.query(
            `UPDATE routines
             SET name = COALESCE($1, name)
             WHERE id = $2
             RETURNING id, user_id, name`,
            [name, routineId]
        );

        if (rows.length === 0) {
            return throwNotFoundError("Rutina no encontrada.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Rutina actualizada exitosamente.",
            data: snakeToCamel(rows[0])
        });

    } catch (error) {
        next(error);
    }
};

exports.deleteRoutine = async (req, res, next) => {
    try {
        const { routineId } = req.params;
        const { rowCount } = await pool.query(
            `DELETE FROM routines WHERE id = $1`,
            [routineId]
        );

        if (rowCount === 0) {
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
