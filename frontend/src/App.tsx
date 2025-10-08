import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthSplash from "./pages/AuthSplash";
import { useAuthStore } from "@/stores/auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import PlayersPage from "./pages/PlayersPage";
import RequireAuth from "./components/auth/RequireAuth";
import AppLayout from "./components/layout/AppLayout";
import NotFound from "./pages/NotFound";
import StyledPage from "./pages/StyledPage";
import ProfilePage from "./pages/ProfilePage";
import LeaderboardPreview from "./pages/LeaderboardPreview";
import SettingsPage from "./pages/SettingsPage";
import AdminUsers from "./pages/AdminUsers";
import AdminAuctions from "./pages/AdminAuctions";
import AdminAnalytics from "./pages/AdminAnalytics";
import AuctionWaiting from "./pages/AuctionWaiting";
import LiveAuction from "./pages/LiveAuction";
import TeamPage from "./pages/TeamPage";
import WalletPage from "./pages/WalletPage";
import PlayerDetailsPage from "./pages/PlayerDetailsPage";
import React, { useEffect, useState } from 'react';

const queryClient = new QueryClient();

const App = () => {
  const [health, setHealth] = useState<string>('');

  // Persist user authentication state on app load
  const { user, checkAuth, loading } = useAuthStore();
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(JSON.stringify(data)))
      .catch((err) => console.error(err));
  }, []);

  // Show loading while checking auth
  if (loading) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-xl text-muted-foreground">Loading CricBid...</p>
            </div>
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes: If logged in, redirect to dashboard/admin. */}
            <Route path="/" element={
              user ? (user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />) : <AuthSplash />
            } />
            <Route path="/login" element={
              user ? (user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />) : <AuthSplash />
            } />
            <Route path="/register" element={
              user ? (user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />) : <AuthSplash />
            } />
            <Route path="/styled" element={<StyledPage />} />

            {/* Protected user routes */}
            <Route path="/dashboard" element={
              <RequireAuth>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </RequireAuth>
            } />

            {/* Protected admin routes */}
            <Route path="/admin" element={
              <RequireAuth adminOnly>
                <AppLayout>
                  <AdminDashboard />
                </AppLayout>
              </RequireAuth>
            } />

            <Route path="/admin/users" element={
              <RequireAuth adminOnly>
                <AppLayout>
                  <AdminUsers />
                </AppLayout>
              </RequireAuth>
            } />

            <Route path="/admin/auctions" element={
              <RequireAuth adminOnly>
                <AppLayout>
                  <AdminAuctions />
                </AppLayout>
              </RequireAuth>
            } />

            <Route path="/admin/analytics" element={
              <RequireAuth adminOnly>
                <AppLayout>
                  <AdminAnalytics />
                </AppLayout>
              </RequireAuth>
            } />

            {/* Placeholder for other routes */}

            <Route path="/auctions" element={
              <RequireAuth>
                <AppLayout>
                  <AuctionWaiting />
                </AppLayout>
              </RequireAuth>
            } />

            <Route path="/auctions/:id/waiting-room" element={
              <RequireAuth>
                <AppLayout>
                  <AuctionWaiting />
                </AppLayout>
              </RequireAuth>
            } />

            <Route path="/live-auction" element={
              <RequireAuth>
                <AppLayout>
                  <LiveAuction />
                </AppLayout>
              </RequireAuth>
            } />

            <Route path="/players" element={
              <RequireAuth>
                <AppLayout>
                  <PlayersPage />
                </AppLayout>
              </RequireAuth>
            } />
            
            <Route path="/players/:id" element={
              <RequireAuth>
                <AppLayout>
                  <PlayerDetailsPage />
                </AppLayout>
              </RequireAuth>
            } />

            <Route path="/profile" element={
              <RequireAuth>
                <AppLayout>
                  <ProfilePage />
                </AppLayout>
              </RequireAuth>
            } />

            <Route path="/leaderboard-preview" element={
              <RequireAuth>
                <AppLayout>
                  <LeaderboardPreview />
                </AppLayout>
              </RequireAuth>
            } />

            <Route path="/settings" element={
              <RequireAuth>
                <AppLayout>
                  <SettingsPage />
                </AppLayout>
              </RequireAuth>
            } />

            <Route path="/team" element={
              <RequireAuth>
                <AppLayout>
                  <TeamPage />
                </AppLayout>
              </RequireAuth>
            } />

            <Route path="/wallet" element={
              <RequireAuth>
                <AppLayout>
                  <WalletPage />
                </AppLayout>
              </RequireAuth>
            } />

            <Route path="/leaderboard" element={
              <RequireAuth>
                <LeaderboardPreview />
              </RequireAuth>
            } />

            {/* Catch-all route for undefined paths */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
