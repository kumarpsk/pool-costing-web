// ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("tenant_admin_token"); // Check for admin token

  if (!token) {
    // If no token → redirect to login
    return <Navigate to="/admin1" replace />;
    
  }

  return children; // If token exists → allow access
};

export default ProtectedRoute;
