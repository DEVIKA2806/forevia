const prisma = require("../config/prisma");
const { COOKIE_NAME, verifyToken } = require("../utils/token");

/**
 * Protects a route. Reads the JWT from the httpOnly cookie, verifies it,
 * looks up the user it belongs to, and attaches that user to req.user.
 * If anything is missing or invalid, responds 401 immediately instead of
 * calling next() — this is what actually makes a route "protected", as
 * opposed to the frontend simply choosing not to render a page.
 *
 * Never trust a userId supplied by the frontend (e.g. in the request body
 * or a query param) for authentication — the only trustworthy source of
 * "who is this request from" is a userId that came out of a verified JWT.
 */
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    const payload = verifyToken(token); // throws on invalid/expired token

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      // Token is validly signed but points to a user that no longer
      // exists (e.g. account deleted) — treat as unauthenticated.
      return res.status(401).json({ message: "Not authenticated." });
    }

    req.user = user;
    next();
  } catch (error) {
    // Covers jwt.verify failures: invalid signature, malformed token, or
    // TokenExpiredError. All of these mean "not a valid session."
    return res.status(401).json({ message: "Not authenticated." });
  }
}

module.exports = requireAuth;
