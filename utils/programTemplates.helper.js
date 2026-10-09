// Devuelve el programa completo: ficha + rutinas + ejercicios (ordenados)
export const getTemplateById = async (db, templateId) => {
    const { rows } = await db.query(
        `SELECT t.id, t.name, t.goal, t.experience, t.days_per_week,
                t.required_equipment, t.description,
                COALESCE((
                    SELECT JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', ptr.id,
                            'name', ptr.name,
                            'order_index', ptr.order_index,
                            'exercises', COALESCE((
                                SELECT JSON_AGG(
                                    JSON_BUILD_OBJECT(
                                        'exercise_id', e.id,
                                        'name', e.name,
                                        'type', e.type,
                                        'order_index', ptre.order_index,
                                        'target_sets', ptre.target_sets,
                                        'target_reps', ptre.target_reps,
                                        'target_weight', ptre.target_weight,
                                        'target_duration_seconds', ptre.target_duration_seconds,
                                        'target_distance_km', ptre.target_distance_km
                                    ) ORDER BY ptre.order_index
                                )
                                FROM program_template_routine_exercises ptre
                                JOIN exercises e ON e.id = ptre.exercise_id
                                WHERE ptre.template_routine_id = ptr.id
                            ), '[]')
                        ) ORDER BY ptr.order_index
                    )
                    FROM program_template_routines ptr
                    WHERE ptr.template_id = t.id
                ), '[]') AS routines
         FROM program_templates t
         WHERE t.id = $1`,
        [templateId]
    );

    return rows[0] || null;
};