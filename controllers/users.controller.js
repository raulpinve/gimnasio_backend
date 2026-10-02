import { throwBadRequestError } from '../errors/throwHTTPErrors.js';
import { pool } from '../initDB.js';
import { snakeToCamel } from '../utils/utils.helper.js';

export const getUserStats = async (req, res, next) => {
    try {
        const userId = req.user.id; 

        // QUERY 1: Total completed workouts
        const totalWorkoutsQuery = `
            SELECT COUNT(*) as total 
            FROM workouts 
            WHERE user_id = $1 AND finished_at IS NOT NULL
        `;

        // QUERY 2: Streak of days (Consecutive days training up to today)
        // This query looks for how many consecutive days backwards there are records
        const streakQuery = `
            WITH RECURSIVE dates AS (
                SELECT CAST(finished_at AS DATE) as workout_date
                FROM workouts
                WHERE user_id = $1 AND finished_at IS NOT NULL
                GROUP BY workout_date
            ),
            streak_calc AS (
                -- Empezamos desde el último entrenamiento (si fue hoy o ayer)
                SELECT workout_date, 1 as day_count
                FROM dates
                WHERE workout_date >= CURRENT_DATE - INTERVAL '1 day'
                
                UNION ALL
                
                -- Vamos uniendo los días anteriores consecutivos
                SELECT d.workout_date, s.day_count + 1
                FROM dates d
                INNER JOIN streak_calc s ON d.workout_date = s.workout_date - INTERVAL '1 day'
            )
            SELECT COALESCE(MAX(day_count), 0) as current_streak FROM streak_calc;
        `;

        const [totalRes, streakRes] = await Promise.all([
            pool.query(totalWorkoutsQuery, [userId]),
            pool.query(streakQuery, [userId])
        ]);

        return res.json({
            statusCode: 200,
            status: "success",
            data: {
                totalWorkouts: parseInt(totalRes.rows[0].total),
                currentStreak: parseInt(streakRes.rows[0].current_streak)
            }
        });

    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.firebaseUid;
        const { firstName, lastName } = req.body;

        const { rows } = await pool.query(
            `UPDATE users
             SET first_name = $1,
                 last_name = $2
             WHERE firebase_uid = $3
             RETURNING id, first_name, last_name`,
            [firstName.trim(), lastName.trim(), userId]
        );

        if (rows.length === 0) {
            throwBadRequestError("Usuario no encontrado");
        }

        const updatedUser = snakeToCamel(rows[0]);

        return res.json({
            statusCode: 200,
            status: "success",
            message: "Perfil actualizado",
            data: updatedUser,
        });
    } catch (error) {
        next(error);
    }
};
