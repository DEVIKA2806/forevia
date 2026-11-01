import { useEffect, useState } from "react";
import PageContainer from "../../components/layout/PageContainer";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { fetchProfile, updateProfile } from "../../api/user";
import { useAuth } from "../../context/AuthContext";
import styles from "./ProfilePage.module.css";

const MAX_NAME_LENGTH = 80;

// Renders the account creation date in a readable form. Returns null for
// a missing or unparseable value so the caller can hide the row entirely
// rather than printing "Invalid Date".
function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ProfilePage() {
  const { updateUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameError, setNameError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetchProfile()
      .then((data) => {
        if (cancelled) return;
        setProfile(data.user);
        setNameValue(data.user.name);
      })
      .catch((error) => {
        if (cancelled) return;
        // A 401 here means the cookie expired or was cleared. Rather than
        // redirecting from inside this page, we show a clear message —
        // ProtectedRoute already handles the redirect on the next
        // navigation or refresh, and this avoids two competing redirects.
        setLoadError(
          error.status === 401
            ? "Your session has expired. Please sign in again."
            : error.message || "Unable to load your profile."
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function startEditing() {
    setIsEditing(true);
    setNameValue(profile.name);
    setNameError("");
    setSaveError("");
    setSuccessMessage("");
  }

  function cancelEditing() {
    setIsEditing(false);
    setNameValue(profile.name);
    setNameError("");
    setSaveError("");
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaveError("");
    setSuccessMessage("");

    const trimmedName = nameValue.trim();

    if (!trimmedName) {
      setNameError("Full name is required.");
      return;
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      setNameError(
        `Full name must be ${MAX_NAME_LENGTH} characters or fewer.`
      );
      return;
    }
    setNameError("");

    if (isSaving) return;

    setIsSaving(true);
    try {
      const data = await updateProfile(trimmedName);
      setProfile(data.user);
      // Push the change into auth state too, so anything else reading the
      // current user (e.g. the dashboard greeting) updates immediately.
      updateUser(data.user);
      setIsEditing(false);
      setSuccessMessage("Your profile has been updated.");
    } catch (error) {
      setSaveError(
        error.status === 401
          ? "Your session has expired. Please sign in again."
          : error.message || "Unable to update your profile."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <Card padding="md">
          <p className={styles.statusText}>Loading your profile…</p>
        </Card>
      </PageContainer>
    );
  }

  if (loadError) {
    return (
      <PageContainer>
        <Card padding="md">
          <p role="alert" className={styles.errorText}>
            {loadError}
          </p>
        </Card>
      </PageContainer>
    );
  }

  const createdAt = formatDate(profile.createdAt);

  return (
    <PageContainer>
      <Card padding="md">
        <h2 className={styles.sectionTitle}>Account Details</h2>

        {successMessage && (
          <p role="status" className={styles.successText}>
            {successMessage}
          </p>
        )}
        {saveError && (
          <p role="alert" className={styles.errorText}>
            {saveError}
          </p>
        )}

        {isEditing ? (
          <form className={styles.form} onSubmit={handleSave} noValidate>
            <Input
              id="profile-name"
              label="Full Name"
              value={nameValue}
              onChange={(event) => setNameValue(event.target.value)}
              error={nameError}
              disabled={isSaving}
              autoComplete="name"
            />

            <Input
              id="profile-email"
              label="Email"
              type="email"
              value={profile.email}
              readOnly
              disabled
              description="Email cannot be changed at the moment."
            />

            <div className={styles.formActions}>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving…" : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={cancelEditing}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <>
            <dl className={styles.details}>
              <div className={styles.detailRow}>
                <dt className={styles.detailLabel}>Full Name</dt>
                <dd className={styles.detailValue}>{profile.name}</dd>
              </div>
              <div className={styles.detailRow}>
                <dt className={styles.detailLabel}>Email</dt>
                <dd className={styles.detailValue}>{profile.email}</dd>
              </div>
              {createdAt && (
                <div className={styles.detailRow}>
                  <dt className={styles.detailLabel}>Member Since</dt>
                  <dd className={styles.detailValue}>{createdAt}</dd>
                </div>
              )}
            </dl>

            <Button type="button" variant="outline" onClick={startEditing}>
              Edit Profile
            </Button>
          </>
        )}
      </Card>
    </PageContainer>
  );
}

export default ProfilePage;
