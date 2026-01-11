import { Suspense } from "react";
import EnableDriverClient from "./EnableDriverClient";

export default function EnableDriverPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <EnableDriverClient />
    </Suspense>
  );
}
