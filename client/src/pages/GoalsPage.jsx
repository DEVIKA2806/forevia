import { useEffect, useState } from "react";
import PageContainer from "../components/layout/PageContainer";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import GoalForm from "../components/goals/GoalForm";
import GoalCard from "../components/goals/GoalCard";
import {
  fetchGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} from "../api/goals";
import styles from "../components/goals/Goals.module.css";

const NEW = "new";

function loadErrorText(error) {
  return error.status === 401
    ? "Your session has expired. Please sign in again."
    : "We couldn't load your goals. Check your connection and try again.";
}

/**
 * Savings goals. The server owns the data and the progress figures
 * (percentage, remaining amount): this page only displays what it returns
 * and sends the user's edits back. Nothing here is an investment forecast;
 * progress is simply "saved so far" against "target".
 */
function GoalsPage() {
  // goals === null until the first successful load.
  const [goals, setGoals] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  // null | "new" | the id of the goal being edited. One form open at a time.
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetchGoals()
      .then((data) => {
        if (cancelled) return;
        setGoals(Array.isArray(data.goals) ? data.goals : []);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(loadErrorText(error));
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  function retry() {
    setLoadError("");
    setGoals(null);
    setAttempt((n) => n + 1);
  }

  function startAdding() {
    setNotice("");
    setWarning("");
    setEditingId(NEW);
  }

  function startEditing(id) {
    setNotice("");
    setWarning("");
    setEditingId(id);
  }

  async function handleCreate(values) {
    const { goal } = await createGoal(values);
    setGoals((prev) => [goal, ...(prev || [])]);
    setEditingId(null);
    setNotice("Goal added.");
  }

  async function handleUpdate(id, values) {
    try {
      const { goal } = await updateGoal(id, values);
      setGoals((prev) => prev.map((g) => (g.id === id ? goal : g)));
      setEditingId(null);
      setNotice("Goal updated.");
    } catch (error) {
      if (error.status !== 404) throw error;
      // Deleted elsewhere (another tab or device): drop it from the list.
      setGoals((prev) => prev.filter((g) => g.id !== id));
      setEditingId(null);
      setWarning("That goal no longer exists, so it was removed from your list.");
    }
  }

  async function handleDelete(goal) {
    try {
      await deleteGoal(goal.id);
    } catch (error) {
      // Already gone is the outcome the user wanted; anything else is shown.
      if (error.status !== 404) throw error;
    }
    setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    setEditingId((current) => (current === goal.id ? null : current));
    setNotice("Goal deleted.");
  }

  if (loadError) {
    return (
      <PageContainer>
        <Card padding="md">
          <EmptyState
            message={loadError}
            action={
              <Button variant="outline" size="sm" onClick={retry}>
                Try again
              </Button>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  if (goals === null) {
    return (
      <PageContainer>
        <Card padding="md">
          <p className={styles.statusText}>Loading your goals…</p>
        </Card>
      </PageContainer>
    );
  }

  const isAdding = editingId === NEW;

  return (
    <PageContainer>
      <div className={styles.toolbar}>
        <p className={styles.intro}>
          Track what you're saving toward. Progress is simply what you've
          saved so far against your target. Forevia doesn't move money or give
          financial advice.
        </p>
        {!isAdding && <Button onClick={startAdding}>Add goal</Button>}
      </div>

      {notice && (
        <p role="status" className={styles.successBanner}>
          {notice}
        </p>
      )}
      {warning && (
        <p role="alert" className={styles.warningBanner}>
          {warning}
        </p>
      )}

      {isAdding && (
        <Card padding="md">
          <h2 className={styles.formTitle}>New goal</h2>
          <GoalForm onSubmit={handleCreate} onCancel={() => setEditingId(null)} />
        </Card>
      )}

      {goals.length === 0 && !isAdding && (
        <Card padding="md">
          <EmptyState
            message="You haven't added any goals yet. Add one to start tracking your progress."
            action={<Button onClick={startAdding}>Add your first goal</Button>}
          />
        </Card>
      )}

      {goals.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>
            Your goals ({goals.length})
          </h2>
          <ul className={styles.list}>
            {goals.map((goal) => (
              <li key={goal.id} className={styles.listItem}>
                <GoalCard
                  goal={goal}
                  isEditing={editingId === goal.id}
                  onEdit={startEditing}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(values) => handleUpdate(goal.id, values)}
                  onDelete={handleDelete}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </PageContainer>
  );
}

export default GoalsPage;
