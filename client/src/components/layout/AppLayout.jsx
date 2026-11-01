import { Outlet, useMatches } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import styles from "./AppLayout.module.css";

/**
 * Shared shell for every authenticated page: Sidebar + Header + the routed
 * page content. A page only needs to export a `handle` with a title (and
 * optional subtitle) on its route definition — see routes/AppRouter.jsx —
 * and this layout renders the header for it automatically. Individual
 * pages never re-implement the sidebar/header themselves.
 */
function AppLayout() {
  const matches = useMatches();
  const currentHandle = [...matches].reverse().find((m) => m.handle)?.handle;

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <Header
          title={currentHandle?.title || ""}
          subtitle={currentHandle?.subtitle}
        />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
