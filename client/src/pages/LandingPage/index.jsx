import { Link } from "react-router-dom";
import {
  SlidersHorizontal,
  TrendingUp,
  HeartPulse,
  Wallet,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import styles from "./LandingPage.module.css";

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Create Your Profile",
    description: "Tell Forevia about your health, finances and lifestyle.",
  },
  {
    step: "2",
    title: "Explore Scenarios",
    description:
      "Change assumptions and explore different possible outcomes.",
  },
  {
    step: "3",
    title: "Understand Your Options",
    description:
      "Compare scenarios and identify areas you may want to improve.",
  },
];

const FEATURES = [
  {
    icon: HeartPulse,
    title: "Health",
    description: "Track lifestyle and health-related information.",
  },
  {
    icon: Wallet,
    title: "Wealth",
    description: "Understand savings, expenses and financial assumptions.",
  },
  {
    icon: Sparkles,
    title: "What-If Simulator",
    description:
      "Explore how changing different inputs could affect possible outcomes.",
  },
  {
    icon: MessageCircle,
    title: "AI Guide",
    description:
      "Get explanations and insights based on the information you provide.",
  },
];

/**
 * Landing page. Kept intentionally short — this is a product explanation,
 * not a marketing site. No fake stats, testimonials, or logos, per the
 * brief.
 */
function LandingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navBrand}>
          <span className={styles.brandName}>Forevia</span>
          <span className={styles.brandSubtitle}>Health + Wealth Simulator</span>
        </div>

        <nav className={styles.navLinks} aria-label="Page sections">
          <a href="#how-it-works" className={styles.navLink}>
            How It Works
          </a>
          <a href="#features" className={styles.navLink}>
            Features
          </a>
          <a href="#about" className={styles.navLink}>
            About
          </a>
        </nav>

        <div className={styles.navActions}>
          <Link to="/login" className={styles.signInLink}>
            Sign In
          </Link>
          <Link to="/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <h1 className={styles.heroHeading}>
              Understand your future.
              <br />
              <span className={styles.heroHeadingAccent}>
                Don't just predict it.
              </span>
            </h1>
            <p className={styles.heroSubtext}>
              Forevia helps you explore how your health, lifestyle and
              financial choices could shape different possible futures.
            </p>
            <div className={styles.heroActions}>
              <Link to="/signup">
                <Button size="lg">Get Started</Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline">
                  See How It Works
                </Button>
              </a>
            </div>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <Card padding="lg" className={styles.flowCard}>
              <div className={styles.flowStep}>
                <span className={styles.flowIcon}>
                  <SlidersHorizontal size={20} strokeWidth={1.75} />
                </span>
                <span className={styles.flowLabel}>Your Choices</span>
              </div>
              <span className={styles.flowConnector} />
              <div className={styles.flowStep}>
                <span className={styles.flowIcon}>
                  <Sparkles size={20} strokeWidth={1.75} />
                </span>
                <span className={styles.flowLabel}>Possible Scenarios</span>
              </div>
              <span className={styles.flowConnector} />
              <div className={styles.flowStep}>
                <span className={styles.flowIcon}>
                  <TrendingUp size={20} strokeWidth={1.75} />
                </span>
                <span className={styles.flowLabel}>Future Outcomes</span>
              </div>
            </Card>
          </div>
        </section>

        <section id="how-it-works" className={styles.section}>
          <h2 className={styles.sectionHeading}>How It Works</h2>
          <div className={styles.stepsGrid}>
            {HOW_IT_WORKS.map(({ step, title, description }) => (
              <div key={step} className={styles.stepItem}>
                <span className={styles.stepNumber}>{step}</span>
                <h3 className={styles.stepTitle}>{title}</h3>
                <p className={styles.stepDescription}>{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className={styles.sectionMuted}>
          <h2 className={styles.sectionHeading}>Features</h2>
          <div className={styles.featuresGrid}>
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <Card key={title} padding="md" className={styles.featureCard}>
                <span className={styles.featureIcon}>
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <h3 className={styles.featureTitle}>{title}</h3>
                <p className={styles.featureDescription}>{description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="about" className={styles.section}>
          <div className={styles.aboutContent}>
            <h2 className={styles.sectionHeading}>About Forevia</h2>
            <p className={styles.aboutText}>
              Forevia is designed as an educational simulation tool that
              helps users explore possible scenarios by combining health,
              lifestyle and financial information.
            </p>
            <p className={styles.disclaimer}>
              Forevia provides educational simulations and insights. It is
              not medical, financial or legal advice.
            </p>
          </div>
        </section>

        <section className={styles.finalCta}>
          <h2 className={styles.finalCtaHeading}>
            Ready to explore your possibilities?
          </h2>
          <Link to="/signup">
            <Button size="lg">Get Started</Button>
          </Link>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;
