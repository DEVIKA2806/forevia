import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, User, UserRound, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import styles from "./Header.module.css";

/**
 * Application header shown above every authenticated page. Title/subtitle
 * are passed per-page. The profile button now opens a small menu with a
 * real "Log out" action; notifications remain a static placeholder for a
 * later phase.
 */
function Header({ title, subtitle }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Closes the profile menu when clicking anywhere outside it — standard
  // dropdown behavior, kept local to this component rather than a shared
  // abstraction since it's the only dropdown in the app so far.
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    // Waits for the server to actually clear the cookie before updating
    // local state and redirecting — logging out should end the real
    // session, not just hide the logged-in UI while the cookie is still
    // valid.
    await logout();
    navigate("/login");
  }

  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Notifications"
        >
          <Bell size={18} strokeWidth={1.75} />
        </button>

        <div className={styles.profileMenu} ref={menuRef}>
          <button
            type="button"
            className={styles.profileButton}
            aria-label="Profile menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span className={styles.avatar}>
              <User size={16} strokeWidth={1.75} />
            </span>
          </button>

          {menuOpen && (
            <div className={styles.dropdown} role="menu">
              <Link
                to="/profile"
                className={styles.dropdownItem}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                <UserRound size={16} strokeWidth={1.75} />
                Profile
              </Link>
              <button
                type="button"
                className={styles.dropdownItem}
                role="menuitem"
                onClick={handleLogout}
              >
                <LogOut size={16} strokeWidth={1.75} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
