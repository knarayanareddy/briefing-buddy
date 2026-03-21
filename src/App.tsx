import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "./components/layout/AppShell";
import Today from "./pages/Today.tsx";
import Connectors from "./pages/Connectors.tsx";
import BriefingBuilder from "./pages/BriefingBuilder.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

// Placeholders for future milestones
const ReadingList = () => (
  <div className="flex-1 flex items-center justify-center p-8 text-center animate-in fade-in duration-700">
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Reading List</h2>
      <p className="text-muted-foreground italic max-w-sm">This feature is scheduled for v1.1. You'll be able to save articles here for deeper reading later.</p>
    </div>
  </div>
);
const History = () => (
  <div className="flex-1 flex items-center justify-center p-8 text-center animate-in fade-in duration-700">
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Briefing History</h2>
      <p className="text-muted-foreground italic max-w-sm">Your past daily briefings will be archived here soon.</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<Today />} />
            <Route path="/builder" element={<BriefingBuilder />} />
            <Route path="/connectors" element={<Connectors />} />
            <Route path="/reading-list" element={<ReadingList />} />
            <Route path="/history" element={<History />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
