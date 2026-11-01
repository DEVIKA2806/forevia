import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "../../components/layout/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import styles from "./LoginPage.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Login page, now connected to the real backend. Frontend validation still
 * runs first (fast feedback, no network round trip for obvious mistakes),
 * but the actual authentication decision always comes from the server —
 * this page never assumes success on its own.
 */
function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(field) {
    return (event) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  function validate() {
    const nextErrors = {};

    if (!values.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!EMAIL_PATTERN.test(values.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!values.password) {
      nextErrors.password = "Password is required.";
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice("");

    const nextErrors = validate();
    setErrors(nextErrors);

    // Guard against double-submits (e.g. impatient double-click) while a
    // request is already in flight.
    if (Object.keys(nextErrors).length > 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await login(values.email.trim(), values.password);
      navigate("/dashboard");
    } catch (error) {
      // The backend deliberately returns the same generic message whether
      // the email doesn't exist or the password is wrong — we just show
      // whatever it says rather than trying to be more specific.
      setNotice(error.message || "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogleClick() {
    setNotice("Google sign-in will be available in a later phase.");
  }

  return (
    <AuthLayout
      heading="Welcome back"
      subtitle="Sign in to continue your journey."
      notice={notice}
      onGoogleClick={handleGoogleClick}
      footerText="Don't have an account?"
      footerLinkText="Create account"
      footerLinkTo="/signup"
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Input
          id="login-email"
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
          id="login-password"
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Enter your password"
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

        <div className={styles.rowEnd}>
          <Link to="#" className={styles.forgotLink}>
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "Signing In..." : "Sign In"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;
