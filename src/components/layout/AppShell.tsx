import { Outlet } from "react-router-dom";
import SidebarNav from "./SidebarNav.tsx";
import AppHeader from "./AppHeader.tsx";

export default function AppShell() {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <SidebarNav />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader onSync={() => console.log("Global sync triggered")} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
