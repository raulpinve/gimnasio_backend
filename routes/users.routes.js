const router = require("express").Router();
const usersControllers = require("../controllers/users.controller");
const { validateUpdateProfile } = require("../validators/user.validators");

router.get(
    "/stats",
    usersControllers.getUserStats
);

router.put("/", 
    validateUpdateProfile,
    usersControllers.updateProfile
)

module.exports = router;
