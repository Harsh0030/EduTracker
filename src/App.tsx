import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MarkAttendance from './pages/MarkAttendance';
import ManageStudents from './pages/ManageStudents';
import StudentDetails from './pages/StudentDetails';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Toaster 
            position="top-center"
            toastOptions={{
              className: 'rounded-2xl font-bold text-sm shadow-xl',
              duration: 3000,
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/attendance" element={
              <ProtectedRoute>
                <Layout>
                  <MarkAttendance />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/students" element={
              <ProtectedRoute>
                <Layout>
                  <ManageStudents />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/student-details" element={
              <ProtectedRoute>
                <Layout>
                  <StudentDetails />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/reports" element={
              <ProtectedRoute>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
