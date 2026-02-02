import classes from "./YearBars.module.css";

const MONTH_SHORT = ["", "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function YearBars({ year, months }) {
  if (!year || !Array.isArray(months) || months.length !== 12) return null;

  const max = Math.max(1, ...months.map((m) => Number(m.shiftTotal || 0)));

  return (
    <div className={classes.wrap}>
      <div className={classes.title}>Year trend — {year}</div>
      <div className={classes.grid}>
        {months.map((m) => {
          const v = Number(m.shiftTotal || 0);
          const h = Math.round((v / max) * 100);
          return (
            <div key={m.month} className={classes.col} title={`₪${v.toFixed(0)}`}>
              <div className={classes.bar} style={{ height: `${h}%` }} />
              <div className={classes.label}>{MONTH_SHORT[m.month]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
