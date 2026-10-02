import { throwServerError, throwConflictError }  from "../errors/throwHTTPErrors.js";

export const validateExerciseType = (requiredType = "strength") => {
    return (req, res, next) => {
        try {
            if (!req.exercise) {
                return throwServerError("There's not a req.exercise object");
            }     
            
            const currentType = req.exercise.type;
            if (currentType !== requiredType) {
                return throwConflictError(undefined, `El tipo de ejercicio no coincide. Tipo esperado: ${requiredType === "strength" ? "fuerza": "cardio"}`);
            }
            next();
        } catch (error) {
            next(error);
        }
    };
};

export default validateExerciseType;
