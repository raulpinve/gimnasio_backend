import { throwBadRequestError } from '../errors/throwHTTPErrors.js';
import * as usersRepository from '../repositories/users.repository.js';

export const getUserStats = async (req, res, next) => {
    try {
        const { id: userId } = req.user;

        const [totalWorkouts, currentStreak] = await Promise.all([
            usersRepository.countCompletedWorkouts(userId),
            usersRepository.getCurrentStreak(userId)
        ]);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: { totalWorkouts, currentStreak }
        });
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (req, res, next) => {
    try {
        const { firebaseUid } = req.user;
        const { firstName, lastName } = req.body || {};

        if (typeof firstName !== 'string' || typeof lastName !== 'string'
            || !firstName.trim() || !lastName.trim()) {
            return throwBadRequestError("firstName y lastName son requeridos.");
        }

        // updateUserProfile ya devuelve el usuario en camelCase (camelcaseKeys)
        const updatedUser = await usersRepository.updateUserProfile(firebaseUid, {
            firstName: firstName.trim(),
            lastName: lastName.trim()
        });

        if (!updatedUser) {
            return throwBadRequestError("Usuario no encontrado");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Perfil actualizado",
            data: updatedUser
        });
    } catch (error) {
        next(error);
    }
};