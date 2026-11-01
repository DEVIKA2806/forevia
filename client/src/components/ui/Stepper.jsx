import { Check } from "lucide-react";
import styles from "./Stepper.module.css";

/**
 * Numbered step indicator for multi-step flows (onboarding). `steps` is an
 * array of labels; `currentStep` is a 1-based index of the active step.
 * Desktop layout only for now — a compact "Step X of Y" version is planned
 * for the responsive phase.
 */
function Stepper({ steps, currentStep }) {
  return (
    <ol className={styles.stepper}>
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <li key={label} className={styles.step}>
            <span
              className={[
                styles.circle,
                isCompleted ? styles.completed : "",
                isCurrent ? styles.current : "",
              ].join(" ")}
            >
              {isCompleted ? <Check size={14} /> : stepNumber}
            </span>
            <span
              className={[
                styles.label,
                isCurrent ? styles.currentLabel : "",
              ].join(" ")}
            >
              {label}
            </span>
            {stepNumber < steps.length && (
              <span
                className={[
                  styles.connector,
                  isCompleted ? styles.connectorCompleted : "",
                ].join(" ")}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default Stepper;
