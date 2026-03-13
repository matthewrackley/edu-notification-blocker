import { Router } from 'express';
import {
	getInstallationConfig,
	getInstallationConfigEditor,
	updateInstallationConfig,
	updateInstallationConfigFromForm
} from '../controllers/config.controller';

/**
 * Routes for installation configuration management.
 * Base path: /config
 * Endpoints:
 * - GET /: Fetch current installation config.
 * - POST /update: Apply partial config updates.
 * - GET /edit: Serve local config editor page.
 * - POST /edit: Handle form submissions from config editor.
 */
const router = Router();

router.get('/', getInstallationConfig);
router.post('/update', updateInstallationConfig);
router.get('/edit', getInstallationConfigEditor);
router.post('/edit', updateInstallationConfigFromForm);


export default router;
