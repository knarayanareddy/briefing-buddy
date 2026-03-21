import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Settings2, Share2, Library, History, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Today", icon: LayoutDashboard, href: "/today" },
  { label: "Builder", icon: Settings2, href: "/builder" },
  { label: "Connectors", icon: Share2, href: "/connectors" },
  { label: "Reading List", icon: Library, href: "/reading-list" },
  { label: "History", icon: History, href: "/history" },
];

export default function SidebarNav() {
  const location = useLocation();

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <h1 className="font-bold text-lg tracking-tight">My Morning Brief</h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          System Active
        </div>
      </div>
    </aside>
  );
}
