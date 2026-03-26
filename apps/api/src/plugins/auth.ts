import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string | null;
  }
}

export default fp(async (app: FastifyInstance) => {
  app.decorateRequest('userId', null);

  app.addHook('onRequest', async (request) => {
    try {
      await request.jwtVerify({ onlyCookie: true });
      request.userId = (request.user as { steamId: string }).steamId;
    } catch {
      request.userId = null;
    }
  });
});
