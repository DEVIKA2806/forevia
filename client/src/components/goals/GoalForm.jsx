import { useState } from "react";
import Input from "../ui/Input";
import Button from "../ui/Button";
import FormRow from "../ui/FormRow";
import { validateGoalForm, GOAL_LIMITS } from "../../utils/goalValidation";
import styles from "./Goals.module.css";

function toFormValues(goal) {
  if (!goal) {
    return { title: "", targetAmount: "", currentAmount: "0", targetDate: "" };
  }
  return {
    title: goal.title,
    targetAmount: String(goal.targetAmount),
    currentAmount: String(goal.currentAmount),
    targetDate: goal.targetDate || "",
  };
}

/**
 * Create / edit form for one goal. Pass `goal` to edit, or nothing to
 * create. `onSubmit(values)` must return a promise: if it rejects, the
 * message (and any per-field messages from the server) are shown here; if
 * it resolves, the parent closes the form.
 */
function GoalForm({ goal = null, onSubmit, onCancel }) {
  const [values, setValues] = useState(() => toFormValues(goal));
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const prefix = goal ? "goal-edit" : "goal-new";

  function handleChange(field) {
    return (event) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaveError("");

    const next = validateGoalForm(values, {
      originalTargetDate: goal ? goal.targetDate : null,
    });
    setErrors(next);
    if (Object.keys(next).length > 0 || isSaving) return;

    setIsSaving(true);
    try {
      await onSubmit(values);
    } catch (error) {
      if (error.fieldErrors) setErrors(error.fieldErrors);
      setSaveError(
        error.status === 401
          ? "Your session has expired. Please sign in again."
          : error.message || "Unable to save your goal."
      );
      setIsSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {saveError && (
        <p role="alert" className={`${styles.errorBanner} ${styles.formBanner}`}>
          {saveError}
        </p>
      )}

      <Input
        id={`${prefix}-title`}
        label="Goal title"
        type="text"
        maxLength={GOAL_LIMITS.titleMax}
        value={values.title}
        onChange={handleChange("title")}
        error={errors.title}
        disabled={isSaving}
        placeholder="e.g. Emergency fund"
      />

      <FormRow>
        <Input
          id={`${prefix}-target`}
          label="Target amount (₹)"
          type="number"
          min="0"
          step="0.01"
          value={values.targetAmount}
          onChange={handleChange("targetAmount")}
          error={errors.targetAmount}
          disabled={isSaving}
        />
        <Input
          id={`${prefix}-current`}
          label="Saved so far (₹)"
          type="number"
          min="0"
          step="0.01"
          value={values.currentAmount}
          onChange={handleChange("currentAmount")}
          error={errors.currentAmount}
          disabled={isSaving}
          description="Enter 0 if you haven't started yet."
        />
      </FormRow>

      <Input
        id={`${prefix}-date`}
        label="Target date (optional)"
        type="date"
        value={values.targetDate}
        onChange={handleChange("targetDate")}
        error={errors.targetDate}
        disabled={isSaving}
      />

      <div className={styles.actions}>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : goal ? "Save changes" : "Add goal"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default GoalForm;
