
import ShiftSwapDetailsModal from "../../components/ShiftSwaps/ShiftSwapDetailsModal";
import { requireAuth } from "../../util/requireAuth";

export default function ShiftSwapDetailsPage() {
  return <ShiftSwapDetailsModal />;
}

export async function loader({ params }) {
  const token = requireAuth();

  const res = await fetch(`http://localhost:8080/shift-swaps/${params.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load post");

  const data = await res.json();
  return data.post;
}












