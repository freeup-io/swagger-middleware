import request, { SuperTest, Test } from 'supertest';
import express, { Express, Handler, Request, Response } from 'express';

import swagger, { Controllers, HttpMethods } from '../src/swagger';

const suspiciousMethod = jest.fn();
const createMockHandler = (): Handler => async (_req: Request, res: Response) => {
  await suspiciousMethod();
  res.status(200).end();
};

describe('swagger middleware', () => {
  let app: Express;
  let api: Controllers;
  let server: SuperTest<Test>;

  beforeAll(() => {
    app = express();
    api = {
      listPets: createMockHandler(),
      createPets: createMockHandler(),
      showPetById: createMockHandler(),
      deletePet: createMockHandler(),
      updatePet: createMockHandler(),
    };

    app.use(swagger('./test/fixtures/petstore.yaml', api));
    server = request(app);
  });

  describe('when routes are defined', () => {
    it.each([
      ['get', '/v1/pets'],
      ['post', '/v1/pets'],
      ['get', '/v1/pets/123'],
      ['delete', '/v1/pets/123'],
      ['put', '/v1/pets/123'],
    ])('creates a handler for %s %s', async (method: keyof typeof HttpMethods, path: string) => {
      const response = await server[method](path);
      expect(response.status).toBe(200);
    });

    it('returns 405 when a path does not support the verb', async () => {
      const response = await server.delete('/v1/pets');
      expect(response.status).toBe(405);
    });
  });

  describe('when request has a schema', () => {
    describe('when request does not match schema', () => {
      it('returns 400', async () => {
        const response = await server.post('/v1/pets').send({
          name: 123,
        });

        expect(response).toMatchObject({
          status: 400,
          body: {},
        });
      });
    });
  });

  describe('when handler fails', () => {
    describe('when handler throws sync error', () => {
      beforeEach(() => {
        suspiciousMethod.mockImplementationOnce(() => {
          throw new Error('Some internal error');
        });
      });

      it('returns 500', async () => {
        const response = await server.get('/v1/pets');

        expect(response).toMatchObject({
          status: 500,
          body: {},
        });
      });
    });

    describe('when handler throws async error', () => {
      beforeEach(() => {
        suspiciousMethod.mockImplementationOnce(async () => {
          throw new Error('Some internal error');
        });
      });

      it('returns 500', async () => {
        const response = await server.get('/v1/pets');

        expect(response).toMatchObject({
          status: 500,
          body: {},
        });
      });
    });
  });
});
