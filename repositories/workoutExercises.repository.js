import { pool } from '../initDB.js';

/**
 * Repository de workout_exercises.
 * Solo acceso a datos; todos los métodos aceptan un `db` opcional
 * (pool por defecto, o un client si se está dentro de una transacción).
 */

// Fragmentos de SQL idénticos que estaban repetidos en varias queries.
// Esperan los alias `e` (exercises) y `w` (workouts) en la query que los use.
const PERSONAL_RECORD_SQL = `
    (
        SELECT MAX(ws_inner.weight)
        FROM workout_sets ws_inner
        JOIN workout_exercises we_inner ON ws_inner.workout_exercise_id = we_inner.id
        JOIN workouts w_inner ON we_inner.workout_id = w_inner.id
        WHERE we_inner.exercise_id = e.id
          AND w_inner.user_id = w.user_id
          AND w_inner.finished_at IS NOT NULL
    ) AS "personalRecord"
`;

// Unidad del último set realizado por el usuario para ese ejercicio
const LAST_WEIGHT_UNIT_SQL = `
    COALESCE((
        SELECT ws_last.weight_unit
        FROM workout_sets ws_last
        JOIN workout_exercises we_last ON ws_last.workout_exercise_id = we_last.id
        JOIN workouts w_last ON we_last.workout_id = w_last.id
        WHERE we_last.exercise_id = e.id AND w_last.user_id = w.user_id
        ORDER BY ws_last.created_at DESC
        LIMIT 1
    ), 'kg') AS "suggestedWeightUnit"
`;

// Devuelve null si el workout no existe o no pertenece al usuario
export const create = async ({ userId, workoutId, exerciseId }, db = pool) => {
    const { rowCount } = await db.query(
        `SELECT 1 FROM workouts WHERE id = $1 AND user_id = $2`,
        [workoutId, userId]
    );
    if (rowCount === 0) return null;

    const { rows } = await db.query(
        `INSERT INTO workout_exercises (workout_id, exercise_id)
         VALUES ($1, $2)
         RETURNING *`,
        [workoutId, exerciseId]
    );
    return rows[0];
};

// Detalle de un workout_exercise. Los alias ya vienen en camelCase.
export const findById = async ({ workoutExerciseId, userId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT
            e.id AS "exerciseId",
            e.name AS "exerciseName",
            e.type AS "exerciseType",
            e.avatar_thumbnail AS "exerciseAvatarThumbnail",
            e.avatar AS "exerciseAvatar",

            we.id AS "workoutExerciseId",

            re.target_sets AS "targetSets",
            re.target_reps AS "targetReps",
            re.target_weight AS "targetWeight",

            COALESCE(
                re.target_weight,
                (
                    SELECT ws_last.weight
                    FROM workout_sets ws_last
                    JOIN workout_exercises we_last ON ws_last.workout_exercise_id = we_last.id
                    JOIN workouts w_last ON we_last.workout_id = w_last.id
                    WHERE we_last.exercise_id = e.id
                      AND w_last.user_id = w.user_id
                      AND w_last.id <> w.id
                    ORDER BY ws_last.created_at DESC
                    LIMIT 1
                ),
                0
            ) AS "suggestedWeight",

            COALESCE(
                (
                    SELECT ws_last.weight_unit
                    FROM workout_sets ws_last
                    JOIN workout_exercises we_last ON ws_last.workout_exercise_id = we_last.id
                    JOIN workouts w_last ON we_last.workout_id = w_last.id
                    WHERE we_last.exercise_id = e.id
                      AND w_last.user_id = w.user_id
                      AND w_last.id <> w.id
                    ORDER BY ws_last.created_at DESC
                    LIMIT 1
                ),
                'kg'
            ) AS "suggestedWeightUnit",

            re.target_duration_seconds AS "targetDurationSeconds",
            re.target_distance_km AS "targetDistanceKm",

            COALESCE(we.order_index, 0) AS "orderIndex",
            we.created_at AS "createdAt",

            ${PERSONAL_RECORD_SQL}

         FROM workout_exercises we
         JOIN exercises e ON e.id = we.exercise_id
         JOIN workouts w ON w.id = we.workout_id
         LEFT JOIN routine_exercises re
            ON w.routine_id = re.routine_id
           AND we.exercise_id = re.exercise_id
         WHERE we.id = $1 AND w.user_id = $2`,
        [workoutExerciseId, userId]
    );
    return rows[0] || null;
};

export const findAllByWorkout = async ({ workoutId, userId, limit, offset }, db = pool) => {
    const { rows } = await db.query(
        `SELECT
            we.id AS workout_exercise_id,
            we.workout_id,
            we.exercise_id,
            we.created_at,
            e.name AS exercise_name,
            e.avatar AS exercise_avatar,
            e.avatar_thumbnail AS exercise_avatar_thumbnail,
            e.type AS exercise_type,
            -- Metas generales (Fuerza)
            re.target_sets,
            re.target_reps,
            re.target_weight,
            -- Metas específicas (Cardio)
            re.target_duration_seconds,
            re.target_distance_km
         FROM workout_exercises AS we
         INNER JOIN exercises AS e ON we.exercise_id = e.id
         JOIN workouts AS w ON we.workout_id = w.id
         LEFT JOIN routine_exercises AS re
            ON w.routine_id = re.routine_id
           AND we.exercise_id = re.exercise_id
         WHERE we.workout_id = $1 AND w.user_id = $2
         ORDER BY we.created_at ASC
         LIMIT $3 OFFSET $4`,
        [workoutId, userId, limit, offset]
    );
    return rows;
};

export const countByWorkout = async ({ workoutId, userId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT COUNT(*)
         FROM workout_exercises we
         JOIN workouts w ON w.id = we.workout_id
         WHERE we.workout_id = $1 AND w.user_id = $2`,
        [workoutId, userId]
    );
    return parseInt(rows[0].count, 10);
};

// Ejercicios de un workout en curso:
//   Parte 1: los planificados en la rutina (hayan sido iniciados o no)
//   Parte 2: los extras agregados fuera de la rutina (o sesión libre)
// Los alias ya vienen en camelCase.
export const findActiveByWorkout = async ({ workoutId, userId }, db = pool) => {
    const { rows } = await db.query(
        `-- PARTE 1: ejercicios planificados de la rutina
         SELECT
            e.id AS "exerciseId",
            e.name AS "exerciseName",
            e.type AS "exerciseType",
            e.avatar_thumbnail AS "exerciseAvatarThumbnail",
            e.avatar AS "exerciseAvatar",
            we.id AS "workoutExerciseId",
            re.target_sets AS "targetSets",
            re.target_reps AS "targetReps",
            re.target_weight AS "targetWeight",

            COALESCE(re.target_weight, (
                SELECT ws_last.weight
                FROM workout_sets ws_last
                JOIN workout_exercises we_last ON ws_last.workout_exercise_id = we_last.id
                JOIN workouts w_last ON we_last.workout_id = w_last.id
                WHERE we_last.exercise_id = e.id AND w_last.user_id = w.user_id
                ORDER BY ws_last.created_at DESC
                LIMIT 1
            ), 0) AS "suggestedWeight",

            ${LAST_WEIGHT_UNIT_SQL},

            re.target_duration_seconds AS "targetDurationSeconds",
            re.target_distance_km AS "targetDistanceKm",
            COALESCE(we.order_index, 0) AS "orderIndex",
            w.started_at AS "createdAt",
            ${PERSONAL_RECORD_SQL}
         FROM workouts w
         JOIN routine_exercises re ON w.routine_id = re.routine_id
         JOIN exercises e ON re.exercise_id = e.id
         LEFT JOIN workout_exercises we ON (we.workout_id = w.id AND we.exercise_id = e.id)
         WHERE w.id = $1 AND w.user_id = $2

         UNION

         -- PARTE 2: ejercicios extra (o sesión libre)
         SELECT
            e.id AS "exerciseId",
            e.name AS "exerciseName",
            e.type AS "exerciseType",
            e.avatar_thumbnail AS "exerciseAvatarThumbnail",
            e.avatar AS "exerciseAvatar",
            we.id AS "workoutExerciseId",
            NULL AS "targetSets",
            NULL AS "targetReps",
            NULL AS "targetWeight",

            -- En los extras solo se busca el último peso levantado en el historial
            COALESCE(
                re.target_weight,
                (
                    SELECT ws_last.weight
                    FROM workout_sets ws_last
                    JOIN workout_exercises we_last ON ws_last.workout_exercise_id = we_last.id
                    JOIN workouts w_last ON we_last.workout_id = w_last.id
                    WHERE we_last.exercise_id = e.id
                      AND w_last.user_id = w.user_id
                      AND w_last.finished_at IS NOT NULL
                      AND w_last.id <> w.id
                    ORDER BY w_last.finished_at DESC, ws_last.created_at DESC
                    LIMIT 1
                ),
                0
            ) AS "suggestedWeight",

            ${LAST_WEIGHT_UNIT_SQL},

            NULL AS "targetDurationSeconds",
            NULL AS "targetDistanceKm",
            COALESCE(we.order_index, 999) AS "orderIndex",
            we.created_at AS "createdAt",
            ${PERSONAL_RECORD_SQL}
         FROM workout_exercises we
         JOIN exercises e ON we.exercise_id = e.id
         JOIN workouts w ON we.workout_id = w.id
         LEFT JOIN routine_exercises re ON (w.routine_id = re.routine_id AND we.exercise_id = re.exercise_id)
         WHERE we.workout_id = $1 AND w.user_id = $2 AND re.exercise_id IS NULL

         ORDER BY "orderIndex" ASC, "createdAt" ASC`,
        [workoutId, userId]
    );
    return rows;
};

export const remove = async ({ workoutExerciseId, userId }, db = pool) => {
    const { rowCount } = await db.query(
        `DELETE FROM workout_exercises
         WHERE id = $1
           AND workout_id IN (SELECT id FROM workouts WHERE user_id = $2)`,
        [workoutExerciseId, userId]
    );
    return rowCount > 0;
};