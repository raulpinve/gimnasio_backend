import { body } from 'express-validator';
import handleValidationErrors from './handleValidationErrors.js';

const GOALS = ['hipertrofia', 'perdida_grasa', 'fuerza', 'salud_general'];
const EXPERIENCES = ['principiante', 'intermedio', 'avanzado'];
const EQUIPMENT = [
    'barras', 'mancuernas', 'maquinas', 'poleas', 'banco',
    'peso_corporal', 'bandas', 'kettlebells', 'ninguno'
];

export const validateProfile = [
    body("goal")
        .notEmpty().withMessage("El objetivo es requerido.")
        .isIn(GOALS)
        .withMessage(`El objetivo debe ser uno de: ${GOALS.join(", ")}.`),

    body("experience")
        .optional()
        .isIn(EXPERIENCES)
        .withMessage(`La experiencia debe ser una de: ${EXPERIENCES.join(", ")}.`),

    body("daysPerWeek")
        .optional()
        .isInt({ min: 1, max: 7 })
        .withMessage("Los días por semana deben estar entre 1 y 7.")
        .toInt(),

    body("sessionMinutes")
        .optional()
        .isInt({ min: 10, max: 240 })
        .withMessage("Los minutos por sesión deben estar entre 10 y 240.")
        .toInt(),

    body("availableEquipment")
        .optional()
        .isArray()
        .withMessage("El equipo disponible debe ser un arreglo."),

    body("availableEquipment.*")
        .isIn(EQUIPMENT)
        .withMessage(`Equipo inválido. Valores permitidos: ${EQUIPMENT.join(", ")}.`),

    handleValidationErrors
];