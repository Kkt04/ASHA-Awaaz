import handler from '../frontend/api/index.js';

export default async function rootHandler(req, res) {
  return handler(req, res);
}
