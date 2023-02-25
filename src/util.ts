import { IncomingMessage } from 'http';

export function isMultipartFormData(req: IncomingMessage) {
  return !!req.headers['content-type']?.startsWith('multipart/form-data');
}
