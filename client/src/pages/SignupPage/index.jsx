import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "../../components/layout/AuthLayout";
import Input from "../../components/ui/Input";
import Checkbox from "../../components/ui/Checkbox";
import Button from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import styles from "./SignupPage.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Signup page, now connected to the real backend. Same intent as
 * LoginPage: frontend validation runs first for fast feedback, but the
 * server independently re-validates everything and is the only thing
 * that actually creates the account.
 */
function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreedToTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(field) {
    return (event) => {
      const value =
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value;
      setValues((prev) => ({ ...prev, [field]: value }));
    };
  }

  function validate() {
    const nextErrors = {};

    if (!values.fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!values.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!EMAIL_PATTERN.test(values.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!values.password) {
      nextErrors.password = "Password is required.";
    } else if (values.password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    if (!values.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (values.confirmPassword !== values.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (!values.agreedToTerms) {
      nextErrors.agreedToTerms = "You must agree to the Terms of Service and Privacy Policy.";
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice("");

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await signup(values.fullName.trim(), values.email.trim(), values.password);
      navigate("/dashboard");
    } catch (error) {
      if (error.status === 409) {
        // Attach to the email field specifically — it's the actionable
        // one (go sign in instead, or use a different email), rather
        // than just a generic top-of-form notice.
        setErrors((prev) => ({ ...prev, email: error.message }));
      } else {
        setNotice(
          error.message || "Unable to create your account. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogleClick() {
    setNotice("Google sign-in will be available in a later phase.");
  }

  return (
    <AuthLayout
      heading="Create your account"
      subtitle="Start your journey to a better-informed future."
      notice={notice}
      onGoogleClick={handleGoogleClick}
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkTo="/login"
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Input
          id="signup-name"
          label="Full Name"
          autoComplete="name"
          placeholder="Enter your full name"
          value={values.fullName}
          onChange={handleChange("fullName")}
          error={errors.fullName}
          disabled={isSubmitting}
        />

        <Input
          id="signup-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          value={values.email}
          onChange={handleChange("email")}
          error={errors.email}
          disabled={isSubmitting}
        />

        <Input
          id="signup-password"
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Create a password"
          value={values.password}
          onChange={handleChange("password")}
          error={errors.password}
          disabled={isSubmitting}
          endAdornment={
            <button
              type="button"
              className={styles.toggleVisibility}
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        <Input
          id="signup-confirm-password"
          label="Confirm Password"
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Confirm your password"
          value={values.confirmPassword}
          onChange={handleChange("confirmPassword")}
          error={errors.confirmPassword}
          disabled={isSubmitting}
          endAdornment={
            <button
              type="button"
              className={styles.toggleVisibility}
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        <Checkbox
          id="signup-terms"
          checked={values.agreedToTerms}
          onChange={handleChange("agreedToTerms")}
          error={errors.agreedToTerms}
          disabled={isSubmitting}
          label={
            <>
              I agree to the{" "}
              <a href="#" className={styles.inlineLink}>
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className={styles.inlineLink}>
                Privacy Policy
              </a>
            </>
          }
        />

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "Creating Account..." : "Create Account"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default SignupPage;
