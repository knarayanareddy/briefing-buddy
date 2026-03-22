import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader";
import Sidebar from "./Sidebar";
import { useDevMode } from "@/lib/devMode";

export default function AppShell() {
  const { isDevMode } = useDevMode();
  
  return (
    <div className="flex h-screen w-full bg-[#0B0E14] text-foreground overflow-hidden">
      {/* Permanent Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <AppHeader onSync={() => {}} />
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </div>

        {/* Global Tokens / Status footer in content area if needed, 
            but image shows it in Col 1 of Builder */}
      </main>
    </div>
  );
}
