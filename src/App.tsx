import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Index from "./pages/Index";
import PharmacistDashboard from "./pages/PharmacistDashboard";
import PharmacistInventory from "./pages/pharmacist/PharmacistInventory";
import PharmacistAlerts from "./pages/pharmacist/PharmacistAlerts";
import PharmacistPatients from "./pages/pharmacist/PharmacistPatients";
import PharmacistAnalytics from "./pages/pharmacist/PharmacistAnalytics";
import PharmacistSettings from "./pages/pharmacist/PharmacistSettings";
import PharmacistAIMetrics from "./pages/pharmacist/PharmacistAIMetrics";
import PharmacistScan from "./pages/pharmacist/PharmacistScan";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUserManagement from "./pages/admin/AdminUserManagement";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSecurity from "./pages/admin/AdminSecurity";
import AdminCompliance from "./pages/admin/AdminCompliance";
import AdminDrugManagement from "./pages/admin/AdminDrugManagement";
import AdminAIHealth from "./pages/admin/AdminAIHealth";
import Auth from "./pages/Auth";
import PatientDashboard from "./pages/patient/PatientDashboard";
import CarteChifa from "./pages/patient/CarteChifa";
import Ordonnances from "./pages/patient/Ordonnances";
import PatientMedications from "./pages/patient/PatientMedications";
import PatientProfile from "./pages/patient/PatientProfile";
import PatientAssistant from "./pages/patient/PatientAssistant";
import PatientDrugSearch from "./pages/patient/PatientDrugSearch";
import PharmacistChifa from "./pages/pharmacist/PharmacistChifa";
import Guide from "./pages/Guide";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/guide" element={<Guide />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Pharmacist routes — requires 'pharmacist' role */}
              <Route path="/pharmacist" element={<ProtectedRoute requiredRole="pharmacist"><PharmacistDashboard /></ProtectedRoute>} />
              <Route path="/pharmacist/inventory" element={<ProtectedRoute requiredRole="pharmacist"><PharmacistInventory /></ProtectedRoute>} />
              <Route path="/pharmacist/alerts" element={<ProtectedRoute requiredRole="pharmacist"><PharmacistAlerts /></ProtectedRoute>} />
              <Route path="/pharmacist/patients" element={<ProtectedRoute requiredRole="pharmacist"><PharmacistPatients /></ProtectedRoute>} />
              <Route path="/pharmacist/analytics" element={<ProtectedRoute requiredRole="pharmacist"><PharmacistAnalytics /></ProtectedRoute>} />
              <Route path="/pharmacist/settings" element={<ProtectedRoute requiredRole="pharmacist"><PharmacistSettings /></ProtectedRoute>} />
              <Route path="/pharmacist/scan" element={<ProtectedRoute requiredRole="pharmacist"><PharmacistScan /></ProtectedRoute>} />
              <Route path="/pharmacist/ai-metrics" element={<ProtectedRoute requiredRole="pharmacist"><PharmacistAIMetrics /></ProtectedRoute>} />
              <Route path="/pharmacist/chifa" element={<ProtectedRoute requiredRole="pharmacist"><PharmacistChifa /></ProtectedRoute>} />

              {/* Admin routes — requires 'admin' role */}
              <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><AdminUserManagement /></ProtectedRoute>} />
              <Route path="/admin/drugs" element={<ProtectedRoute requiredRole="admin"><AdminDrugManagement /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute requiredRole="admin"><AdminAnalytics /></ProtectedRoute>} />
              <Route path="/admin/ai" element={<ProtectedRoute requiredRole="admin"><AdminAIHealth /></ProtectedRoute>} />
              <Route path="/admin/security" element={<ProtectedRoute requiredRole="admin"><AdminSecurity /></ProtectedRoute>} />
              <Route path="/admin/compliance" element={<ProtectedRoute requiredRole="admin"><AdminCompliance /></ProtectedRoute>} />

              {/* Patient routes — requires 'patient' role */}
              <Route path="/patient" element={<ProtectedRoute requiredRole="patient"><PatientDashboard /></ProtectedRoute>} />
              <Route path="/patient/carte-chifa" element={<ProtectedRoute requiredRole="patient"><CarteChifa /></ProtectedRoute>} />
              <Route path="/patient/ordonnances" element={<ProtectedRoute requiredRole="patient"><Ordonnances /></ProtectedRoute>} />
              <Route path="/patient/medications" element={<ProtectedRoute requiredRole="patient"><PatientMedications /></ProtectedRoute>} />
              <Route path="/patient/profile" element={<ProtectedRoute requiredRole="patient"><PatientProfile /></ProtectedRoute>} />
              <Route path="/patient/assistant" element={<ProtectedRoute requiredRole="patient"><PatientAssistant /></ProtectedRoute>} />
              <Route path="/patient/drug-search" element={<ProtectedRoute requiredRole="patient"><PatientDrugSearch /></ProtectedRoute>} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
