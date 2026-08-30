const { throwConflictError, throwBadRequestError } = require("../errors/throwHTTPErrors");

module.exports = checkWorkoutNotClosed = async (req, res, next) => {

    try {
        const isClosed = req?.workout?.finishedAt;
        if(isClosed){
            throwBadRequestError(undefined, "No puedes modificar recursos sobre un workout finalizado.")
        }    
        next();
    } catch (error) {
        next(error)        
    }
};