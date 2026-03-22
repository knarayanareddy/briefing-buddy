import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "./components/layout/AppShell";
import Today from "./pages/Today.tsx";
import Connectors from "./pages/Connectors.tsx";
import BriefingBuilder from "./pages/BriefingBuilder.tsx";
import DevMode from "./pages/DevMode.tsx";
import Vault from "./pages/Vault.tsx";
import Auth from "./pages/Auth.tsx";
import ReadingList from "./pages/ReadingList.tsx";
import History from "./pages/History.tsx";
import Settings from "./pages/Settings.tsx";
import YourBrief from "./pages/YourBrief.tsx";
import NotFound from "./pages/NotFound.tsx";
import SharedBrief from "./pages/SharedBrief.tsx";

import { useDevMode } from "@/lib/devMode";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { isDevMode } = useDevMode();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;
  if (!session && !isDevMode) return <Navigate to="/auth" replace />;
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/share/:token" element={<SharedBrief />} />
          <Route element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route path="/" element={<Navigate to="/brief" replace />} />
            <Route path="/brief" element={<YourBrief />} />
            <Route path="/today" element={<Today />} />
            <Route path="/builder" element={<BriefingBuilder />} />
            <Route path="/connectors" element={<Connectors />} />
            <Route path="/vault" element={<Vault />} />
            <Route path="/dev-mode" element={<DevMode />} />
            <Route path="/reading-list" element={<ReadingList />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
