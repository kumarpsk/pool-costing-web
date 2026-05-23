import React, { useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";

/* ----------------- Core UI ----------------- */
import Nav from "./components/nav";
import HelpModal from "./components/HelpModal";

/* ----------------- Main App Pages ----------------- */
import Skimmer from "./components/skimmer";
import Result from "./components/result";
import Infinity from "./components/infinity";
import Curved from "./components/curved";
import Overflow from "./components/overflow";
import Overflowresults from "./components/overflowresults";
import Infinityresults from "./components/infinityresults";
import Curvedresults from "./components/curvedresults";
import DeliveryChallan from "./components/delivery";
import ProformaInvoice from './components/proformainvoice';
import Tax from "./components/tax";
import HeatPumpCalculator from "./components/heatpump";

/* ----------------- Waterbody & Jacuzzi ----------------- */
import JacuzziSpa from "./components/jacuzzi-spa";
import WaterBody from "./components/water-body";
import JacuzziSpaResults from "./components/jacuzzi-spa-results";
import WaterBodyResults from "./components/waterbodyresults";
import JacuzziSpaDeliveryChallan from "./components/jacuzzi-spa-delivery";
import WaterBodyDeliveryChallan from "./components/waterbodydelivery";

/* ----------------- Admin ----------------- */
import Admin from "./components/admin1";
import AdminDashboard from "./components/admindashboard";

/* ----------------- Tenant SaaS ----------------- */
import TenantLogin from "./components/TenantLogin";
import TenantRegister from "./components/TenantRegister";
import TenantPlans from "./components/TenantPlans";
import TenantPayment from "./components/TenantPayment";
import TenantSubscription from "./components/TenantSubscription";
import TenantSubscriptionSuccess from "./components/TenantSubscriptionSuccess";
import TenantProfile from "./components/tenantprofile";

/* ----------------- Tenant Password Reset ----------------- */
import TenantForgotPassword from "./components/tenantforgotpassword";
import TenantResetPassword from "./components/tenantresetpassword";

/* ----------------- Route Guards ----------------- */
import TenantProtectedRoute from "./components/TenantProtectedRoute";
import ProtectedRoute from "./components/protected";

/* ----------------- Scroll To Top ----------------- */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

/* ----------------- Auth Helpers ----------------- */
const isTenantLoggedIn = () => {
  const token = localStorage.getItem("tenant_token");
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

/* ----------------- App ----------------- */
const App = () => {
  const location = useLocation();

  // Hide Nav on tenant auth pages (including subscription pages)
  const isTenantAuthPage = 
    location.pathname === "/" ||
    location.pathname.startsWith("/tenant/login") ||
    location.pathname.startsWith("/tenant/register") ||
    location.pathname.startsWith("/tenant/forgot-password") ||
    location.pathname.startsWith("/tenant/reset-password") ||
    location.pathname.startsWith("/tenant/subscription") ||        // ✅ ADDED
    location.pathname.startsWith("/tenant/subscription-success") || // ✅ ADDED
    location.pathname.startsWith("/tenant/plans") ||               // ✅ ADDED (if needed)
    location.pathname.startsWith("/tenant/payment");               // ✅ ADDED (if needed)

  // Hide Nav ONLY on admin dashboard (admin1 is the login page which should show Nav)
  const isAdminDashboardPage = location.pathname === "/admindashboard";

  // Show Nav for:
  // 1. Regular tenant app pages
  // 2. Admin login page (/admin1)
  // Don't show Nav for:
  // 1. Tenant auth pages (including subscription)
  // 2. Admin dashboard (has its own navigation)
  const showNav = !isTenantAuthPage && !isAdminDashboardPage;

  return (
    <div>
      {showNav && <Nav />}
      <HelpModal />
      <ScrollToTop />

      <Routes>
        {/* ---------------- TENANT AUTH ---------------- */}
        <Route
          path="/"
          element={
            isTenantLoggedIn() ? <Navigate to="/skimmer" replace /> : <TenantLogin />
          }
        />

        {/* Tenant Login alias for clarity */}
        <Route path="/tenant/login" element={<TenantLogin />} />

        {/* Password Reset Flow */}
        <Route path="/tenant/forgot-password" element={<TenantForgotPassword />} />
        <Route path="/tenant/reset-password" element={<TenantResetPassword />} />

        <Route path="/tenant/register" element={<TenantRegister />} />
        <Route path="/tenant/plans" element={<TenantPlans />} />
        <Route path="/tenant/payment" element={<TenantPayment />} />
        <Route path="/tenant/subscription" element={<TenantSubscription />} />
        <Route path="/tenant/subscription-success" element={<TenantSubscriptionSuccess />} />
        <Route path="/tenant/profile" element={<TenantProfile />} />

        {/* ---------------- TENANT APP (PROTECTED) ---------------- */}
        <Route path="/skimmer" element={<TenantProtectedRoute><Skimmer /></TenantProtectedRoute>} />
        <Route path="/result" element={<TenantProtectedRoute><Result /></TenantProtectedRoute>} />
        <Route path="/overflow" element={<TenantProtectedRoute><Overflow /></TenantProtectedRoute>} />
        <Route path="/overflowresults" element={<TenantProtectedRoute><Overflowresults /></TenantProtectedRoute>} />
        <Route path="/infinity" element={<TenantProtectedRoute><Infinity /></TenantProtectedRoute>} />
        <Route path="/infinityresults" element={<TenantProtectedRoute><Infinityresults /></TenantProtectedRoute>} />
        <Route path="/curved" element={<TenantProtectedRoute><Curved /></TenantProtectedRoute>} />
        <Route path="/curvedresults" element={<TenantProtectedRoute><Curvedresults /></TenantProtectedRoute>} />
        <Route path="/delivery" element={<TenantProtectedRoute><DeliveryChallan /></TenantProtectedRoute>} />
        <Route path="/proformainvoice" element={<TenantProtectedRoute><ProformaInvoice /></TenantProtectedRoute>} />
        <Route path="/tax" element={<TenantProtectedRoute><Tax /></TenantProtectedRoute>} />
        <Route path="/heatpump" element={<TenantProtectedRoute><HeatPumpCalculator /></TenantProtectedRoute>} />

        <Route path="/jacuzzi-spa" element={<TenantProtectedRoute><JacuzziSpa /></TenantProtectedRoute>} />
        <Route path="/jacuzzi-spa-results" element={<TenantProtectedRoute><JacuzziSpaResults /></TenantProtectedRoute>} />
        <Route path="/jacuzzi-spa-delivery" element={<TenantProtectedRoute><JacuzziSpaDeliveryChallan /></TenantProtectedRoute>} />

        <Route path="/water-body" element={<TenantProtectedRoute><WaterBody /></TenantProtectedRoute>} />
        <Route path="/waterbodyresults" element={<TenantProtectedRoute><WaterBodyResults /></TenantProtectedRoute>} />
        <Route path="/waterbodydelivery" element={<TenantProtectedRoute><WaterBodyDeliveryChallan /></TenantProtectedRoute>} />
        

        {/* ---------------- ADMIN ---------------- */}
        <Route path="/admin1" element={<Admin />} />
        <Route
          path="/admindashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* ---------------- FALLBACK ---------------- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;