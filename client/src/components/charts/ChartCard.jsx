import { ResponsiveContainer } from "recharts";
import Card from "../ui/Card";
import styles from "./ChartCard.module.css";

/**
 * Chart foundation for Phase 2. This does NOT build the actual Health/
 * Wealth charts yet (that's Phase 7) — it just establishes how every chart
 * in the app will be wrapped: inside a Card, with a title, and inside
 * Recharts' ResponsiveContainer so charts resize instead of overflowing.
 *
 * Usage once real charts are built:
 *   <ChartCard title="Health Score Trend">
 *     <LineChart data={...}>...</LineChart>
 *   </ChartCard>
 */
function ChartCard({ title, height = 240, children }) {
  return (
    <Card padding="md">
      {title && <p className={styles.title}>{title}</p>}
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default ChartCard;
