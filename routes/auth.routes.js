const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { validateRegister, validateLogin } = require('../validators/auth.validators');

// Signup
router.post('/register', 
    validateRegister,
    authController.register
);

// Login
router.post('/login', 
    validateLogin, 
    authController.login
);

// About me
router.get("/me", 
    authController.authenticateToken,
    authController.me
)

router.post("/autheticate-token", 
    authController.authenticateToken,
    authController.me
)

module.exports = router
