import classes from "./HistoryKpis.module.css";

function formatILS(v) {
  const n = Number(v || 0);
  return "₪" + n.toLocaleString("he-IL");
}

export default function HistoryKpis({ summary }) {
  if (!summary) return null;

  const totalHours = Number(summary.totalHours || 0);
  const totalTravel = Number(summary.totalTravel || 0);
  const totalIncome = Number(summary.totalIncome || 0);

  const avgPerHour = totalHours > 0 ? totalIncome / totalHours : 0;

  return (
    <div className={classes.kpis}>
      <div className={classes.card}>
        <div className={classes.label}>Income</div>
        <div className={classes.valueAccent}>{formatILS(totalIncome)}</div>
      </div>

      <div className={classes.card}>
        <div className={classes.label}>Hours</div>
        <div className={classes.value}>{totalHours.toFixed(2)}</div>
      </div>

      <div className={classes.card}>
        <div className={classes.label}>Travel</div>
        <div className={classes.value}>{totalTravel.toFixed(2)}</div>
      </div>

      <div className={classes.card}>
        <div className={classes.label}>Avg / Hour</div>
        <div className={classes.value}>{formatILS(avgPerHour.toFixed(0))}</div>
      </div>
    </div>
  );
}
