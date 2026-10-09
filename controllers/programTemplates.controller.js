import { pool } from '../initDB.js';
import { snakeToCamel } from '../utils/utils.helper.js';

// Copia el programa elegido a las rutinas del usuario autenticado
export const assignTemplate = async (req, res, next) => {
    try {
        const { templateId } = req.params;
        const { id: userId } = req.user || {};

        // Copia el programa elegido a las rutinas del usuario autenticado.
        // Ojo: este SELECT no solo lee, llama a la función de Postgres assign_template_to_user
        // (definida en schema.sql), que es la que hace los INSERT en routines y routine_exercises.
        // Es atómica: si algo falla, no se guarda nada a medias.
        // Devuelve las rutinas del usuario creadas desde este programa.
        const { rows } = await pool.query(
            `SELECT * FROM assign_template_to_user($1, $2)`,
            [userId, templateId]
        );

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            message: "Programa asignado exitosamente.",
            data: rows.map(snakeToCamel)
        });
    } catch (error) {
        next(error);
    }
};