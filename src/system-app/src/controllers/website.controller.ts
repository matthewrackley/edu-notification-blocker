import { NextFunction, Request, Response } from 'express';
import { sessionService } from '../services/session.service';
import { websiteActivityService } from '../services/website-activity.service';
import { WebsiteEventPayload } from '../types/website.types';
import { watchedWebsitesService } from '../services/watched-websites.service';



/**
 * Controller for handling website-related API endpoints.
 * This includes processing website events sent from the client and retrieving the current state of monitored websites.
 * The main endpoints are:
 * - POST /website/event: Receives website event payloads (e.g., ENTER, LEAVE, UPDATE, CLOSE, HEARTBEAT) and updates the website activity state accordingly.
 * - GET /website/state: Retrieves the current state of active websites being monitored.
 */
const buildMatchedWebsiteResponse = (
  match: ReturnType<typeof watchedWebsitesService.getMatch>
) => ({
  provider: match.provider,
  matchedHostname: match.matchedHostname,
  reason: match.reason
});

/**
 * Helper function to handle website events and update session activity.
 * @param event - The website event payload containing details about the event.
 * @returns A promise that resolves to the updated website state after handling the event.
 */
const handleTrackedEvent = async (event: WebsiteEventPayload) => {
  //
  sessionService.updateSession();
  return await websiteActivityService.handleEvent(event);
};

/**
 * Helper function to standardize API responses.
 * @param res - The Express Response object used to send the response.
 * @param status - The HTTP status code for the response.
 * @param data - The data to include in the response body, which can be either a string message or an object. If a string is provided, it will be included in the response as a "message" field. If an object is provided, its properties will be spread into the response body.
 * @returns An Express Response with a standardized JSON structure containing an "ok" field indicating success or failure, and either a "message" field (if a string was provided) or the properties of the provided object.
 */
const handleResponse = <S extends string | object>(res: Response, status: number, ...data: S extends object ? [body: S] : S extends string | `${string}${string}` ? [message: S] : never) => {

  // if the third argument is a string, we return it as a message field, otherwise we spread the object into the response as body
  const body = typeof data[0] === "string" ? { message: data[0] } : { ...data[0] };

  // status is 2xx or 3xx, we consider it a successful response and set ok to true, otherwise false
  return res.status(status).json({
    ok: status >= 200 && status < 400 ? true : false,
    ...body
  });
}

/**
 * Helper function to handle exit events `LEAVE` and `CLOSE` by constructing the appropriate event payload and updating the website activity state.
 * @param req - The Express request object containing the event payload in the body.
 * @param res - The Express response object used to send the response back to the client.
 * @returns A promise that resolves to the updated website state after handling the exit event.
 */
const handleExitEvents = async (req: Request<unknown, unknown, WebsiteEventPayload>, res: Response) => {
  const { type, tabId, windowId, timestamp } = req.body;
  return handleResponse(res, 200, {
    // If type is CLOSE, we want to send a CLOSE event to revert to pre watched state
    // If type is LEAVE, we want to modify trackedCount
    state: await handleTrackedEvent(type === "CLOSE" ? { type, windowId, timestamp } : { type: "LEAVE", tabId, windowId, timestamp } as WebsiteEventPayload)
  });
}

/**
 * Helper function to handle the update event `UPDATE` by validating the event payload, checking for matches against watched websites, and updating the website activity state accordingly.
 * @param req - The Express request object containing the event payload in the body.
 * @param res - The Express response object used to send the response back to the client.
 * @returns A promise that resolves to an object containing the updated website state and any relevant information about matched watched websites or reasons for ignoring the event.
 */
const handleUpdateEvent = async (req: Request<unknown, unknown, WebsiteEventPayload>, res: Response) => {
  const { type, hostname, url, windowId, tabId, timestamp } = req.body;

  // if hostname/url is missing, we treat it as a leave event since we can no longer consider the tab to be on the watched website
  if (!hostname || !url) {

    // Send a LEAVE event to update the state and remove the tracked tab
    return handleResponse(res, 200, {
      state: await handleTrackedEvent({ type: "LEAVE", windowId, tabId, timestamp }),
      eventHandledAs: "LEAVE",
      message: 'Tab updated away from watched website'
    });
  } else {

    // get match data for the updated hostname
    const match = watchedWebsitesService.getMatch(hostname);

    // if the updated hostname is not watched
    if (!match.isWatched) {

      // Handle event as a LEAVE to update the state and remove the tracked tab since it is no longer on a watched website
      return handleResponse(res, 200, {
        state: await handleTrackedEvent({ type: "LEAVE", windowId, tabId, timestamp }),
        ignored: true,
        eventHandledAs: "LEAVE",
        message: 'Updated hostname is not watched, tracked tab removed'
      });
    } else {

      // since it's matched to a watched website still, we simply UPDATE
      return handleResponse(res, 200, {
        state: await handleTrackedEvent({ hostname, url, tabId, windowId, timestamp, type }),
        matchedWebsite: buildMatchedWebsiteResponse(match)
      });
    }
  }
}

/**
 * Helper function to handle active events `ENTER` and `HEARTBEAT` by validating the event payload, checking for matches against watched websites, and updating the website activity state accordingly.
 * @param req - The Express request object containing the event payload in the body.
 * @returns A promise that resolves to an object containing the updated website state and any relevant information about matched watched websites or reasons for ignoring the event.
 */
const handleActiveEvents = async (req: Request<unknown, unknown, WebsiteEventPayload>, res: Response) => {
  const { type, hostname, url, tabId, windowId, timestamp } = req.body;

  // get match data for the hostname
  const match = watchedWebsitesService.getMatch(hostname!);

  // if hostname is not watched
  if (!match.isWatched) {

    // We simply explain that
    return handleResponse(res, 200, {
      ignored: true,
      message: "Website is not watched",
      matchedWebsite: buildMatchedWebsiteResponse(match)
    });
  } else {

    // Otherwise we handle the event as normal and return the updated state along with matched website data
    return handleResponse(res, 200, {
      state: await handleTrackedEvent({ type, hostname, url, tabId, windowId, timestamp }),
      matchedWebsite: buildMatchedWebsiteResponse(match)
    });
  }
}

/**
 * Express handler for posting website events via POST method.
 * This endpoint processes incoming website event payloads, validates them, updates the session activity, and manages the state of active websites based on the event type. It handles different event types (ENTER, LEAVE, UPDATE, CLOSE, HEARTBEAT) and responds with the updated state of active websites, along with any relevant information about matched watched websites or reasons for ignoring events.
 * The handler also ensures that a session is active before processing events and returns appropriate error responses for invalid payloads or unsupported event types.
 */
export const postWebsiteEvent = async (
  req: Request<unknown, unknown, WebsiteEventPayload>,
  res: Response,
  next: NextFunction
) => {
  // Async function so we must use try/catch to handle errors and pass them to the next middleware
  try {

    // update current sessions last active timestamp
    sessionService.updateSession();
    const { type, hostname, url, tabId, windowId } = req.body;
    const requiresTabId = type === "ENTER" || type === "LEAVE" || type === "UPDATE" || type === "HEARTBEAT";

    // Handle all potential validation cases for the incoming event payload
    // type is falsy or windowId is not a number
    if (!type || typeof windowId !== 'number') {
      return handleResponse(res, 400, 'Invalid website event payload');
    }
    // type requires a tabId but it's missing or not a number
    if (requiresTabId && typeof tabId !== 'number') {
      return handleResponse(res, 400, `${type.toString()} requires a numeric tabId`);
    }
    // type is ENTER or HEARTBEAT but hostname or url is missing
    if ((type === 'ENTER' || type === 'HEARTBEAT') && (!hostname || !url)) {
      return handleResponse(res, 400, `${type.toString()} requires both hostname and url`);
    }
    // handle type specific logic in separate functions for better readability and maintainability
    switch (type) {
      case "CLOSE":
      case "LEAVE":
        return await handleExitEvents(req, res);
      case "UPDATE":
        return await handleUpdateEvent(req, res);
      case "ENTER":
      case "HEARTBEAT":
        return await handleActiveEvents(req, res);
      default:
        return handleResponse(res, 400, 'Unsupported website event type');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Express handler for getting website events via GET method.
 */
export const getWebsiteState = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    return handleResponse(res, 200, {
      state: await websiteActivityService.getState()
    });
  } catch (error) {
    next(error);
  }
};
