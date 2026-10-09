import { pool } from '../initDB.js';

/**
 * Repository de rutinas.
 * Solo contiene acceso a datos: no conoce req/res ni lanza errores HTTP.
 * Todos los métodos reciben un `db` opcional (por defecto el pool) para
 * poder reutilizarlos dentro de una transacción con un client.
 */

export const create = async ({ userId, name }, db = pool) => {
    const { rows } = await db.query(
        `INSERT INTO routines (user_id, name)
         VALUES ($1, $2)
         RETURNING id, name`,
        [userId, name]
    );
    return rows[0];
};

export const findByIdAndUser = async ({ routineId, userId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT r.id, r.name, r.source, r.template_id,
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', e.id,
                            'name', e.name,
                            'type', e.type,
                            'order_index', re.order_index,
                            'target_sets', re.target_sets,
                            'target_reps', re.target_reps,
                            'target_weight', re.target_weight,
                            'target_duration_seconds', re.target_duration_seconds,
                            'target_distance_km', re.target_distance_km
                        ) ORDER BY re.order_index
                    ) FILTER (WHERE e.id IS NOT NULL),
                    '[]'
                ) AS exercises
         FROM routines r
         LEFT JOIN routine_exercises re ON r.id = re.routine_id
         LEFT JOIN exercises e ON re.exercise_id = e.id
         WHERE r.id = $1 AND r.user_id = $2
         GROUP BY r.id`,
        [routineId, userId]
    );
    return rows[0] || null;
};

export const findAll = async ({ name, userId, limit, offset }, db = pool) => {
    const { rows } = await db.query(
        `SELECT r.id, r.name,
                COALESCE(
                    JSON_AGG(JSON_BUILD_OBJECT('name', e.name))
                        FILTER (WHERE e.id IS NOT NULL),
                    '[]'
                ) AS exercises
         FROM routines r
         LEFT JOIN routine_exercises re ON r.id = re.routine_id
         LEFT JOIN exercises e ON re.exercise_id = e.id
         WHERE ($1::text IS NULL OR r.name ILIKE '%' || $1 || '%')
           AND ($2::uuid IS NULL OR r.user_id = $2)
         GROUP BY r.id
         ORDER BY r.name
         LIMIT $3 OFFSET $4`,
        [name, userId, limit, offset]
    );
    return rows;
};

export const count = async ({ name, userId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT COUNT(*) FROM routines
         WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')
           AND ($2::uuid IS NULL OR user_id = $2)`,
        [name, userId]
    );
    return parseInt(rows[0].count, 10);
};

export const update = async ({ routineId, userId, name }, db = pool) => {
    const { rows } = await db.query(
        `UPDATE routines
         SET name = COALESCE($1, name)
         WHERE id = $2 AND user_id = $3
         RETURNING id, user_id, name`,
        [name, routineId, userId]
    );
    return rows[0] || null;
};

export const remove = async ({ routineId, userId }, db = pool) => {
    const { rowCount } = await db.query(
        `DELETE FROM routines WHERE id = $1 AND user_id = $2`,
        [routineId, userId]
    );
    return rowCount > 0;
};