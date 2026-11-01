const prisma = require("../config/prisma");
const {
  MAX_GOALS_PER_USER,
  toIsoDate,
  serializeGoal,
  validateGoalInput,
} = require("../services/goal.service");

/**
 * Goals API. Every query below includes `userId: req.user.id`, which comes
 * from the verified JWT (see auth.middleware.js) and never from the URL,
 * query string or body. That is what stops one user from reading, editing
 * or deleting another's goals. A goal that belongs to someone else is
 * reported as 404, the same as one that doesn't exist, so the API doesn't
 * reveal which ids exist.
 */

const NOT_FOUND = { message: "Goal not found." };

// Goal ids are UUIDs. Anything longer than this can't be one, so skip the
// database entirely.
function readId(req) {
  const id = req.params.id;
  return typeof id === "string" && id.length > 0 && id.length <= 100 ? id : null;
}

/** GET /api/goals — the signed-in user's goals, newest first. */
async function listGoals(req, res) {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.user.id },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    });
    return res.status(200).json({ goals: goals.map(serializeGoal) });
  } catch (error) {
    // Never log goals: titles and amounts are personal data.
    console.error(
      `List goals failed (${(error && error.name) || "Error"}${error && error.code ? ` ${error.code}` : ""}).`
    );
    return res.status(500).json({ message: "Unable to load your goals." });
  }
}

/** POST /api/goals */
async function createGoal(req, res) {
  try {
    const result = validateGoalInput(req.body);
    if (result.errors) {
      return res
        .status(400)
        .json({ message: "Please correct the highlighted fields.", errors: result.errors });
    }

    const count = await prisma.goal.count({ where: { userId: req.user.id } });
    if (count >= MAX_GOALS_PER_USER) {
      return res.status(400).json({
        message: `You can track up to ${MAX_GOALS_PER_USER} goals. Delete one to add another.`,
      });
    }

    const goal = await prisma.goal.create({
      data: { ...result.data, userId: req.user.id },
    });
    return res.status(201).json({ goal: serializeGoal(goal) });
  } catch (error) {
    console.error("Create goal failed.");
    return res.status(500).json({ message: "Unable to save your goal." });
  }
}

/**
 * PUT /api/goals/:id — replaces the four editable fields. An omitted or
 * empty targetDate clears the date, the same "full save" behaviour as the
 * profile endpoints.
 */
async function updateGoal(req, res) {
  try {
    const id = readId(req);
    if (!id) return res.status(404).json(NOT_FOUND);

    const existing = await prisma.goal.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json(NOT_FOUND);

    const result = validateGoalInput(req.body, {
      previousTargetDate: existing.targetDate ? toIsoDate(existing.targetDate) : null,
    });
    if (result.errors) {
      return res
        .status(400)
        .json({ message: "Please correct the highlighted fields.", errors: result.errors });
    }

    const goal = await prisma.goal.update({
      where: { id, userId: req.user.id },
      data: result.data,
    });
    return res.status(200).json({ goal: serializeGoal(goal) });
  } catch (error) {
    // P2025: the goal was deleted between the lookup and the update.
    if (error && error.code === "P2025") return res.status(404).json(NOT_FOUND);
    console.error("Update goal failed.");
    return res.status(500).json({ message: "Unable to save your goal." });
  }
}

/** DELETE /api/goals/:id */
async function deleteGoal(req, res) {
  try {
    const id = readId(req);
    if (!id) return res.status(404).json(NOT_FOUND);

    const { count } = await prisma.goal.deleteMany({
      where: { id, userId: req.user.id },
    });
    if (count === 0) return res.status(404).json(NOT_FOUND);

    return res.status(200).json({ message: "Goal deleted." });
  } catch (error) {
    console.error("Delete goal failed.");
    return res.status(500).json({ message: "Unable to delete your goal." });
  }
}

module.exports = { listGoals, createGoal, updateGoal, deleteGoal };
