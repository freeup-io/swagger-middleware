import { Router, Handler, Request, Response, json, NextFunction } from 'express';
import YAML from 'yamljs';
import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPIV2 } from 'openapi-types';
import { MethodNotAllowed, BadRequest } from 'http-errors';
import Ajv from 'ajv';

interface Options {
  preMiddleware?: Handler[];
  postMiddleware?: Handler[];
}

export interface Controllers {
  [operationId: string]: Handler;
}

export enum HttpMethods {
  get,
  post,
  put,
  delete,
}

const swaggerPathToExpress = (swaggerPath: string) => swaggerPath.replace(/{(.+?)}/g, (_, group) => `:${group}`);

const methodNotAllowedHandler = (_req: Request, _res: Response, next: Function) => {
  next(new MethodNotAllowed());
};

const processAsyncHandler = (handler: Handler) => (req: Request, res: Response, next: NextFunction) => {
  handler(req, res, next).catch((e: Error) => next(e));
};

const getBodySchema = (params: any) => {
  const bodyParam = params?.find((p: any) => p.in === 'body');
  return bodyParam?.schema || {};
};

const ajv = new Ajv({ allErrors: true });

const validateRequest = (parameters: OpenAPIV2.Parameters) => {
  const validateBody = ajv.compile(getBodySchema(parameters));

  return (req: Request, _res: Response, next: Function) => {
    const isRequestValid = validateBody(req.body);
    if (!isRequestValid) {
      const reason = ajv.errorsText(validateBody.errors);
      const error = new BadRequest(reason);
      next(error);
      return;
    }

    next();
  };
};

function defineRoutes(paths: OpenAPIV2.PathsObject, controllers: Controllers): Router {
  const router = Router();
  router.use(json());

  Object.entries(paths).forEach(([swaggerPath, pathDef]) => {
    const path = swaggerPathToExpress(swaggerPath);

    Object.entries(pathDef).forEach(([method, methodDef]: [keyof typeof HttpMethods, OpenAPIV2.OperationObject]) => {
      const { operationId } = methodDef;
      const controller = controllers[operationId];

      if (!operationId) {
        throw new Error(`OperationID is not defined for ${method} ${path}`);
      }

      if (!controller) {
        throw new Error(`Handler is not defined for operationId: ${operationId}`);
      }

      router.route(path)[method](validateRequest(methodDef.parameters))[method](processAsyncHandler(controller));
    });

    router.all(path, methodNotAllowedHandler);
  });

  return router;
}

const defaultOptions: Options = {
  preMiddleware: [],
  postMiddleware: [],
};

export default function swagger(
  swaggerFile: string,
  controllers: Controllers,
  { preMiddleware, postMiddleware }: Options = defaultOptions
): Router {
  // the file is loaded synchronously to avoid initialising Express asynchronously
  const apiDefinition = YAML.load(swaggerFile);
  const router = Router();

  preMiddleware.forEach((mw: Handler) => router.use(mw));

  SwaggerParser.validate(apiDefinition, (err, api: OpenAPIV2.Document) => {
    if (err) {
      throw err;
    }
    const { basePath } = api;

    router.use(basePath, defineRoutes(api.paths, controllers));

    postMiddleware.forEach((mw: Handler) => router.use(mw));
  });

  return router;
}
