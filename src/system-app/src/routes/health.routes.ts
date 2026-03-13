import { Router } from 'express';
import { getHealth } from '../controllers/health.controller';

/**
 * Routes for health check endpoint.
 * Base path: /health
 * Endpoints:
 * - GET /: Check if the server is running and healthy.
 */
const router = Router();

router.get('/', getHealth);

export default router;
