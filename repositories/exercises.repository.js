import { pool } from '../initDB.js';

const FILTER_CLAUSE = `
    WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')
      AND ($2::text IS NULL OR type = $2)
      AND ($3::text IS NULL OR $3 = ANY(muscle_groups))
`;

export const exercisesRepository = {
    async insert({ name, type, muscleGroups, equipment, description }) {
        const { rows } = await pool.query(
            `INSERT INTO exercises (name, type, muscle_groups, equipment, description)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name, type, muscleGroups, equipment, description]
        );
        return rows[0];
    },

    async updateFiles(id, { avatar, avatarThumbnail, video }) {
        const { rows } = await pool.query(
            `UPDATE exercises
             SET avatar = $1, avatar_thumbnail = $2, video = $3
             WHERE id = $4
             RETURNING *`,
            [avatar, avatarThumbnail, video, id]
        );
        return rows[0];
    },

    async findById(id) {
        const { rows } = await pool.query(
            `SELECT id, name, avatar, avatar_thumbnail, video, type,
                    muscle_groups, equipment, description
             FROM exercises
             WHERE id = $1`,
            [id]
        );
        return rows[0] || null;
    },

    async findFilesById(id) {
        const { rows } = await pool.query(
            `SELECT avatar, avatar_thumbnail, video FROM exercises WHERE id = $1`,
            [id]
        );
        return rows[0] || null;
    },

    async findAll({ name, type, muscleGroup, userId, limit, offset }) {
        const query = `
            SELECT
                id, name, avatar, avatar_thumbnail, video, type, muscle_groups, equipment,

                -- Fuerza: último peso levantado
                CASE
                    WHEN type = 'cardio' THEN 0
                    ELSE COALESCE((
                        SELECT ws_last.weight FROM workout_sets ws_last
                        JOIN workout_exercises we_last ON ws_last.workout_exercise_id = we_last.id
                        JOIN workouts w_last ON we_last.workout_id = w_last.id
                        WHERE we_last.exercise_id = exercises.id AND w_last.user_id = $6
                        ORDER BY ws_last.created_at DESC LIMIT 1
                    ), 0)
                END AS suggested_weight,

                -- Fuerza: unidad del último set
                CASE
                    WHEN type = 'cardio' THEN 'kg'
                    ELSE COALESCE((
                        SELECT ws_last.weight_unit FROM workout_sets ws_last
                        JOIN workout_exercises we_last ON ws_last.workout_exercise_id = we_last.id
                        JOIN workouts w_last ON we_last.workout_id = w_last.id
                        WHERE we_last.exercise_id = exercises.id AND w_last.user_id = $6
                        ORDER BY ws_last.created_at DESC LIMIT 1
                    ), 'kg')
                END AS suggested_weight_unit,

                -- Cardio: último tiempo (segundos)
                CASE
                    WHEN type = 'cardio' THEN COALESCE((
                        SELECT cl_last.duration_seconds FROM cardio_logs cl_last
                        JOIN workout_exercises we_last ON cl_last.workout_exercise_id = we_last.id
                        JOIN workouts w_last ON we_last.workout_id = w_last.id
                        WHERE we_last.exercise_id = exercises.id AND w_last.user_id = $6
                        ORDER BY cl_last.created_at DESC LIMIT 1
                    ), 0)
                    ELSE 0
                END AS suggested_duration_seconds,

                -- Cardio: última distancia (km)
                CASE
                    WHEN type = 'cardio' THEN COALESCE((
                        SELECT cl_last.distance_km FROM cardio_logs cl_last
                        JOIN workout_exercises we_last ON cl_last.workout_exercise_id = we_last.id
                        JOIN workouts w_last ON we_last.workout_id = w_last.id
                        WHERE we_last.exercise_id = exercises.id AND w_last.user_id = $6
                        ORDER BY cl_last.created_at DESC LIMIT 1
                    ), 0)
                    ELSE 0
                END AS suggested_distance_km

            FROM exercises
            ${FILTER_CLAUSE}
            ORDER BY name
            LIMIT $4 OFFSET $5
        `;

        const { rows } = await pool.query(query, [
            name, type, muscleGroup, limit, offset, userId
        ]);
        return rows;
    },

    async count({ name, type, muscleGroup }) {
        const { rows } = await pool.query(
            `SELECT COUNT(*) FROM exercises ${FILTER_CLAUSE}`,
            [name, type, muscleGroup]
        );
        return parseInt(rows[0].count, 10);
    },

    async update(id, { name, type, muscleGroups, equipment, description, avatar, avatarThumbnail, video }) {
        const { rows } = await pool.query(
            `UPDATE exercises SET
                name = COALESCE($1, name),
                type = COALESCE($2, type),
                muscle_groups = COALESCE($3, muscle_groups),
                equipment = COALESCE($4, equipment),
                description = COALESCE($5, description),
                avatar = $6,
                avatar_thumbnail = $7,
                video = $8
             WHERE id = $9
             RETURNING *`,
            [name, type, muscleGroups, equipment, description, avatar, avatarThumbnail, video, id]
        );
        return rows[0];
    },

    async deleteById(id) {
        const { rowCount } = await pool.query(
            `DELETE FROM exercises WHERE id = $1`,
            [id]
        );
        return rowCount > 0;
    },

    async findLastWeightUnit(userId) {
        const { rows } = await pool.query(
            `SELECT ws.weight_unit AS unit
             FROM workout_sets ws
             JOIN workout_exercises we ON ws.workout_exercise_id = we.id
             JOIN workouts w ON we.workout_id = w.id
             WHERE w.user_id = $1 AND w.finished_at IS NOT NULL
             ORDER BY w.finished_at DESC
             LIMIT 1`,
            [userId]
        );
        return rows[0]?.unit || null;
    },

    async findProgress(exerciseId, userId, unit) {
        const { rows } = await pool.query(
            `SELECT date, value::float AS value
             FROM (
                SELECT
                    TO_CHAR(w.started_at, 'DD/MM') AS date,
                    ROUND(
                        MAX(
                            CASE
                                WHEN $3 = 'lb' AND ws.weight_unit = 'kg' THEN ws.weight / 0.453592
                                WHEN $3 = 'kg' AND ws.weight_unit = 'lb' THEN ws.weight * 0.453592
                                ELSE ws.weight
                            END
                        )::numeric,
                        1
                    ) AS value,
                    w.started_at
                FROM workout_sets ws
                JOIN workout_exercises we ON ws.workout_exercise_id = we.id
                JOIN workouts w ON we.workout_id = w.id
                WHERE we.exercise_id = $1
                  AND w.user_id = $2
                  AND w.finished_at IS NOT NULL
                GROUP BY w.started_at
                ORDER BY w.started_at DESC
                LIMIT 15
             ) progress
             ORDER BY started_at ASC`,
            [exerciseId, userId, unit]
        );
        return rows;
    }
};