import { Outlet } from "react-router-dom";
import { requireAuth } from "../../util/requireAuth";
import ShiftSwapsHeader from "../../components/ShiftSwaps/ShiftSwapsHeader";
import ShiftSwapsList from "../../components/ShiftSwaps/ShiftSwapsList";
import pageClasses from "../../components/ShiftSwaps/ShiftSwapsPage.module.css";

export async function loader() {
  const token = requireAuth();

  const res = await fetch("http://localhost:8080/shift-swaps", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to load shift swaps");
  }

  const data = await res.json();
  return data.posts || [];
}

export default function ShiftSwapsPage() {
  return (
    <>
      <div className={pageClasses.page}>
        <ShiftSwapsHeader />
        <Outlet />
        <main>
          <ShiftSwapsList />
        </main>
      </div>
    </>
  );
}

