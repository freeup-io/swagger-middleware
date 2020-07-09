# swagger-middleware
This is an express middleware which generates express routes and validates requests based on a swagger definition.

## Motivation
There are many swagger middlewares out there (e.g. [swagger-routes-express](https://www.npmjs.com/package/swagger-routes-express), [swagger-express-middleware](https://www.npmjs.com/package/swagger-express-middleware)) but we found none of them offered the functionality we needed in a single package:

- generate routes and link them with handlers
- validate requests
- create uniform errors
- support async handlers

## Dependencies
- Express 4.0
- TypeScript

## Installation
```
npm install -S @earnd/swagger-middleware
```

## Example
```typescript
import swagger from '@earnd/swagger-middleware';
import express, { Request, Response } from 'express';

app = express();
api = {
listPets: (req: Request, res: Response) => res.end()
};

app.use(swagger('./petstore.yaml', api));
```
