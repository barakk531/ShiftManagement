import classes from "./MonthlySummaryBar.module.css";

function formatILS(value) {
  const n = Number(value || 0);
  return "₪" + n.toLocaleString("he-IL");
}

export default function MonthlySummaryBar({ summary }) {
  const s = summary || { shiftsCount: 0, hoursWorked: 0, travel: 0, shiftTotal: 0 };

  return (
    <div className={classes.summaryBar}>
      <div className={classes.summaryItem}>
        <div className={classes.summaryLabel}>Shifts</div>
        <div className={classes.summaryValue}>{s.shiftsCount}</div>
      </div>

      <div className={classes.summaryItem}>
        <div className={classes.summaryLabel}>Hours</div>
        <div className={classes.summaryValue}>{Number(s.hoursWorked || 0)}</div>
      </div>

      <div className={classes.summaryItem}>
        <div className={classes.summaryLabel}>Travel</div>
        <div className={classes.summaryValue}>{formatILS(s.travel)}</div>
      </div>

      <div className={classes.summaryItem}>
        <div className={classes.summaryLabel}>Income</div>
        <div className={classes.summaryValue}>{formatILS(s.shiftTotal)}</div>
      </div>
    </div>
  );
}
