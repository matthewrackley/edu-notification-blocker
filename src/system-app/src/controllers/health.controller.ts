import { Request, Response } from 'express';

/**
 * Simply details if the system is running or not
 */
export const getHealth = (_req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    service: 'system-app',
    message: 'System app is running'
  });
};
