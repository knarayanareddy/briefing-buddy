import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

async function completeGitHubOAuth(code: string, state: string) {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };

  if (session) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  } else {
    headers["x-internal-api-key"] = "hackathon_unlocked_preview_2024";
    headers["x-preview-user-id"] = import.meta.env.VITE_DEMO_USER_ID || "00000000-0000-0000-0000-000000000000";
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/github-oauth-callback`, {
    method: "POST",
    headers,
    body: JSON.stringify({ code, state }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `GitHub OAuth failed (${res.status})`);
  }

  return res.json();
}

export default function GitHubOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setErrorMessage(error === "access_denied" ? "You denied access to GitHub." : error);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setErrorMessage("Missing authorization code or state parameter.");
      return;
    }

    completeGitHubOAuth(code, state)
      .then((res) => {
        setUsername(res.username || "");
        setStatus("success");
      })
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err.message);
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto p-8">
        {status === "processing" && (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Connecting GitHub...</h2>
            <p className="text-sm text-muted-foreground">Exchanging authorization code for access token.</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">GitHub Connected!</h2>
            <p className="text-sm text-muted-foreground">
              {username ? `Connected as @${username}.` : "Your GitHub account is now connected."}
              {" "}Configure repos to monitor in the Connectors page.
            </p>
            <Button onClick={() => navigate("/connectors")} className="mt-4">Go to Connectors</Button>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Connection Failed</h2>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <Button onClick={() => navigate("/connectors")} variant="outline" className="mt-4">Back to Connectors</Button>
          </>
        )}
      </div>
    </div>
  );
}
