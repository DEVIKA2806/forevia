import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import PageContainer from "../../components/layout/PageContainer";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import FormRow from "../../components/ui/FormRow";
import { fetchHealthProfile, saveHealthProfile } from "../../api/profiles";
import styles from "./HealthProfilePage.module.css";

const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary (little or no exercise)" },
  { value: "light", label: "Light (1–2 days a week)" },
  { value: "moderate", label: "Moderate (3–5 days a week)" },
  { value: "active", label: "Active (6–7 days a week)" },
];

const SMOKING_STATUSES = [
  { value: "never", label: "Never" },
  { value: "occasionally", label: "Occasionally" },
  { value: "regularly", label: "Regularly" },
  { value: "former", label: "Former smoker" },
];

const ALCOHOL_LEVELS = [
  { value: "never", label: "Never" },
  { value: "occasionally", label: "Occasionally" },
  { value: "regularly", label: "Regularly" },
];

const EMPTY_FORM = {
  age: "",
  gender: "",
  heightCm: "",
  weightKg: "",
  activityLevel: "",
  sleepHours: "",
  smokingStatus: "",
  alcoholUse: "",
  conditions: "",
  healthGoals: "",
};

/**
 * Health profile form. Collects self-reported lifestyle information only —
 * it does not assess, score, or diagnose anything. The simulator that
 * uses this data is built in a later phase.
 */
function HealthProfilePage() {
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

    fetchHealthProfile()
      .then((data) => {
        if (cancelled) return;
        if (data.profile) {
          setHasExistingProfile(true);
          // Convert numbers to strings so the inputs stay controlled, and
          // map nulls (optional fields left blank) to empty strings.
          setValues({
            age: String(data.profile.age ?? ""),
            gender: data.profile.gender ?? "",
            heightCm: String(data.profile.heightCm ?? ""),
            weightKg: String(data.profile.weightKg ?? ""),
            activityLevel: data.profile.activityLevel ?? "",
            sleepHours: String(data.profile.sleepHours ?? ""),
            smokingStatus: data.profile.smokingStatus ?? "",
            alcoholUse: data.profile.alcoholUse ?? "",
            conditions: data.profile.conditions ?? "",
            healthGoals: data.profile.healthGoals ?? "",
          });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(
          error.status === 401
            ? "Your session has expired. Please sign in again."
            : "Unable to load your health information."
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

  // Mirrors the server's rules so users get immediate feedback. The
  // server re-checks all of this independently — this is convenience,
  // not security.
  function validate() {
    const next = {};
    const num = (v) => (v === "" ? NaN : Number(v));

    const age = num(values.age);
    if (!values.age) next.age = "Age is required.";
    else if (Number.isNaN(age) || !Number.isInteger(age))
      next.age = "Age must be a whole number.";
    else if (age < 13 || age > 120)
      next.age = "Age must be between 13 and 120.";

    if (!values.gender) next.gender = "Please select an option.";

    const height = num(values.heightCm);
    if (!values.heightCm) next.heightCm = "Height is required.";
    else if (Number.isNaN(height) || height < 50 || height > 260)
      next.heightCm = "Height must be between 50 and 260 cm.";

    const weight = num(values.weightKg);
    if (!values.weightKg) next.weightKg = "Weight is required.";
    else if (Number.isNaN(weight) || weight < 20 || weight > 400)
      next.weightKg = "Weight must be between 20 and 400 kg.";

    if (!values.activityLevel)
      next.activityLevel = "Please select an activity level.";

    const sleep = num(values.sleepHours);
    if (!values.sleepHours) next.sleepHours = "Sleep duration is required.";
    else if (Number.isNaN(sleep) || sleep < 0 || sleep > 24)
      next.sleepHours = "Sleep must be between 0 and 24 hours.";

    if (!values.smokingStatus)
      next.smokingStatus = "Please select an option.";
    if (!values.alcoholUse) next.alcoholUse = "Please select an option.";

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
      await saveHealthProfile({
        age: values.age,
        gender: values.gender,
        heightCm: values.heightCm,
        weightKg: values.weightKg,
        activityLevel: values.activityLevel,
        sleepHours: values.sleepHours,
        smokingStatus: values.smokingStatus,
        alcoholUse: values.alcoholUse,
        conditions: values.conditions,
        healthGoals: values.healthGoals,
      });
      setHasExistingProfile(true);
      setSuccessMessage("Your health information has been saved.");
    } catch (error) {
      // If the server returned per-field errors, surface them next to the
      // fields rather than as one generic banner.
      if (error.fieldErrors) setErrors(error.fieldErrors);
      setSaveError(
        error.status === 401
          ? "Your session has expired. Please sign in again."
          : error.message || "Unable to save your health information."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <Card padding="md">
          <p className={styles.statusText}>Loading your health information…</p>
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
          <p className={styles.noticeTitle}>Your health information is private</p>
          <p className={styles.noticeText}>
            This information is stored against your account only and is never
            shared. You can update or clear it at any time. Forevia is an
            educational simulator — it does not diagnose conditions and is not
            medical advice.
          </p>
        </div>
      </Card>

      <Card padding="md">
        <h2 className={styles.sectionTitle}>
          {hasExistingProfile ? "Edit Health Information" : "Health Information"}
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
              id="health-age"
              label="Age"
              type="number"
              min="13"
              max="120"
              value={values.age}
              onChange={handleChange("age")}
              error={errors.age}
              disabled={isSaving}
            />
            <Select
              id="health-gender"
              label="Gender"
              value={values.gender}
              onChange={handleChange("gender")}
              error={errors.gender}
              disabled={isSaving}
            >
              <option value="">Select an option</option>
              {GENDERS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormRow>

          <FormRow>
            <Input
              id="health-height"
              label="Height (cm)"
              type="number"
              min="50"
              max="260"
              step="0.1"
              value={values.heightCm}
              onChange={handleChange("heightCm")}
              error={errors.heightCm}
              disabled={isSaving}
            />
            <Input
              id="health-weight"
              label="Weight (kg)"
              type="number"
              min="20"
              max="400"
              step="0.1"
              value={values.weightKg}
              onChange={handleChange("weightKg")}
              error={errors.weightKg}
              disabled={isSaving}
            />
          </FormRow>

          <FormRow>
            <Select
              id="health-activity"
              label="Physical activity level"
              value={values.activityLevel}
              onChange={handleChange("activityLevel")}
              error={errors.activityLevel}
              disabled={isSaving}
            >
              <option value="">Select an option</option>
              {ACTIVITY_LEVELS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Input
              id="health-sleep"
              label="Average sleep (hours per night)"
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={values.sleepHours}
              onChange={handleChange("sleepHours")}
              error={errors.sleepHours}
              disabled={isSaving}
            />
          </FormRow>

          <FormRow>
            <Select
              id="health-smoking"
              label="Smoking status"
              value={values.smokingStatus}
              onChange={handleChange("smokingStatus")}
              error={errors.smokingStatus}
              disabled={isSaving}
            >
              <option value="">Select an option</option>
              {SMOKING_STATUSES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select
              id="health-alcohol"
              label="Alcohol consumption"
              value={values.alcoholUse}
              onChange={handleChange("alcoholUse")}
              error={errors.alcoholUse}
              disabled={isSaving}
            >
              <option value="">Select an option</option>
              {ALCOHOL_LEVELS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormRow>

          <Input
            id="health-conditions"
            label="Lifestyle-related conditions (optional)"
            value={values.conditions}
            onChange={handleChange("conditions")}
            error={errors.conditions}
            disabled={isSaving}
            placeholder="e.g. high blood pressure"
            description="Leave blank if you'd rather not say."
          />

          <Input
            id="health-goals"
            label="General health goals (optional)"
            value={values.healthGoals}
            onChange={handleChange("healthGoals")}
            error={errors.healthGoals}
            disabled={isSaving}
            placeholder="e.g. sleep better, stay more active"
          />

          <div className={styles.actions}>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save Health Information"}
            </Button>
          </div>
        </form>
      </Card>
    </PageContainer>
  );
}

export default HealthProfilePage;
