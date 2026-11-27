import type { IncomingMessage, ServerResponse } from 'http';
import handler from '../frontend/api/[...all]';

export default async function rootApiHandler(req: IncomingMessage, res: ServerResponse) {
  return handler(req, res);
}
