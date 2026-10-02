import { throwBadRequestErrorWithMultipleErrors } from '../errors/throwHTTPErrors.js';
import { validationResult } from 'express-validator';

const handleValidationErrors  = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throwBadRequestErrorWithMultipleErrors(errors);
    }
    next();
};

export default handleValidationErrors 