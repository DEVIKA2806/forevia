import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import PageContainer from "../../components/layout/PageContainer";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import FormRow from "../../components/ui/FormRow";
import { fetchWealthProfile, saveWealthProfile } from "../../api/profiles";
import styles from "./WealthProfilePage.module.css";

const FINANCIAL_GOALS = [
  { value: "emergency_fund", label: "Build an emergency fund" },
  { value: "buy_home", label: "Buy a home" },
  { value: "retirement", label: "Retirement planning" },
  { value: "education", label: "Education" },
  { value: "wealth_growth", label: "Grow long-term wealth" },
  { value: "debt_free", label: "Become debt free" },
  { value: "other", label: "Other" },
];

const MONEY_FIELDS = [
  ["monthlyIncome", "Monthly income"],
  ["monthlyExpenses", "Monthly expenses"],
  ["currentSavings", "Current savings"],
  ["currentInvestments", "Current investments"],
  ["existingDebt", "Existing debts or loans"],
  ["monthlyInvestment", "Monthly investment amount"],
];

const EMPTY_FORM = {
  monthlyIncome: "",
  monthlyExpenses: "",
  currentSavings: "",
  currentInvestments: "",
  existingDebt: "",
  monthlyInvestment: "",
  financialGoal: "",
  targetAmount: "",
  targetYears: "",
};

/**
 * Wealth profile form. Collects self-reported financial information only.
 * No projections, recommendations, or advice are produced here — the
 * simulator that uses this data comes in a later phase.
 */
function WealthProfilePage() {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [hasExistingProfile, setHasExistingProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchWealthProfile()
      .then((data) => {
        if (cancelled) return;
        if (data.profile) {
          setHasExistingProfile(true);
          const p = data.profile;
          setValues({
            monthlyIncome: String(p.monthlyIncome ?? ""),
            monthlyExpenses: String(p.monthlyExpenses ?? ""),
            currentSavings: String(p.currentSavings ?? ""),
            currentInvestments: String(p.currentInvestments ?? ""),
            existingDebt: String(p.existingDebt ?? ""),
            monthlyInvestment: String(p.monthlyInvestment ?? ""),
            financialGoal: p.financialGoal ?? "",
            // Optional fields come back as null when not set — keep those
            // as empty strings so the inputs stay controlled.
            targetAmount: p.targetAmount == null ? "" : String(p.targetAmount),
            targetYears: p.targetYears == null ? "" : String(p.targetYears),
          });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(
          error.status === 401
            ? "Your session has expired. Please sign in again."
            : "Unable to load your financial information."
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(field) {
    return (event) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  function validate() {
    const next = {};

    // Zero is a legitimate answer for every money field (no debt yet, not
    // investing yet), so these check for "missing" and "negative"
    // separately rather than requiring a value above zero.
    for (const [field, label] of MONEY_FIELDS) {
      const raw = values[field];
      if (raw === "") {
        next[field] = `${label} is required.`;
        continue;
      }
      const n = Number(raw);
      if (Number.isNaN(n)) next[field] = `${label} must be a valid number.`;
      else if (n < 0) next[field] = `${label} cannot be negative.`;
    }

    if (!values.financialGoal)
      next.financialGoal = "Please select a financial goal.";

    if (values.targetAmount !== "") {
      const n = Number(values.targetAmount);
      if (Number.isNaN(n)) next.targetAmount = "Enter a valid amount.";
      else if (n < 0) next.targetAmount = "Target amount cannot be negative.";
    }

    if (values.targetYears !== "") {
      const n = Number(values.targetYears);
      if (Number.isNaN(n) || !Number.isInteger(n))
        next.targetYears = "Enter a whole number of years.";
      else if (n < 1 || n > 100)
        next.targetYears = "Time period must be between 1 and 100 years.";
    }

    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaveError("");
    setSuccessMessage("");

    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0 || isSaving) return;

    setIsSaving(true);
    try {
      await saveWealthProfile(values);
      setHasExistingProfile(true);
      setSuccessMessage("Your financial information has been saved.");
    } catch (error) {
      if (error.fieldErrors) setErrors(error.fieldErrors);
      setSaveError(
        error.status === 401
          ? "Your session has expired. Please sign in again."
          : error.message || "Unable to save your financial information."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <Card padding="md">
          <p className={styles.statusText}>
            Loading your financial information…
          </p>
        </Card>
      </PageContainer>
    );
  }

  if (loadError) {
    return (
      <PageContainer>
        <Card padding="md">
          <p role="alert" className={styles.errorBanner}>
            {loadError}
          </p>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Card padding="md" className={styles.noticeCard}>
        <span className={styles.noticeIcon}>
          <ShieldCheck size={18} strokeWidth={1.75} />
        </span>
        <div>
          <p className={styles.noticeTitle}>
            Your financial information is private
          </p>
          <p className={styles.noticeText}>
            This information is stored against your account only and is never
            shared. You can update or clear it at any time. Forevia is an
            educational simulator — it does not provide financial advice.
          </p>
        </div>
      </Card>

      <Card padding="md">
        <h2 className={styles.sectionTitle}>
          {hasExistingProfile
            ? "Edit Financial Information"
            : "Financial Information"}
        </h2>

        {successMessage && (
          <p role="status" className={styles.successBanner}>
            {successMessage}
          </p>
        )}
        {saveError && (
          <p role="alert" className={styles.errorBanner}>
            {saveError}
          </p>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <FormRow>
            <Input
              id="wealth-income"
              label="Monthly income"
              type="number"
              min="0"
              step="0.01"
              value={values.monthlyIncome}
              onChange={handleChange("monthlyIncome")}
              error={errors.monthlyIncome}
              disabled={isSaving}
            />
            <Input
              id="wealth-expenses"
              label="Monthly expenses"
              type="number"
              min="0"
              step="0.01"
              value={values.monthlyExpenses}
              onChange={handleChange("monthlyExpenses")}
              error={errors.monthlyExpenses}
              disabled={isSaving}
            />
          </FormRow>

          <FormRow>
            <Input
              id="wealth-savings"
              label="Current savings"
              type="number"
              min="0"
              step="0.01"
              value={values.currentSavings}
              onChange={handleChange("currentSavings")}
              error={errors.currentSavings}
              disabled={isSaving}
            />
            <Input
              id="wealth-investments"
              label="Current investments"
              type="number"
              min="0"
              step="0.01"
              value={values.currentInvestments}
              onChange={handleChange("currentInvestments")}
              error={errors.currentInvestments}
              disabled={isSaving}
            />
          </FormRow>

          <FormRow>
            <Input
              id="wealth-debt"
              label="Existing debts or loans"
              type="number"
              min="0"
              step="0.01"
              value={values.existingDebt}
              onChange={handleChange("existingDebt")}
              error={errors.existingDebt}
              disabled={isSaving}
              description="Enter 0 if you have none."
            />
            <Input
              id="wealth-monthly-investment"
              label="Monthly investment amount"
              type="number"
              min="0"
              step="0.01"
              value={values.monthlyInvestment}
              onChange={handleChange("monthlyInvestment")}
              error={errors.monthlyInvestment}
              disabled={isSaving}
              description="Enter 0 if you're not investing yet."
            />
          </FormRow>

          <Select
            id="wealth-goal"
            label="Primary financial goal"
            value={values.financialGoal}
            onChange={handleChange("financialGoal")}
            error={errors.financialGoal}
            disabled={isSaving}
          >
            <option value="">Select an option</option>
            {FINANCIAL_GOALS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>

          <FormRow>
            <Input
              id="wealth-target-amount"
              label="Target amount (optional)"
              type="number"
              min="0"
              step="0.01"
              value={values.targetAmount}
              onChange={handleChange("targetAmount")}
              error={errors.targetAmount}
              disabled={isSaving}
              description="Leave blank if you don't have a figure in mind."
            />
            <Input
              id="wealth-target-years"
              label="Target time period in years (optional)"
              type="number"
              min="1"
              max="100"
              value={values.targetYears}
              onChange={handleChange("targetYears")}
              error={errors.targetYears}
              disabled={isSaving}
            />
          </FormRow>

          <div className={styles.actions}>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save Financial Information"}
            </Button>
          </div>
        </form>
      </Card>
    </PageContainer>
  );
}

export default WealthProfilePage;
