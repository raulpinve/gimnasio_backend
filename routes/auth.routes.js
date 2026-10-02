import { Router } from 'express';
import { authenticateToken, handleAuthMe, login, me, register } from '../controllers/auth.controller.js';
import {
    validateRegister,
    validateLogin
} from '../validators/auth.validators.js';

const router = Router();

// Signup
router.post('/register', 
    validateRegister,
    register
);

// Login
router.post('/login', 
    validateLogin, 
    login
);

// About me
router.get("/me", 
    authenticateToken,
    me
)

router.post('/me', 
    authenticateToken, 
    handleAuthMe
); 

router.post("/autheticate-token", 
    authenticateToken,
    me
)

export default router
