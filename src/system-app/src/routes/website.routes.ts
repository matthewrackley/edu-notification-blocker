import { Router } from 'express';
import { getWebsiteState, postWebsiteEvent } from '../controllers/website.controller';

/**
 * Routes for website event handling and state retrieval.
 * Base path: /website
 * Endpoints:
 * - POST /event: Receive events from the website.
 * - GET /state: Provide current state info to the website.
 */
const router = Router();

router.post('/event', postWebsiteEvent);
router.get('/state', getWebsiteState);

export default router;
