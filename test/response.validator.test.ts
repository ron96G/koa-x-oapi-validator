import { ValidatedServer } from './utils/common';
import request from 'supertest';

describe('Validator', () => {
  const server = new ValidatedServer();

  const validBody = {
    id: 123,
    name: 'foo',
    reason: 'no reason',
  };

  beforeAll(async () => {
    await server.start();
  });

  it('should reject invalid response body payload', async () => {
    const res = await request(server.handler)
      .post('/bad')
      .set('Authorization', 'Bearer p.body.p')
      .send(validBody);

    expect(res.statusCode).toEqual(500);
  });

  it('should allow response with valid body', async () => {
    const res = await request(server.handler)
      .post('/good')
      .set('Authorization', 'Bearer p.body.p')
      .send(validBody);

    expect(res.statusCode).toEqual(202);
  });
});
