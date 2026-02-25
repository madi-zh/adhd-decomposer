import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center pt-12">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
