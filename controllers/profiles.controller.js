import {
    throwBadRequestError,
    throwNotFoundError
} from '../errors/throwHTTPErrors.js';
import { pool } from '../initDB.js';
import { snakeToCamel } from '../utils/utils.helper.js';
import { getTemplateById } from '../utils/programTemplates.helper.js';

const PROFILE_COLUMNS = `user_id, goal, experience, days_per_week,
                         session_minutes, available_equipment, updated_at`;

export const getMyProfile = async (req, res, next) => {
    try {
        const { id: userId } = req.user || {};

        const { rows } = await pool.query(
            `SELECT ${PROFILE_COLUMNS} FROM user_profiles WHERE user_id = $1`,
            [userId]
        );

        if (rows.length === 0) {
            return throwNotFoundError("El usuario no tiene perfil de entrenamiento.");
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

        const { rows } = await pool.query(
            `INSERT INTO user_profiles
                (user_id, goal, experience, days_per_week, session_minutes, available_equipment)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (user_id) DO UPDATE SET
                goal = EXCLUDED.goal,
                experience = EXCLUDED.experience,
                days_per_week = EXCLUDED.days_per_week,
                session_minutes = EXCLUDED.session_minutes,
                available_equipment = EXCLUDED.available_equipment,
                updated_at = NOW()
             RETURNING ${PROFILE_COLUMNS}`,
            [userId, goal, experience, daysPerWeek, sessionMinutes, availableEquipment]
        );

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Perfil guardado exitosamente.",
            data: snakeToCamel(rows[0])
        });
    } catch (error) {
        next(error);
    }
};

// Solo lectura: devuelve el programa que mejor encaja con el perfil, SIN asignarlo
export const getMyRecommendation = async (req, res, next) => {
    try {
        const { id: userId } = req.user || {};

        const { rows: profileRows } = await pool.query(
            `SELECT 1 FROM user_profiles WHERE user_id = $1`,
            [userId]
        );
        if (profileRows.length === 0) {
            return throwBadRequestError("Primero debes completar tu perfil de entrenamiento.");
        }

        // Mismo objetivo y nivel, equipo cubierto, días más cercanos a lo pedido
        const { rows } = await pool.query(
            `SELECT t.id
             FROM program_templates t
             JOIN user_profiles p ON p.user_id = $1
             WHERE t.goal = p.goal
               AND t.experience = p.experience
               AND t.required_equipment <@ (p.available_equipment || ARRAY['ninguno','peso_corporal'])
             ORDER BY ABS(t.days_per_week - COALESCE(p.days_per_week, 3)), t.days_per_week
             LIMIT 1`,
            [userId]
        );

        if (rows.length === 0) {
            return throwNotFoundError(
                "Aún no tenemos un programa para tu combinación. Puedes crear tu rutina manualmente."
            );
        }

        const template = await getTemplateById(pool, rows[0].id);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: snakeToCamel(template)
        });
    } catch (error) {
        next(error);
    }
};