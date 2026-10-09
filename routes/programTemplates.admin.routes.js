import { Router } from 'express';
import {
    createTemplate,
    deleteTemplate,
    getAllTemplates,
    getTemplate,
    replaceTemplate
} from '../controllers/programTemplates.admin.controller.js';
import { requireAdmin, requireUser } from '../middlewares/auth.middlewares.js';
import {
    validateGetAllTemplates,
    validateTemplate,
    validateTemplateId
} from '../validators/programTemplates.validator.js';

const router = Router();

// Todo este router es solo para administradores
router.use(requireUser, requireAdmin);

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
    "/",
    validateTemplate,
    createTemplate
);

router.put(
    "/:templateId",
    validateTemplateId,
    validateTemplate,
    replaceTemplate
);

router.delete(
    "/:templateId",
    validateTemplateId,
    deleteTemplate
);

export default router;