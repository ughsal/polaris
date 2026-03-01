//localhost:3000/api/demo

"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function DemoPage() {
  const [loading, setLoading] = useState(false);
  const [backgroundLoading, setBackgroundLoading] = useState(false);

  const handleBlocking = async () => {
    setLoading(true);
    await fetch("/api/demo/blocking", {
      method: "POST",
    });
    setLoading(false);
  };

  const handleBackground = async () => {
    setBackgroundLoading(true);
    await fetch("/api/demo/background", {
      method: "POST",
    });
    setBackgroundLoading(false);
  };
  return (
    <div className="p-8 space-x-4">
      <Button disabled={loading} onClick={handleBlocking}>
        {loading ? "Loading..." : "Test Blocking API Route"}
      </Button>

      <Button disabled={backgroundLoading} onClick={handleBackground}>
        {backgroundLoading ? "Loading..." : "Test Background API Route"}
      </Button>
    </div>
  );
}
