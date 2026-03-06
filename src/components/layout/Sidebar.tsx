import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  PlusCircle,
  Briefcase,
  Users,
  Building2,
  Table,
  Package,
  Trash2,
  LogOut
} from "lucide-react";
import { logout, getUsername, getUserRole, isAdmin } from "@/utils/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import smelogo from './smelogo.jpeg'; // Your logo

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
    // { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/add-job", icon: PlusCircle, label: "Add Job" },
    { to: "/manage-jobs", icon: Briefcase, label: "Manage Jobs" },
    { to: "/customers", icon: Users, label: "Customers" },
    { to: "/offices", icon: Building2, label: "Offices" },
    { to: "/material-types", icon: Package, label: "Material Types" },
    { to: "/sheet-view", icon: Table, label: "Sheet View" },
    { to: "/recycle-bin", icon: Trash2, label: "Recycle Bin" },
  ];

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground min-h-screen flex flex-col">
      {/* Logo & Title Section */}
      <div className="p-6 border-b border-sidebar-border flex flex-col items-center">
        <div className="mb-4">
          <img 
            src={smelogo} 
            alt="SME Logo" 
            className="w-32 h-auto object-contain drop-shadow-md 
                       sm:w-36 
                       md:w-40 
                       lg:w-44 
                       xl:w-48 
                       transition-all duration-300"
          />
        </div>
        <h1 className="text-2xl font-bold text-sidebar-primary tracking-tight">
          Job ERP
        </h1>
        <p className="text-sm text-sidebar-foreground/70 mt-1">
          Management System
        </p>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 group"
                activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-md"
              >
                <item.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                <span className="text-sm">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="mb-3 p-3 bg-sidebar-accent rounded-lg">
          <p className="text-xs text-sidebar-foreground/60 mb-1">Logged in as</p>
          <p className="font-semibold text-sidebar-foreground">{username}</p>
          <Badge variant={adminUser ? "default" : "secondary"} className="mt-1">
            {role === "admin" ? "Admin" : "User"}
          </Badge>
        </div>
        <Button
          onClick={handleLogout}
          variant="destructive"
          className="w-full flex items-center justify-center gap-2 hover:gap-3 transition-all duration-200 font-medium"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
