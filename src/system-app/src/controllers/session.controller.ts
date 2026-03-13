import { Request, Response } from 'express';
import { sessionService } from '../services/session.service';
import { wsService } from '../services/ws.service';

/**
 * Controller for handling session-related API endpoints.
 * This includes starting a new session and retrieving the current session data.
 * The main endpoints are:
 * - POST /session/start: Starts a new session and broadcasts a 'SESSION_STARTED' event to websocket clients with the new session data.
 * - GET /session: Retrieves the current session data.
 */

/**
 * This arrow function starts a session and broadcasts a websocket message
 */
export const startSession = (_req: Request, res: Response) => {
  const session = sessionService.startSession();

  // Broadcast 'SESSION_STARTED' event to websocket clients with the new session data
  wsService.broadcast({
    type: 'SESSION_STARTED',
    data: {
      message: 'A new session has started',
      session
    }
  });
  res.status(201).json({
    ok: true,
    session
  });
};

/**
 * This arrow function gets the current session.
 */
export const getSession = (_req: Request, res: Response) => {
  const session = sessionService.session;

  // Return the session data in the response
  return res.status(200).json({
    ok: true,
    session
  });
};
