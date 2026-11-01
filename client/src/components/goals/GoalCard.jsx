import { useState } from "react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import ProgressBar from "../ui/ProgressBar";
import GoalForm from "./GoalForm";
import {
  formatMoney,
  formatProgress,
  formatTargetDate,
  isPastTarget,
} from "./goalFormat";
import styles from "./Goals.module.css";

/**
 * One goal: its progress, or (while editing) its form. Deleting asks for
 * confirmation inline first, so nothing is removed by a single click.
 */
function GoalCard({ goal, isEditing, onEdit, onCancelEdit, onSave, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  if (isEditing) {
    return (
      <Card padding="md">
        <h3 className={styles.formTitle}>Edit goal</h3>
        <GoalForm goal={goal} onSubmit={onSave} onCancel={onCancelEdit} />
      </Card>
    );
  }

  async function handleConfirmDelete() {
    setDeleteError("");
    setIsDeleting(true);
    try {
      await onDelete(goal);
    } catch (error) {
      setDeleteError(
        error.status === 401
          ? "Your session has expired. Please sign in again."
          : error.message || "Unable to delete your goal."
      );
      setIsDeleting(false);
    }
  }

  const pastTarget = isPastTarget(goal);

  return (
    <Card padding="md">
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <h3 className={styles.goalTitle}>{goal.title}</h3>
          {goal.isCompleted && <Badge status="completed">Completed</Badge>}
          {pastTarget && <Badge status="behind">Past target date</Badge>}
        </div>

        <ProgressBar
          value={goal.progressPercent ?? 0}
          label={`${formatProgress(goal.progressPercent)} complete`}
        />

        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Saved</dt>
            <dd>{formatMoney(goal.currentAmount)}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Target</dt>
            <dd>{formatMoney(goal.targetAmount)}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Remaining</dt>
            <dd>{formatMoney(goal.remainingAmount)}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Target date</dt>
            <dd>{goal.targetDate ? formatTargetDate(goal.targetDate) : "Not set"}</dd>
          </div>
        </dl>

        {deleteError && (
          <p role="alert" className={styles.errorBanner}>
            {deleteError}
          </p>
        )}

        {confirming ? (
          <div className={styles.confirm} role="group" aria-label="Confirm deletion">
            <p className={styles.confirmText}>
              Delete “{goal.title}”? This can't be undone.
            </p>
            <div className={styles.actions}>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting…" : "Yes, delete"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirming(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.actions}>
            <Button variant="outline" size="sm" onClick={() => onEdit(goal.id)}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteError("");
                setConfirming(true);
              }}
            >
              Delete
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default GoalCard;
