import { Router } from 'express';
import { getSession, startSession } from '../controllers/session.controller';

/**
 * Routes for session management.
 * Base path: /session
 * Endpoints:
 * - POST /start: Start a new session.
 * - GET /: Get current session info.
 */
const router = Router();

router.post('/start', startSession);
router.get('/', getSession);

export default router;
