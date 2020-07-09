import { Request, Response, NextFunction } from 'express';
import { HttpError, InternalServerError } from 'http-errors';

export default function errorHandler(error: HttpError, _req: Request, res: Response, next: NextFunction) {
  let httpError = error;

  if (!error.status) {
    httpError = new InternalServerError(error.message);
  }

  if (httpError) {
    res.status(httpError.status).json({
      name: httpError.name,
      ...httpError,
    });
  }

  next();
}
