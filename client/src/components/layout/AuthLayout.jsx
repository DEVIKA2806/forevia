import { Link } from "react-router-dom";
import Card from "../ui/Card";
import Button from "../ui/Button";
import styles from "./AuthLayout.module.css";

/**
 * Shared shell for the Login and Signup pages: centered card with the
 * Forevia brand, a heading/subtitle, the page's own form as children, a
 * "continue with Google" action, and a footer link to the other auth page.
 * Login and Signup only differ in their form fields and copy — everything
 * else here is identical, so it lives in one place instead of being
 * duplicated across both pages.
 */
function AuthLayout({
  heading,
  subtitle,
  children,
  notice,
  onGoogleClick,
  footerText,
  footerLinkText,
  footerLinkTo,
}) {
  return (
    <div className={styles.page}>
      <Card padding="lg" className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandName}>Forevia</span>
          <span className={styles.brandSubtitle}>Health + Wealth Simulator</span>
        </div>

        <h1 className={styles.heading}>{heading}</h1>
        <p className={styles.subtitle}>{subtitle}</p>

        {children}

        {notice && (
          <p role="status" className={styles.notice}>
            {notice}
          </p>
        )}

        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerText}>or continue with</span>
          <span className={styles.dividerLine} />
        </div>

        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={onGoogleClick}
        >
          Continue with Google
        </Button>

        <p className={styles.footer}>
          {footerText}{" "}
          <Link to={footerLinkTo} className={styles.footerLink}>
            {footerLinkText}
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default AuthLayout;
