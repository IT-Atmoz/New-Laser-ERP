import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { setupUsers } from "@/utils/auth";

// Lazy load pages to avoid circular dependencies
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AddJob = lazy(() => import("./pages/AddJob"));
const ManageJobs = lazy(() => import("./pages/ManageJobs"));
const Customers = lazy(() => import("./pages/Customers"));
const Offices = lazy(() => import("./pages/Offices"));
const MaterialTypes = lazy(() => import("./pages/MaterialTypes"));
const Thickness = lazy(() => import("./pages/Thickness"));
const Dimensions = lazy(() => import("./pages/Dimensions"));
const SheetView = lazy(() => import("./pages/SheetView"));
const RecycleBin = lazy(() => import("./pages/RecycleBin"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    setupUsers();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<AddJob />} />
            <Route path="/add-job" element={<AddJob />} />
            <Route path="/manage-jobs" element={<ManageJobs />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/offices" element={<Offices />} />
            <Route path="/material-types" element={<MaterialTypes />} />
            <Route path="/thickness" element={<Thickness />} />
            <Route path="/dimensions" element={<Dimensions />} />
            <Route path="/sheet-view" element={<SheetView />} />
            <Route path="/recycle-bin" element={<RecycleBin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
