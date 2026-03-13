import cors from 'cors';
import express from 'express';

import healthRoutes from './routes/health.routes';
import sessionRoutes from './routes/session.routes';
import websiteRoutes from './routes/website.routes';
import configRoutes from './routes/config.routes';

/**
 * Creates and configures an Express application instance. This function sets up middleware for CORS and JSON parsing, and registers the routes for health checks, session management, and website activity tracking.
 * @returns {express.Application} The configured Express application instance.
 * @method createApp() - Initializes the Express application with necessary middleware and routes, and returns the app instance.
 */
export const createApp = (): express.Application => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use('/config', configRoutes);
  app.use('/health', healthRoutes);
  app.use('/session', sessionRoutes);
  app.use('/websites', websiteRoutes);

  return app;
}

export const app = createApp();
