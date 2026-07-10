const { throwBadRequestError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");
const { snakeToCamel } = require("../utils/utils.helper");
const path = require('path');
const sharp = require('sharp');
const { crearCarpeta, validateSizeFile, validateMimeTypeFile, subirArchivo, eliminarArchivo } = require("../utils/files");
const fs = require('fs').promises;
sharp.cache(false);

exports.createExercise = async (req, res, next) => {
    const imageFile = req.files["image"]?.[0];
    const videoFile = req.files["video"]?.[0];

    const {
        name,
        type,
        muscleGroups,
        equipment,
        description
    } = req.body;

    let imagePath = null;
    let thumbPath = null;
    let videoPath = null;

    try {
        // Validaciones
        if (imageFile) {
            if (!validateSizeFile(imageFile, 2)) {
                throwBadRequestError("image", "La imagen excede los 2MB.");
            }

            if (
                !validateMimeTypeFile(
                    ["image/jpeg", "image/png", "image/webp"],
                    imageFile
                )
            ) {
                throwBadRequestError(
                    "image",
                    "Formato de imagen no permitido."
                );
            }
        }

        if (videoFile) {
            if (!validateSizeFile(videoFile, 15)) {
                throwBadRequestError("video", "El video excede los 15MB.");
            }

            if (
                !validateMimeTypeFile(
                    ["video/mp4", "video/webm"],
                    videoFile
                )
            ) {
                throwBadRequestError(
                    "video",
                    "Formato de video no permitido."
                );
            }
        }

        let finalMuscleGroups = [];
        if (muscleGroups) {
            finalMuscleGroups = Array.isArray(muscleGroups)
                ? muscleGroups
                : [muscleGroups];
        }

        // 1. Insertar ejercicio (Postgres genera el UUID)
        const insertQuery = `
            INSERT INTO exercises (
                name,
                type,
                muscle_groups,
                equipment,
                description
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const insertValues = [
            name,
            type || "strength",
            finalMuscleGroups,
            equipment || "ninguno",
            description
        ];

        const { rows } = await pool.query(insertQuery, insertValues);

        const exercise = rows[0];
        const exerciseId = exercise.id;

        // 2. Crear carpeta usando el UUID generado
        const carpetaEjercicio = path.join(
            __dirname,
            `../uploads/exercises/${exerciseId}`
        );

        await crearCarpeta(carpetaEjercicio);

        // 3. Procesar imagen
        let nombreImagen = null;
        let nombreThumb = null;

        if (imageFile) {
            nombreImagen = imageFile.newFilename;
            nombreThumb = `thumb-${path.parse(nombreImagen).name}.webp`;

            imagePath = path.join(carpetaEjercicio, nombreImagen);
            thumbPath = path.join(carpetaEjercicio, nombreThumb);

            await subirArchivo(imageFile.filepath, imagePath);

            await sharp(imagePath)
                .rotate()
                .resize(300)
                .webp({ quality: 80 })
                .toFile(thumbPath);
        }

        // 4. Procesar video
        let nombreVideo = null;

        if (videoFile) {
            nombreVideo = videoFile.newFilename;

            videoPath = path.join(
                carpetaEjercicio,
                nombreVideo
            );

            await subirArchivo(videoFile.filepath, videoPath);
        }

        // 5. Actualizar archivos
        const updateQuery = `
            UPDATE exercises
            SET
                avatar = $1,
                avatar_thumbnail = $2,
                video = $3
            WHERE id = $4
            RETURNING *
        `;

        const { rows: updatedRows } = await pool.query(
            updateQuery,
            [
                nombreImagen,
                nombreThumb,
                nombreVideo,
                exerciseId
            ]
        );

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            data: snakeToCamel(updatedRows[0])
        });

    } catch (error) {
        await Promise.allSettled([
            eliminarArchivo(imagePath),
            eliminarArchivo(thumbPath),
            eliminarArchivo(videoPath)
        ]);

        next(error);
    }
};

exports.getExercise = async (req, res, next) => {
    try {
        const { exerciseId } = req.params;

        const query = `
            SELECT 
                id, 
                name, 
                avatar, 
                avatar_thumbnail, 
                video, 
                type, 
                muscle_groups,
                equipment, 
                description
            FROM exercises
            WHERE id = $1
        `;

        const { rows } = await pool.query(query, [exerciseId]);
        if (rows.length === 0) {
            throwNotFoundError("Ejercicio no encontrado.")
        }

        const descripcionFormateada = rows[0].description
            ? rows[0].description.split('|').map(section =>
                section.replace(/\\n/g, '\n').trim()
            )
            : [];

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: {
                ...snakeToCamel(rows[0]),
                descriptionText: rows[0].description || "",
                description: {
                    positionInicial: descripcionFormateada[0] || "",
                    ejecucion: descripcionFormateada[1] || "",
                    tipsExtra: descripcionFormateada[2] || ""
                }
            }
        });

    } catch (error) {
        next(error);
    }
};
exports.getAllExercises = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;

        const name = req.query.name || null;
        const type = req.query.type || null;
        const muscleGroup = req.query.muscleGroup || null;
        
        const userId = req.user ? req.user.id : null; 

        const whereClause = `
            WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')
              AND ($2::text IS NULL OR type = $2)
              AND ($3::text IS NULL OR $3 = ANY(muscle_groups))
        `;

        const query = `
            SELECT 
                id, name, avatar, avatar_thumbnail, video, type, muscle_groups, equipment,
                
                -- 🔵 CASO FUERZA: Último peso levantado en la historia
                CASE 
                    WHEN type = 'cardio' THEN 0
                    ELSE COALESCE((
                        SELECT ws_last.weight FROM workout_sets ws_last
                        JOIN workout_exercises we_last ON ws_last.workout_exercise_id = we_last.id
                        JOIN workouts w_last ON we_last.workout_id = w_last.id
                        WHERE we_last.exercise_id = exercises.id AND w_last.user_id = $6
                        ORDER BY ws_last.created_at DESC LIMIT 1
                    ), 0)
                END as suggested_weight,

                -- 🔵 CASO FUERZA: Unidad de ese último set
                CASE 
                    WHEN type = 'cardio' THEN 'kg'
                    ELSE COALESCE((
                        SELECT ws_last.weight_unit FROM workout_sets ws_last
                        JOIN workout_exercises we_last ON ws_last.workout_exercise_id = we_last.id
                        JOIN workouts w_last ON we_last.workout_id = w_last.id
                        WHERE we_last.exercise_id = exercises.id AND w_last.user_id = $6
                        ORDER BY ws_last.created_at DESC LIMIT 1
                    ), 'kg')
                END as suggested_weight_unit,

                -- 🟢 CASO CARDIO: Último tiempo registrado en la historia (segundos)
                CASE 
                    WHEN type = 'cardio' THEN COALESCE((
                        SELECT cl_last.duration_seconds FROM cardio_logs cl_last
                        JOIN workout_exercises we_last ON cl_last.workout_exercise_id = we_last.id
                        JOIN workouts w_last ON we_last.workout_id = w_last.id
                        WHERE we_last.exercise_id = exercises.id AND w_last.user_id = $6
                        ORDER BY cl_last.created_at DESC LIMIT 1
                    ), 0)
                    ELSE 0
                END as suggested_duration_seconds,

                -- 🟢 CASO CARDIO: Última distancia registrada en la historia (kilómetros)
                CASE 
                    WHEN type = 'cardio' THEN COALESCE((
                        SELECT cl_last.distance_km FROM cardio_logs cl_last
                        JOIN workout_exercises we_last ON cl_last.workout_exercise_id = we_last.id
                        JOIN workouts w_last ON we_last.workout_id = w_last.id
                        WHERE we_last.exercise_id = exercises.id AND w_last.user_id = $6
                        ORDER BY cl_last.created_at DESC LIMIT 1
                    ), 0)
                    ELSE 0
                END as suggested_distance_km
                
            FROM exercises
            ${whereClause}
            ORDER BY name
            LIMIT $4 OFFSET $5
        `;

        const { rows } = await pool.query(query, [
            name, type, muscleGroup, pageSize, offset, userId
        ]);

        const { rows: totalRows } = await pool.query(
            `SELECT COUNT(*) FROM exercises ${whereClause}`,
            [name, type, muscleGroup]
        );

        const totalRecords = parseInt(totalRows[0].count);
        const totalPages = Math.ceil(totalRecords / pageSize);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            pagination: { currentPage: page, totalPages, totalRecords },
            data: rows.map(snakeToCamel) // Convierte todo a formato Camello automáticamente
        });

    } catch (error) {
        next(error);
    }
};



exports.updateExercise = async (req, res, next) => {
    try {
        const { exerciseId } = req.params;
        
        // 1. Extraemos los campos (Usamos muscleGroups en plural)
        const { name, type, muscleGroups, equipment, description } = req.body || {};
        
        // Formidable v3 entrega arrays de archivos
        const imageFile = req.files["image"] && req.files["image"][0];
        const videoFile = req.files["video"] && req.files["video"][0];

        // 2. Obtener datos actuales de la DB
        const { rows: currentRows } = await pool.query(
            "SELECT avatar, avatar_thumbnail, video FROM exercises WHERE id = $1",
            [exerciseId]
        );

        if (currentRows.length === 0) return next(throwNotFoundError("Ejercicio no encontrado."));
        
        const { avatar: oldAvatar, avatar_thumbnail: oldThumb, video: oldVideo } = currentRows[0];
        const carpetaEjercicio = path.join(__dirname, `../uploads/exercises/${exerciseId}`);
        await fs.mkdir(carpetaEjercicio, { recursive: true });

        let nombreImagen = oldAvatar;
        let nombreThumb = oldThumb;
        let nombreVideo = oldVideo;

        // 3. Procesar Imagen Nueva
        if (imageFile) {
            if (oldAvatar) await fs.unlink(path.join(carpetaEjercicio, oldAvatar)).catch(() => {});
            if (oldThumb) await fs.unlink(path.join(carpetaEjercicio, oldThumb)).catch(() => {});

            nombreImagen = `${Date.now()}-${imageFile.newFilename}`;
            nombreThumb = `thumb-${path.parse(nombreImagen).name}.webp`;
            
            const imagePath = path.join(carpetaEjercicio, nombreImagen);
            const thumbPath = path.join(carpetaEjercicio, nombreThumb);

            await fs.copyFile(imageFile.filepath, imagePath);
            await fs.unlink(imageFile.filepath);

            await sharp(imagePath)
                .rotate()
                .resize(300)
                .webp({ quality: 80 })
                .toFile(thumbPath);
        }

        // 4. Procesar Video Nuevo
        if (videoFile) {
            if (oldVideo) await fs.unlink(path.join(carpetaEjercicio, oldVideo)).catch(() => {});

            nombreVideo = `${Date.now()}-${videoFile.newFilename}`;
            const videoPath = path.join(carpetaEjercicio, nombreVideo);

            await fs.copyFile(videoFile.filepath, videoPath);
            await fs.unlink(videoFile.filepath);
        }

        // --- 5. NORMALIZACIÓN DEL ARRAY DE MÚSCULOS ---
        // Si no viene nada en el body, mantenemos lo que hay en la DB usando COALESCE en el SQL.
        // Pero si viene algo, nos aseguramos de que sea un Array para Postgres.
        let finalMuscleGroups = null; 
        if (muscleGroups) {
            finalMuscleGroups = Array.isArray(muscleGroups) ? muscleGroups : [muscleGroups];
        }

        // 6. DB Update (Actualizamos a muscle_groups)
        const { rows } = await pool.query(
            `UPDATE exercises SET 
                name = COALESCE($1, name), 
                type = COALESCE($2, type),
                muscle_groups = COALESCE($3, muscle_groups), -- <--- plural
                equipment = COALESCE($4, equipment),
                description = COALESCE($5, description),
                avatar = $6, 
                avatar_thumbnail = $7, 
                video = $8
             WHERE id = $9 RETURNING *`,
            [
                name, 
                type, 
                finalMuscleGroups, 
                equipment, 
                description, 
                nombreImagen, 
                nombreThumb, 
                nombreVideo, 
                exerciseId
            ]
        );

        return res.status(200).json({
            status: "success",
            data: snakeToCamel(rows[0])
        });

    } catch (error) {
        next(error);
    }
};

exports.deleteExercise = async (req, res, next) => {
    try {
        const { exerciseId } = req.params;

        // 1. Eliminar de la base de datos primero
        const { rowCount } = await pool.query(
            `DELETE FROM exercises WHERE id = $1`,
            [exerciseId]
        );

        if (rowCount === 0) {
            return throwNotFoundError("Ejercicio no encontrado.");
        }

        // 2. Armar la ruta exacta de la carpeta del ejercicio (igual que en createExercise)
        const carpetaEjercicio = path.join(
            __dirname,
            `../uploads/exercises/${exerciseId}`
        );

        // 3. Eliminar la carpeta y todo su contenido de forma segura
        try {
            await fs.rm(carpetaEjercicio, { recursive: true, force: true });
        } catch (dirError) {
            // Logueamos el error del sistema de archivos pero no detenemos la respuesta al cliente
            console.error(`No se pudo eliminar la carpeta física: ${dirError.message}`);
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Ejercicio eliminado exitosamente."
        });

    } catch (error) {
        next(error);
    }
};

exports.getExerciseProgress = async (req, res, next) => {
    try {
        const { exerciseId } = req.params;
        const userId = req.user.id;

        // 1. Primero averiguamos de forma rápida la última unidad registrada por el usuario
        const unitQuery = `
            SELECT ws.weight_unit AS unit
            FROM workout_sets ws
            JOIN workout_exercises we ON ws.workout_exercise_id = we.id
            JOIN workouts w ON we.workout_id = w.id
            WHERE w.user_id = $1 AND w.finished_at IS NOT NULL
            ORDER BY w.finished_at DESC
            LIMIT 1;
        `;
        const { rows: unitResult } = await pool.query(unitQuery, [userId]);
        
        // Si nunca ha registrado nada, usamos 'kg' por defecto
        const currentUnit = unitResult.length > 0 ? unitResult[0].unit : 'kg';

        // 2. Ejecutamos la consulta de la gráfica pasándole la unidad ya definida
        const progressQuery = `
            SELECT
                date,
                value::float AS value 
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
            ORDER BY started_at ASC;
        `;

        const { rows: progressRows } = await pool.query(progressQuery, [exerciseId, userId, currentUnit]);
        
        // 3. Devolvemos la unidad en la respuesta general del JSON
        res.status(200).json({ 
            status: "success", 
            unit: currentUnit, 
            data: progressRows 
        });
    } catch (error) {
        next(error);
    }
};
