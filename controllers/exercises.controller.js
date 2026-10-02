import {
    throwBadRequestError,
    throwNotFoundError
} from '../errors/throwHTTPErrors.js';
import { exercisesRepository } from '../repositories/exercises.repository.js';
import { snakeToCamel } from '../utils/utils.helper.js';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs/promises';
import {
    crearCarpeta,
    validateSizeFile,
    validateMimeTypeFile,
    subirArchivo,
    eliminarArchivo
} from '../utils/files.js';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sharp.cache(false);

const toArray = (value) => {
    if (!value) return null;
    return Array.isArray(value) ? value : [value];
};

const exerciseFolder = (exerciseId) =>
    path.join(__dirname, `../uploads/exercises/${exerciseId}`);

export const createExercise = async (req, res, next) => {
    const imageFile = req.files['image']?.[0];
    const videoFile = req.files['video']?.[0];

    const { name, type, muscleGroups, equipment, description } = req.body;

    let imagePath = null;
    let thumbPath = null;
    let videoPath = null;

    try {
        if (imageFile) {
            if (!validateSizeFile(imageFile, 2)) {
                throwBadRequestError('image', 'La imagen excede los 2MB.');
            }
            if (!validateMimeTypeFile(['image/jpeg', 'image/png', 'image/webp'], imageFile)) {
                throwBadRequestError('image', 'Formato de imagen no permitido.');
            }
        }

        if (videoFile) {
            if (!validateSizeFile(videoFile, 15)) {
                throwBadRequestError('video', 'El video excede los 15MB.');
            }
            if (!validateMimeTypeFile(['video/mp4', 'video/webm'], videoFile)) {
                throwBadRequestError('video', 'Formato de video no permitido.');
            }
        }

        // 1. Insertar ejercicio (Postgres genera el UUID)
        const exercise = await exercisesRepository.insert({
            name,
            type: type || 'strength',
            muscleGroups: toArray(muscleGroups) || [],
            equipment: equipment || 'ninguno',
            description
        });

        const carpetaEjercicio = exerciseFolder(exercise.id);
        await crearCarpeta(carpetaEjercicio);

        // 2. Imagen
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

        // 3. Video
        let nombreVideo = null;

        if (videoFile) {
            nombreVideo = videoFile.newFilename;
            videoPath = path.join(carpetaEjercicio, nombreVideo);
            await subirArchivo(videoFile.filepath, videoPath);
        }

        // 4. Guardar nombres de archivos
        const updated = await exercisesRepository.updateFiles(exercise.id, {
            avatar: nombreImagen,
            avatarThumbnail: nombreThumb,
            video: nombreVideo
        });

        return res.status(201).json({
            statusCode: 201,
            status: 'success',
            data: snakeToCamel(updated)
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

export const getExercise = async (req, res, next) => {
    try {
        const { exerciseId } = req.params;

        const exercise = await exercisesRepository.findById(exerciseId);
        if (!exercise) {
            throwNotFoundError('Ejercicio no encontrado.');
        }

        const secciones = exercise.description
            ? exercise.description
                  .split('|')
                  .map((section) => section.replace(/\\n/g, '\n').trim())
            : [];

        return res.status(200).json({
            statusCode: 200,
            status: 'success',
            data: {
                ...snakeToCamel(exercise),
                descriptionText: exercise.description || '',
                description: {
                    positionInicial: secciones[0] || '',
                    ejecucion: secciones[1] || '',
                    tipsExtra: secciones[2] || ''
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getAllExercises = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;

        const filters = {
            name: req.query.name || null,
            type: req.query.type || null,
            muscleGroup: req.query.muscleGroup || null
        };
        const userId = req.user ? req.user.id : null;

        const [rows, totalRecords] = await Promise.all([
            exercisesRepository.findAll({ ...filters, userId, limit: pageSize, offset }),
            exercisesRepository.count(filters)
        ]);

        const totalPages = Math.ceil(totalRecords / pageSize);

        return res.status(200).json({
            statusCode: 200,
            status: 'success',
            pagination: { currentPage: page, totalPages, totalRecords },
            data: rows.map(snakeToCamel)
        });
    } catch (error) {
        next(error);
    }
};

export const updateExercise = async (req, res, next) => {
    try {
        const { exerciseId } = req.params;
        const { name, type, muscleGroups, equipment, description } = req.body || {};

        const imageFile = req.files['image']?.[0];
        const videoFile = req.files['video']?.[0];

        const current = await exercisesRepository.findFilesById(exerciseId);
        if (!current) {
            return next(throwNotFoundError('Ejercicio no encontrado.'));
        }

        const { avatar: oldAvatar, avatar_thumbnail: oldThumb, video: oldVideo } = current;
        const carpetaEjercicio = exerciseFolder(exerciseId);
        await fs.mkdir(carpetaEjercicio, { recursive: true });

        let nombreImagen = oldAvatar;
        let nombreThumb = oldThumb;
        let nombreVideo = oldVideo;

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

        if (videoFile) {
            if (oldVideo) await fs.unlink(path.join(carpetaEjercicio, oldVideo)).catch(() => {});

            nombreVideo = `${Date.now()}-${videoFile.newFilename}`;
            const videoPath = path.join(carpetaEjercicio, nombreVideo);

            await fs.copyFile(videoFile.filepath, videoPath);
            await fs.unlink(videoFile.filepath);
        }

        const updated = await exercisesRepository.update(exerciseId, {
            name,
            type,
            muscleGroups: toArray(muscleGroups), // null => COALESCE mantiene el valor actual
            equipment,
            description,
            avatar: nombreImagen,
            avatarThumbnail: nombreThumb,
            video: nombreVideo
        });

        return res.status(200).json({
            status: 'success',
            data: snakeToCamel(updated)
        });
    } catch (error) {
        next(error);
    }
};

export const deleteExercise = async (req, res, next) => {
    try {
        const { exerciseId } = req.params;

        const deleted = await exercisesRepository.deleteById(exerciseId);
        if (!deleted) {
            return next(throwNotFoundError('Ejercicio no encontrado.'));
        }

        try {
            await fs.rm(exerciseFolder(exerciseId), { recursive: true, force: true });
        } catch (dirError) {
            console.error(`No se pudo eliminar la carpeta física: ${dirError.message}`);
        }

        return res.status(200).json({
            statusCode: 200,
            status: 'success',
            message: 'Ejercicio eliminado exitosamente.'
        });
    } catch (error) {
        next(error);
    }
};

export const getExerciseProgress = async (req, res, next) => {
    try {
        const { exerciseId } = req.params;
        const userId = req.user.id;

        const currentUnit = (await exercisesRepository.findLastWeightUnit(userId)) || 'kg';
        const data = await exercisesRepository.findProgress(exerciseId, userId, currentUnit);

        return res.status(200).json({
            status: 'success',
            unit: currentUnit,
            data
        });
    } catch (error) {
        next(error);
    }
};