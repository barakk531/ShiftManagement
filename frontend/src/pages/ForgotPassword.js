import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import ForgotPassword from "../components/ForgotPasswordModal";
import PasswordResetModal from "../components/PasswordResetModal";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSeconds, setResetSeconds] = useState(300);

  return (
    <>
      <ForgotPassword
        onSent={({ email, expiresInSeconds }) => {
          setResetEmail(email);
          setResetSeconds(expiresInSeconds || 300);
          setResetOpen(true);
        }}
      />

      <PasswordResetModal
        isOpen={resetOpen}
        email={resetEmail}
        initialSeconds={resetSeconds}
        onClose={() => setResetOpen(false)}
        onResetSuccess={() => navigate("/auth")}
      />
    </>
  );
}
