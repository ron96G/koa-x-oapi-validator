import express from 'express';
import Koa from 'koa';
import DEBUG from 'debug';
import * as OpenAPIValidator from 'express-openapi-validator';
import { OpenApiRequestHandler } from 'express-openapi-validator/dist/framework/types';
import { Context, OpenAPIValidationOpts, ErrorHandler, Handler } from './types';
import { isMultipartFormData } from './util';

const debug = DEBUG('validator:openapi');

export class KoaOpenAPIValidator {
  protected readonly expressApp: express.Express;
  protected readonly connectMiddlewares: Array<OpenApiRequestHandler>;

  public readonly opts: OpenAPIValidationOpts;

  /**
   * Create a new Validator Instance that may be used to create
   * koa validation middlewares using {@link KoaOpenAPIValidator.useValidation}.
   * @param opts OpenAPIValidationOpts
   */
  public constructor(opts: OpenAPIValidationOpts) {
    this.opts = opts;
    this.expressApp = express();
    this.connectMiddlewares = OpenAPIValidator.middleware(this.opts);
    this.setupExpressApp();
  }

  /**
   * Setup the express app by disabling some unwanted default features,
   * adding the express-openapi-validator middlewares
   * and the errorHandler.
   */
  private setupExpressApp() {
    this.expressApp.disable('etag');
    this.expressApp.disable('x-powered-by');

    this.expressApp
      .use(this.ignoreExpressResponse)
      .use(this.connectMiddlewares);

    if (!this.opts.validateResponses) {
      this.expressApp.use((req) => req.emit('valid'));
    } else {
      this.expressApp
        .use(this.validateResponse)
        .use((_, res) => res.emit('valid'));
    }

    this.expressApp.use(this.errorHandler);
  }

  /**
   * Overwrite the {@link express.Response.json} to avoid sending
   * any data to the client and (stealing from/)interfering with Koa.
   * @param _
   * @param res
   * @param next
   */
  private ignoreExpressResponse: Handler = (_, res, next) => {
    res.json = (_) => res;
    next();
  };

  /**
   * Is executed after the `express-openapi-validator` middlewares and
   * emits the `valid` event for requests.
   * Listens on the `validate` event for response and if received,
   * validates the response-body using the `express-openapi-validator` lib.
   * @param req
   * @param res
   * @param next
   * @returns
   */
  private validateResponse: Handler = (req, res, next) => {
    const promise = new Promise<void>((resolve, reject) => {
      res.on('validate', () => {
        debug('response validate received');
        const contentType = res.getHeader('content-type');
        // express-openapi-validator also only supports json
        if (typeof contentType == 'string' && contentType.includes('json')) {
          try {
            // express-openapi-validator binds the validation of the response
            // to this function. The original function was overwritten two times:
            // (1) by {@link KoaOpenAPIValidator.ignoreExpressResponse}
            // and then (2) by express-openapi-validator which inturn calls (1).
            res.json(res._body);
          } catch (e) {
            debug('failed to validate response body', 'error', e);
            reject(e);
          }
        } else {
          debug('Only response of type json can be validated. Ignoring...');
        }
        debug('Resolving final express promise');
        res.validated = true;
        resolve(next());
      });
    });

    req.emit('valid');

    return promise;
  };

  /**
   * Express error handler that emits the `invalid` event on req
   * and sets the error in `res.error`.
   */
  private errorHandler: ErrorHandler = (err, req, res, next) => {
    debug('in error-handler', 'req', req.validated, 'res', res.validated);

    if (req.validated) {
      debug('in error-handler: res');
      res.emit('invalid', err);
    } else {
      debug('in error-handler: req');
      req.emit('invalid', err);
    }
    next();
  };

  /**
   * Get a new promise that rejects when the underlying request receives
   * an `invalid` event and resolves when an `valid` event is received.
   * **Only works once.**
   * @param ctx
   * @param next
   * @returns
   */
  private getRequestValidationPromise(
    ctx: Context,
    next: Koa.Next
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ctx.req.once('invalid', (err) => {
        debug('req validation result received invalid');
        reject(err);
      });
      ctx.req.once('valid', () => {
        debug('req validation result received valid');

        if (this.opts.fileUploader && isMultipartFormData(ctx.req)) {
          // copy the multer file(s) to the Koa context
          ctx.files = ctx.req.files;
          ctx.file = ctx.req.file;
          debug('fileUploader: formdata text body data:');
          debug(ctx.req.body);
          ctx.request.body = ctx.req.body;
        }

        if (!this.opts.validateResponses) {
          debug('calling upstream koa handler');
          resolve(next());
        } else {
          debug('resolving promise');
          resolve();
        }
      });
    });
  }

  /**
   * Get a new promise that rejects when the underlying response receives
   * an `invalid` event and resolves when an `valid` event is received.
   * **Only works once.**
   * @param ctx
   * @returns
   */
  private getResponseValidationPromise(ctx: Context): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ctx.res.once('invalid', (err) => {
        debug('res validation result received invalid');
        reject(err);
      });
      ctx.res.once('valid', () => {
        debug('res validation result received valid');
        resolve();
      });
    });
  }

  /**
   * Return a koa middleware that validates all incoming requests
   * against the openAPI spec of {@link KoaOpenAPIValidator} class.
   * > Requires the `koa-bodyparser` to be installed.
   * @returns
   */
  public use(): Koa.Middleware {
    return async (ctx: Context, next) => {
      ctx.req.body = ctx.request.body;

      const reqValidatePromise = this.getRequestValidationPromise(ctx, next);

      this.expressApp(ctx.req, ctx.res);

      if (!this.opts.validateResponses) {
        return reqValidatePromise;
      }

      debug('awaiting validation promise');
      await reqValidatePromise;
      ctx.req.validated = true;

      debug('awaiting upstream koa handler');
      await next();

      const resValidatePromise = this.getResponseValidationPromise(ctx);
      debug('emitting response validate');
      ctx.res._body = ctx.body;
      ctx.res.emit('validate');

      return resValidatePromise;
    };
  }
}
