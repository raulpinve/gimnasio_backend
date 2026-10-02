import { throwBadRequestError } from '../errors/throwHTTPErrors.js';

const checkWorkoutNotClosed = async (req, res, next) => {
    try {
        const isClosed = req?.workout?.finishedAt;

        if (isClosed) {
            throwBadRequestError(
                undefined,
                'No puedes modificar recursos sobre un workout finalizado.'
            );
        }

        next();
    } catch (error) {
        next(error);
    }
};

export default checkWorkoutNotClosed;