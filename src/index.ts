import { KoaOpenAPIValidator } from './openapi-validator';
import { OpenAPIValidationOpts } from './types';

let globalOpenAPIValidator: KoaOpenAPIValidator;

/**
 * Init the global koa OpenAPIValidator
 * @param opts
 */
function init(opts: OpenAPIValidationOpts) {
  if (globalOpenAPIValidator) {
    throw new Error('global validator has already been initialized');
  }
  globalOpenAPIValidator = new KoaOpenAPIValidator(opts);
}

/**
 * Use a koa middleware provided by the global OpenAPIValidator
 * @returns
 */
function use() {
  if (!globalOpenAPIValidator) {
    throw new Error('global validator has not been initialized');
  }
  return globalOpenAPIValidator.use();
}

export {
  KoaOpenAPIValidator,
  OpenAPIValidationOpts,
  init as initValidation,
  use as useValidation,
};
