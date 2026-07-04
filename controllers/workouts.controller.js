const { throwBadRequestError, throwNotFoundError, throwConflictError } = require("../errors/throwHTTPErrors");
const { snakeToCamel } = require("../utils/utils.helper");
const { pool } = require("../initDB");

exports.createWorkout = async (req, res, next) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        const { routineId, name } = req.body || {};
        const { id: userId } = req.user;
        const routine = req.routine; 

        const defaultName = routine?.name || "Entrenamiento libre";

        const { rows: rowsWorkout } = await client.query(
            `INSERT INTO workouts (name, user_id, routine_id, started_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING *`,
            [
                defaultName, 
                userId, 
                routineId || null 
            ]
        );

        await client.query("COMMIT");

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            data: snakeToCamel(rowsWorkout[0])
        });

    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
};

exports.getWorkout = async (req, res, next) => {
    try {
        const { workoutId } = req.params;

        const { rows } = await pool.query(
            `SELECT *,
                -- Determina si el entrenamiento está abierto o cerrado
                CASE 
                    WHEN finished_at IS NULL THEN 'abierto'
                    ELSE 'cerrado'
                END AS estado,

                -- Formatea la fecha en español: '23 de junio de 2026'
                to_char(started_at, 'DD "de" TMMonth "de" YYYY') AS fecha,
                
                -- Calcula la duración y la formatea dinámicamente
                CASE 
                    -- Si no ha terminado, la duración es nula o indeterminada
                    WHEN finished_at IS NULL THEN NULL
                    
                    -- Si dura menos de 1 hora, muestra solo los minutos: '20 min'
                    WHEN finished_at - started_at < interval '1 hour' 
                        THEN EXTRACT(MINUTE FROM (finished_at - started_at)) || ' min'
                    
                    -- Si dura 1 hora o más, muestra 'H:MMm' (ej. '1:20m')
                    ELSE 
                        EXTRACT(HOUR FROM (finished_at - started_at)) || ':' || 
                        to_char(EXTRACT(MINUTE FROM (finished_at - started_at)), 'FM00') || 'm'
                END AS duracion
             FROM workouts
             WHERE id = $1`,
            [workoutId]
        );

        if (rows.length === 0) {
            return throwNotFoundError("Workout no encontrado.");
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

exports.getAllWorkouts = async (req, res, next) => {
    try {
        const { id: userId } = req.user;
        if (!userId) {
            return throwBadRequestError("userId es requerido.");
        }

        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;

        const query = `
            SELECT w.*, r.name as routine_name,
                -- Determina si el entrenamiento está abierto o cerrado
                CASE 
                    WHEN w.finished_at IS NULL THEN 'abierto'
                    ELSE 'cerrado'
                END AS estado,

                -- Formatea la fecha en español: '23 de junio de 2026'
                to_char(w.started_at, 'DD "de" TMMonth "de" YYYY') AS fecha,
                
                -- Calcula la duración y la formatea dinámicamente
                CASE 
                    -- Si no ha terminado, la duración es nula o indeterminada
                    WHEN w.finished_at IS NULL THEN NULL
                    
                    -- Si dura menos de 1 hora, muestra solo los minutos: '20 min'
                    WHEN w.finished_at - w.started_at < interval '1 hour' 
                        THEN EXTRACT(MINUTE FROM (w.finished_at - w.started_at)) || ' min'
                    
                    -- Si dura 1 hora o más, muestra 'H:MMm' (ej. '1:20m')
                    ELSE 
                        EXTRACT(HOUR FROM (w.finished_at - w.started_at)) || ':' || 
                        to_char(EXTRACT(MINUTE FROM (w.finished_at - w.started_at)), 'FM00') || 'm'
                END AS duracion
            FROM workouts as w
            LEFT JOIN routines as r
            ON w.routine_id = r.id
            WHERE w.user_id = $1
            ORDER BY w.started_at DESC
            LIMIT $2 OFFSET $3
        `;

        const { rows } = await pool.query(query, [userId, pageSize, offset]);
        const { rows: totalRows } = await pool.query(
            `SELECT COUNT(*) FROM workouts WHERE user_id = $1`,
            [userId]
        );

        const totalRecords = parseInt(totalRows[0].count);
        const totalPages = Math.ceil(totalRecords / pageSize);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            pagination: {
                currentPage: page,
                totalPages,
                totalRecords
            },
            data: rows.map(snakeToCamel)
        });

    } catch (error) {
        next(error);
    }
};

exports.finishWorkout = async (req, res, next) => {
    const { workoutId } = req.params;
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 🟢 ESTÁNDAR DE LA INDUSTRIA: Se guarda el momento exacto del clic usando NOW()
        const resFinish = await client.query(
            `UPDATE workouts 
                SET finished_at = NOW() 
                WHERE id = $1 AND finished_at IS NULL
                RETURNING *;`,
            [workoutId]
        );

        if (resFinish.rowCount === 0) {
            return res.status(404).json({
                status: "error",
                message: "Workout no encontrado o ya finalizado anteriormente."
            });
        }

        await client.query("COMMIT");

        return res.status(200).json({
            status: "success",
            message: "Entrenamiento finalizado exitosamente al momento del clic.",
            data: resFinish.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
};



exports.deleteWorkout = async (req, res, next) => {
    try {
        const { workoutId } = req.params;
        const userId = req.user.id;

        // Borramos el workout (esto borrará sus ejercicios y sets por el CASCADE)
        const result = await pool.query(
            'DELETE FROM workouts WHERE id = $1 AND user_id = $2',
            [workoutId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ status: "error", message: "Entrenamiento no encontrado" });
        }

        res.status(200).json({ status: "success", message: "Entrenamiento eliminado" });
    } catch (error) {
        next(error);
    }
};