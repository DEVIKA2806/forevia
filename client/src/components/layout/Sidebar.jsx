import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  HeartPulse,
  Wallet,
  Sparkles,
  TrendingUp,
  Target,
  MessageCircle,
  BarChart3,
  Settings,
  UserRound,
  ClipboardList,
  Landmark,
} from "lucide-react";
import styles from "./Sidebar.module.css";

const PRIMARY_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/health", label: "Health", icon: HeartPulse },
  { to: "/wealth", label: "Wealth", icon: Wallet },
  { to: "/simulator", label: "Simulator", icon: Sparkles },
  { to: "/projections", label: "Projections", icon: TrendingUp },
  { to: "/goals", label: "Goals", icon: Target },
];

// "Your information" group: the forms where a user enters and edits
// their own data, kept separate from the primary feature navigation
// above (Health/Wealth there are the overview pages).
const SECONDARY_NAV = [
  { to: "/health-profile", label: "Health Profile", icon: ClipboardList },
  { to: "/wealth-profile", label: "Wealth Profile", icon: Landmark },
  { to: "/ai-guide", label: "AI Guide", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

/**
 * Desktop sidebar. Mobile navigation is intentionally not built here — the
 * brief scopes that to a later responsive-design phase.
 */
function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandName}>Forevia</span>
        <span className={styles.brandSubtitle}>Health + Wealth Simulator</span>
      </div>

      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  [styles.navLink, isActive ? styles.navLinkActive : ""].join(
                    " "
                  )
                }
              >
                <Icon size={18} strokeWidth={1.75} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <ul className={styles.navList}>
          {SECONDARY_NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  [styles.navLink, isActive ? styles.navLinkActive : ""].join(
                    " "
                  )
                }
              >
                <Icon size={18} strokeWidth={1.75} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
