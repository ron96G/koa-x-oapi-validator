import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { KoaOpenAPIValidator } from '../../src';

export class ValidatedServer {
  app: Koa;
  router: Router;
  handler: (req, res) => void;

  constructor() {
    this.app = new Koa();
    this.router = new Router();
    this.handler = this.app.callback();
  }

  protected async init(): Promise<void> {
    const validator = new KoaOpenAPIValidator({
      apiSpec: OPENAPI_SPEC,
      validateRequests: true,
      validateResponses: true,
    });

    this.router.post('/good', validator.use(), async (ctx: Koa.Context) => {
      ctx.status = 202;
      ctx.body = {
        id: 123,
        name: 'foo',
        opt: 'bar',
      };
    });

    this.router.post('/bad', validator.use(), (ctx) => {
      ctx.status = 202;
      ctx.body = {
        id: 123,
        name: 'foo',
        opt: 456,
      };
    });

    this.app.use(bodyParser({ enableTypes: ['json', 'xml', 'text'] }));
    this.app.use(this.router.routes()).use(this.router.allowedMethods());
  }

  public async start() {
    await this.init();
  }
}

export const OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'Test API',
    version: '0.0.1',
    description: 'An OpenAPI document to test koa-openapi-validator',
  },
  servers: [
    {
      url: 'http://localhost:3000',
    },
  ],
  paths: {
    '/good': {
      post: {
        operationId: 'goodResponse',
        responses: {
          '202': {
            description: 'A good response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Response',
                },
              },
            },
          },
        },
        requestBody: {
          description: 'A good request',
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Request',
              },
            },
          },
        },
      },
    },
    '/bad': {
      post: {
        operationId: 'badResponse',
        responses: {
          '202': {
            description: 'A bad response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Response',
                },
              },
            },
          },
        },
        requestBody: {
          description: 'A good request',
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Request',
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Response: {
        required: ['id', 'name'],
        properties: {
          id: {
            type: 'integer',
            format: 'int64',
          },
          name: {
            type: 'string',
          },
          opt: {
            type: 'string',
          },
        },
      },
      Request: {
        required: ['id', 'name', 'reason'],
        properties: {
          id: {
            type: 'integer',
            format: 'int64',
          },
          name: {
            type: 'string',
          },
          reason: {
            type: 'string',
          },
        },
      },
    },
  },
} as any;
