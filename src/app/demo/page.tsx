//localhost:3000/api/demo

"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { useAuth } from "@clerk/nextjs";

export default function DemoPage() {
  const { userId } = useAuth();
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

  const handleClientError = () => {
    Sentry.logger.info("User attempted to trigger a client function", {
      userId,
    });
    throw new Error("Client Error: Something went wrong in the browser");
  };
  const handleApiError = async () => {
    await fetch("/api/demo/error", {
      method: "POST",
    });
  };

  const handleInngestError = async () => {
    await fetch("/api/demo/inngest-error", {
      method: "POST",
    });
  };

  return (
    <div className="p-8 space-x-4">
      <Button disabled={loading} onClick={handleBlocking}>
        {loading ? "Loading..." : "Test Blocking API Route"}
      </Button>

      <Button disabled={backgroundLoading} onClick={handleBackground}>
        {backgroundLoading ? "Loading..." : "Test Background API Route"}
      </Button>
      <Button variant="destructive" onClick={handleClientError}>
        Test Client Error
      </Button>

      <Button variant="destructive" onClick={handleApiError}>
        Test API Error
      </Button>

      <Button variant="destructive" onClick={handleInngestError}>
        Test Inngest Error
      </Button>
    </div>
  );
}
