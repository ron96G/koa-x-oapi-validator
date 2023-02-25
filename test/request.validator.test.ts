import { ValidatedServer } from './utils/common';
import request from 'supertest';

describe('Validator', () => {
  const server = new ValidatedServer();

  const invalidBody = {
    id: 123,
    name: 'foo',
  };

  const validBody = {
    id: 123,
    name: 'foo',
    reason: 'no reason',
  };

  beforeAll(async () => {
    await server.start();
  });

  it('should reject invalid body payload', async () => {
    const res = await request(server.handler)
      .post('/good')
      .set('Authorization', 'Bearer p.body.p')
      .send(invalidBody);

    expect(res.statusCode).toEqual(400);
  });

  it('should allow request with valid body', async () => {
    const res = await request(server.handler)
      .post('/good')
      .set('Authorization', 'Bearer p.body.p')
      .send(validBody);

    expect(res.statusCode).toEqual(202);
  });
});
