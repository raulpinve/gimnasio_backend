import { pool } from '../initDB.js';

/**
 * Repository de perfiles de entrenamiento (user_profiles).
 * Solo acceso a datos; todos los métodos aceptan un `db` opcional
 * (pool por defecto, o un client si se está dentro de una transacción).
 */

const PROFILE_COLUMNS = `user_id, goal, experience, days_per_week,
                         session_minutes, available_equipment, updated_at`;

export const findByUserId = async ({ userId }, db = pool) => {
    const { rows } = await db.query(
        `SELECT ${PROFILE_COLUMNS} FROM user_profiles WHERE user_id = $1`,
        [userId]
    );
    return rows[0] || null;
};

export const existsByUserId = async ({ userId }, db = pool) => {
    const { rowCount } = await db.query(
        `SELECT 1 FROM user_profiles WHERE user_id = $1`,
        [userId]
    );
    return rowCount > 0;
};

// Crea el perfil o, si ya existe, reemplaza todos sus campos
export const upsert = async (
    { userId, goal, experience, daysPerWeek, sessionMinutes, availableEquipment },
    db = pool
) => {
    const { rows } = await db.query(
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
    return rows[0];
};

// Id del programa que mejor encaja con el perfil del usuario, o null si no hay ninguno.
// Mismo objetivo y nivel, equipo cubierto, días más cercanos a lo pedido.
export const findRecommendedTemplateId = async ({ userId }, db = pool) => {
    const { rows } = await db.query(
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
    return rows[0]?.id ?? null;
};