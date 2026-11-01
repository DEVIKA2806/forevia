const prisma = require("../config/prisma");
const {
  parseNumber,
  parseChoice,
  parseOptionalText,
} = require("../utils/validation");

// Allowed values for the choice fields. Keeping them here (rather than as
// a Prisma enum) means adding an option later doesn't require a database
// migration, which is useful while the product is still taking shape.
const GENDERS = ["female", "male", "other", "prefer_not_to_say"];
const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active"];
const SMOKING_STATUSES = ["never", "occasionally", "regularly", "former"];
const ALCOHOL_LEVELS = ["never", "occasionally", "regularly"];

/**
 * GET /api/health-profile
 *
 * Returns the authenticated user's health profile, or null if they
 * haven't filled it in yet (null is a normal state, not an error — the
 * frontend uses it to decide between "Complete" and "Edit").
 *
 * The user id comes from req.user, which requireAuth derived from the
 * verified JWT cookie. There is no id in the URL or body, so one user
 * cannot request another user's profile by changing a parameter.
 */
async function getHealthProfile(req, res) {
  try {
    const profile = await prisma.healthProfile.findUnique({
      where: { userId: req.user.id },
    });

    return res.status(200).json({ profile: profile || null });
  } catch (error) {
    // Log only that the operation failed, never the record itself —
    // health data must not end up in server logs.
    console.error("Get health profile failed.");
    return res
      .status(500)
      .json({ message: "Unable to load your health profile." });
  }
}

/**
 * PUT /api/health-profile
 *
 * Creates the profile on first save and updates it afterwards, via
 * Prisma's upsert. Using one endpoint for both keeps the frontend simple:
 * it always sends the full form and doesn't need to know whether a record
 * already exists.
 */
async function saveHealthProfile(req, res) {
  try {
    const body = req.body || {};
    const errors = {};
    const data = {};

    const age = parseNumber(body.age, {
      label: "Age",
      min: 13,
      max: 120,
      integer: true,
    });
    if (age.error) errors.age = age.error;
    else data.age = age.value;

    const gender = parseChoice(body.gender, {
      label: "Gender",
      allowed: GENDERS,
    });
    if (gender.error) errors.gender = gender.error;
    else data.gender = gender.value;

    const heightCm = parseNumber(body.heightCm, {
      label: "Height",
      min: 50,
      max: 260,
    });
    if (heightCm.error) errors.heightCm = heightCm.error;
    else data.heightCm = heightCm.value;

    const weightKg = parseNumber(body.weightKg, {
      label: "Weight",
      min: 20,
      max: 400,
    });
    if (weightKg.error) errors.weightKg = weightKg.error;
    else data.weightKg = weightKg.value;

    const activityLevel = parseChoice(body.activityLevel, {
      label: "Physical activity level",
      allowed: ACTIVITY_LEVELS,
    });
    if (activityLevel.error) errors.activityLevel = activityLevel.error;
    else data.activityLevel = activityLevel.value;

    const sleepHours = parseNumber(body.sleepHours, {
      label: "Sleep duration",
      min: 0,
      max: 24,
    });
    if (sleepHours.error) errors.sleepHours = sleepHours.error;
    else data.sleepHours = sleepHours.value;

    const smokingStatus = parseChoice(body.smokingStatus, {
      label: "Smoking status",
      allowed: SMOKING_STATUSES,
    });
    if (smokingStatus.error) errors.smokingStatus = smokingStatus.error;
    else data.smokingStatus = smokingStatus.value;

    const alcoholUse = parseChoice(body.alcoholUse, {
      label: "Alcohol consumption",
      allowed: ALCOHOL_LEVELS,
    });
    if (alcoholUse.error) errors.alcoholUse = alcoholUse.error;
    else data.alcoholUse = alcoholUse.value;

    const conditions = parseOptionalText(body.conditions, {
      label: "Lifestyle-related conditions",
    });
    if (conditions.error) errors.conditions = conditions.error;
    else data.conditions = conditions.value;

    const healthGoals = parseOptionalText(body.healthGoals, {
      label: "Health goals",
    });
    if (healthGoals.error) errors.healthGoals = healthGoals.error;
    else data.healthGoals = healthGoals.value;

    if (Object.keys(errors).length > 0) {
      return res
        .status(400)
        .json({ message: "Please correct the highlighted fields.", errors });
    }

    const profile = await prisma.healthProfile.upsert({
      where: { userId: req.user.id },
      create: { ...data, userId: req.user.id },
      update: data,
    });

    return res.status(200).json({ profile });
  } catch (error) {
    console.error("Save health profile failed.");
    return res
      .status(500)
      .json({ message: "Unable to save your health profile." });
  }
}

module.exports = { getHealthProfile, saveHealthProfile };
