
import { Outlet, useLoaderData, useLocation, useSubmit } from "react-router-dom";
import { useEffect } from "react";

import MainNavigation from "../components/MainNavigation";
import { getTokenDuration } from "../util/auth";

function RootLayout() {
  const token = useLoaderData();
  const submit = useSubmit();

  const location = useLocation();
  const isShiftSwaps = location.pathname.startsWith("/shift-swaps");

  useEffect(() => {
    if (!token) return;

    if (token === "EXPIRED") {
      submit(null, { action: "/logout", method: "post" });
      return;
    }

    const tokenDuration = getTokenDuration();
    const timer = setTimeout(() => {
      submit(null, { action: "/logout", method: "post" });
    }, tokenDuration);

    return () => clearTimeout(timer);
  }, [token, submit]);
const SHIFT_SWAPS_BG =
    "radial-gradient(circle at 20% 10%, #6d28d9 0%, #2a0b5a 55%, #12002b 100%)";

  const shellStyle = isShiftSwaps
    ? {
        minHeight: "100vh",
        backgroundImage: SHIFT_SWAPS_BG,
        backgroundAttachment: "fixed",
      }
    : undefined;

  const mainStyle = isShiftSwaps
    ? {
        background: "transparent",
        minHeight: "calc(100vh - 0px)",
      }
    : undefined;

  return (
    <div style={shellStyle}>
      <MainNavigation />
      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  );
}

export default RootLayout;




