const prisma = require("../config/prisma");

const MAX_NAME_LENGTH = 80;

// Same shape the auth controller returns, so the frontend sees a
// consistent `user` object no matter which endpoint it came from.
// createdAt is included here because the profile page displays it.
function toSafeUser(user) {
  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    createdAt: user.createdAt,
  };
}

/**
 * GET /api/user/profile
 *
 * requireAuth has already verified the JWT cookie and attached the
 * authenticated user to req.user, so there is no user id in the request
 * body or query — the identity comes only from the verified token. That
 * means a user can never fetch someone else's profile by changing a
 * parameter.
 */
async function getProfile(req, res) {
  try {
    return res.status(200).json({ user: toSafeUser(req.user) });
  } catch (error) {
    console.error("Get profile failed.");
    return res
      .status(500)
      .json({ message: "Unable to load your profile. Please try again." });
  }
}

/**
 * PATCH /api/user/profile
 *
 * Updates only the full name. Email is deliberately not updatable here:
 * changing a login identifier safely needs a verification flow (confirm
 * the new address actually belongs to the user, handle collisions with
 * existing accounts), which isn't built yet. Any `email` sent in the body
 * is simply ignored rather than trusted.
 */
async function updateProfile(req, res) {
  try {
    const body = req.body || {};
    // Not a string (number, array, object, no body) counts as missing.
    const name = typeof body.name === "string" ? body.name.trim() : "";

    // Server-side validation, independent of the frontend's — a request
    // can always be sent directly to the API, bypassing the form.
    if (!name) {
      return res.status(400).json({ message: "Full name is required." });
    }
    if (name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({
        message: `Full name must be ${MAX_NAME_LENGTH} characters or fewer.`,
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id }, // id from the verified token, not the body
      data: { fullName: name },
    });

    return res.status(200).json({ user: toSafeUser(updatedUser) });
  } catch (error) {
    console.error("Update profile failed.");
    return res
      .status(500)
      .json({ message: "Unable to update your profile. Please try again." });
  }
}

module.exports = { getProfile, updateProfile };
