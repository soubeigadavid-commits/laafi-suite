import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-laafi-dark via-neutral-900 to-laafi-bronze px-4">
      <Suspense fallback={<div className="text-white">Chargement…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
