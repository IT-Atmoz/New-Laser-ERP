import { NavLink } from "@/components/NavLink";
import {
  PlusCircle,
  Briefcase,
  Users,
  Building2,
  Table,
  Package,
  Layers,
  Trash2,
  LogOut,
  Zap,
} from "lucide-react";
import { logout, getUsername, getUserRole, isAdmin } from "@/utils/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import smelogo from './smelogo.jpeg';

const Sidebar = () => {
  const navigate = useNavigate();
  const username = getUsername();
  const role = getUserRole();
  const adminUser = isAdmin();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    { to: "/add-job",       icon: PlusCircle, label: "Add Job" },
    { to: "/manage-jobs",   icon: Briefcase,  label: "Manage Jobs" },
    { to: "/customers",     icon: Users,      label: "Customers" },
    { to: "/offices",       icon: Building2,  label: "Offices" },
    { to: "/material-types",icon: Package,    label: "Material Types" },
    { to: "/models",        icon: Layers,     label: "Models" },
    { to: "/sheet-view",    icon: Table,      label: "Sheet View" },
    { to: "/recycle-bin",   icon: Trash2,     label: "Recycle Bin" },
  ];

  return (
    <aside className="w-64 min-h-screen flex flex-col border-r border-sidebar-border bg-sidebar shadow-sm">

      {/* Logo */}
      <div className="px-6 py-5 border-b border-sidebar-border flex flex-col items-center gap-3">
        <img
          src={smelogo}
          alt="SME Logo"
          className="w-28 h-auto object-contain"
        />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-sidebar-foreground leading-none">Laser ERP</p>
            <p className="text-xs text-muted-foreground">Management System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-3">
          Menu
        </p>
        <ul className="space-y-0.5">
          {menuItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150 text-sm font-medium group"
                activeClassName="bg-orange-50 text-orange-600 font-semibold border border-orange-200"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
          <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {username?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">{username}</p>
            <Badge
              variant={adminUser ? "default" : "secondary"}
              className={`text-xs mt-0.5 ${adminUser ? "bg-orange-500 hover:bg-orange-600" : ""}`}
            >
              {role === "admin" ? "Admin" : "User"}
            </Badge>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full flex items-center gap-2 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300 font-medium"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
