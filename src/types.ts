import { IncomingMessage, ServerResponse } from 'http';
import express from 'express';
import Koa from 'koa';
import { OpenApiValidatorOpts } from 'express-openapi-validator/dist/framework/types';

export type OpenAPIValidationOpts = OpenApiValidatorOpts;

/**
 * Customized express request
 */
export interface ValidationRequest extends express.Request {
  /** Indicated that the request was validated, but not the result of the validation. */
  validated?: boolean;
}

/**
 * Customized express response
 */
export interface ValidationResponse extends express.Response {
  /** koa response body */
  _body: any;
  /** Indicated that the request was validated, but not the result of the validation. */
  validated?: boolean;
}

/**
 * Customized {@link express.RequestHandler}
 */
export type Handler = (
  req: ValidationRequest,
  res: ValidationResponse,
  next: express.NextFunction
) => any;

/**
 * Customized {@link express.ErrorRequestHandler}
 */
export type ErrorHandler = (
  err: Error,
  req: ValidationRequest,
  res: ValidationResponse,
  next: express.NextFunction
) => any;

/**
 * customized http request
 */
export interface Req extends IncomingMessage {
  /** store the koa request body in here so it may be accessed from express. */
  body?: any;
  /** Indicated that the request was validated, but not the result of the validation. */
  validated?: boolean;
  /** Multer files when using any */
  files?: any;
  /** Multer files when using single */
  file?: any;
}

/**
 * customized http response
 */
export interface Res extends ServerResponse {
  /** store the koa response body in here so it may be accessed from express scope. */
  _body?: any;
  /** Indicated that the request was validated, but not the result of the validation. */
  validated?: boolean;
}

/**
 * Customized Koa Context
 */
export interface Context extends Koa.ExtendableContext {
  req: Req;
  res: Res;
  /** Multer files when using any */
  files?: any;
  /** Multer files when using single */
  file?: any;
}
