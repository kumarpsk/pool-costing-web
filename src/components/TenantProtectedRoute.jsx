import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const TenantProtectedRoute = ({ children }) => {
  const location = useLocation();

  const token = localStorage.getItem("tenant_token");

  // ❌ No token → go to login
  if (!token) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  try {
    // 🔐 Decode JWT payload
    const payload = JSON.parse(atob(token.split(".")[1]));

    // ⏳ Check expiry
    if (!payload.exp || payload.exp * 1000 < Date.now()) {
      console.warn("⚠️ Tenant token expired");

      localStorage.removeItem("tenant_token");

      return <Navigate to="/" replace state={{ from: location }} />;
    }

    // ✅ Token valid → allow access
    return children;
  } catch (err) {
    console.error("❌ Invalid tenant token", err);

    localStorage.removeItem("tenant_token");

    return <Navigate to="/" replace state={{ from: location }} />;
  }
};

export default TenantProtectedRoute;
