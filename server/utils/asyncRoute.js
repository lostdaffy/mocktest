/**
 * Wraps an async route handler so a thrown error reaches Express.
 *
 * Express 4 does not await handlers. When an async one rejects, the rejection
 * is simply unhandled: no reply is ever sent, and the request hangs until the
 * client gives up. The phone shows a spinner forever - no error screen, no
 * retry, nothing in the logs tied to that request.
 *
 * It is not a hypothetical. `GET /tests/attempts/:id` with an id Mongo cannot
 * parse threw a CastError, and the request never came back. Of 121 handlers,
 * about seventy-five had no try/catch of their own and behaved the same way.
 *
 * With this, any such error goes to the error handler in server.js, which
 * replies with a short id the student can quote and logs the stack under it.
 */
module.exports = function asyncRoute(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};
