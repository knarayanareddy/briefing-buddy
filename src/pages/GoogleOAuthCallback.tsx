import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { completeGoogleOAuth } from "@/lib/api";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GoogleOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState("");

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) {
      setStatus("error");
      setErrorMessage(`Google returned an error: ${error}`);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setErrorMessage("Missing authorization code or state. Please try again.");
      return;
    }

    completeGoogleOAuth(code, state)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err.message || "Failed to exchange authorization code.");
      });
  }, [code, state, error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="sa-card max-w-md w-full p-8 text-center space-y-6">
        {status === "processing" && (
          <>
            <div className="mx-auto w-16 h-16 bg-[#5789FF]/10 rounded-full flex items-center justify-center mb-6">
              <Loader2 className="w-8 h-8 text-[#5789FF] animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-white">Completing Setup</h2>
            <p className="text-sm text-white/50">Securely exchanging keys with Google Workspace...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Access Granted</h2>
            <p className="text-sm text-white/50 mb-8">Your Google Workspace has been securely connected.</p>
            <Button onClick={() => navigate("/briefing-builder")} className="w-full sa-button-primary">
              Return to Builder
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Connection Failed</h2>
            <p className="text-sm text-red-400/80 mb-8">{errorMessage}</p>
            <Button onClick={() => navigate("/connectors")} variant="outline" className="w-full text-white/60">
              Return to Connectors
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
