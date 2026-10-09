import { Router } from 'express';
import { assignTemplate } from '../controllers/programTemplates.controller.js';
import { getAllTemplates, getTemplate } from '../controllers/programTemplates.admin.controller.js';
import { requireUser } from '../middlewares/auth.middlewares.js';
import {
    validateGetAllTemplates,
    validateTemplateId
} from '../validators/programTemplates.validator.js';

const router = Router();

// Cualquier usuario autenticado puede ver y elegir programas
router.use(requireUser);

router.get(
    "/",
    validateGetAllTemplates,
    getAllTemplates
);

router.get(
    "/:templateId",
    validateTemplateId,
    getTemplate
);

router.post(
    "/:templateId/assign",
    validateTemplateId,
    assignTemplate
);

export default router;