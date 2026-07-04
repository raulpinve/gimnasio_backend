const router = require("express").Router();
const workoutsController = require("../controllers/workouts.controller");
const { validateRoutineId } = require("../validators/routines.validator");

const {
    validateWorkoutId,
    validateCreateWorkout,
    validateRoutineIdCampoOptional,
} = require("../validators/workouts.validator");

// Create workout
router.post(
    "/",
    validateRoutineIdCampoOptional,
    validateCreateWorkout,
    workoutsController.createWorkout
);

// Get workout by ID
router.get(
    "/:workoutId",
    validateWorkoutId,
    workoutsController.getWorkout
);

// Get workouts 
router.get(
    "/",
    workoutsController.getAllWorkouts
);

// Finish workout
router.patch(
    "/:workoutId/finish",
    validateWorkoutId,
    workoutsController.finishWorkout
);

// Delete workout
router.delete(
    "/:workoutId",
    validateWorkoutId,
    workoutsController.deleteWorkout
);

module.exports = router;