import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Users, Zap, Eye, EyeOff, User, Mail, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/hooks/use-toast';
import cricketHero from '@/assets/cricket-hero.jpg';

export default function AuthSplash() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, login, register, loading, error, clearError, checkAuth } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState('login');
  // Allow toggling between user and admin view. When admin is selected,
  // registration is hidden (admins must be created out-of-band).
  const [userType, setUserType] = useState<'user' | 'admin'>('user');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });
  
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    team_name: ''
  });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      // Debug: show user object after login
      toast({
        title: 'Login Success',
        description: `User: ${user.username}, Role: ${user.role}`,
        variant: 'default',
      });
      console.log('User after login:', user);
      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate, toast]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      clearError();
    }
  }, [error, toast, clearError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Login form submitted:', { username: loginForm.username });
      await login(loginForm.username, loginForm.password);
      toast({
        title: 'Success',
        description: 'Logged in successfully!',
        variant: 'default',
      });
    } catch (error: any) {
      // Error is handled by the store and useEffect
      console.error('Login failed:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Register form submitted:', { 
        username: registerForm.username, 
        userType,
        role: userType 
      });
      await register({
        ...registerForm,
        role: 'user' // Admin creation via public UI is disabled; always register as 'user'
      });
      toast({
        title: 'Success',
        description: `User account created successfully!`,
        variant: 'default',
      });
    } catch (error) {
      // Error is handled by the store and useEffect
      console.error('Registration failed:', error);
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading CricBid...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col lg:flex-row items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(34, 197, 94, 0.4), rgba(22, 163, 74, 0.3)), url(${cricketHero})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Animated background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-transparent to-blue-900/20" />
      <div className="absolute inset-0 bg-black/30" />
      
      {/* Floating background elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-green-400/10 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-24 h-24 bg-blue-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-yellow-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col lg:flex-row items-center justify-center min-h-screen gap-8 lg:gap-16">
        
        {/* Left Side - Branding */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex-1 text-center lg:text-left text-white max-w-2xl"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.02, 1],
              rotate: [0, 1, -1, 0]
            }}
            transition={{ 
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="mb-8"
          >
            <div className="flex items-center justify-center lg:justify-start gap-6 mb-8">
              <div className="relative">
                <Trophy className="h-20 w-20 text-yellow-400 drop-shadow-lg" />
                <div className="absolute inset-0 animate-ping">
                  <Trophy className="h-20 w-20 text-yellow-400/30" />
                </div>
              </div>
              <div>
                <h1 className="text-7xl lg:text-8xl font-bold bg-gradient-to-r from-white via-green-100 to-white bg-clip-text text-transparent drop-shadow-2xl">
                  CricBid
                </h1>
                <div className="h-1 w-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full mt-2"></div>
              </div>
            </div>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl mb-8 opacity-95 font-light leading-relaxed"
          >
            The ultimate cricket auction platform where strategy meets passion.
          </motion.p>
          
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center lg:justify-start gap-4 group"
            >
              <div className="p-3 bg-green-400/20 rounded-full backdrop-blur-sm border border-green-400/30 group-hover:bg-green-400/30 transition-all duration-300">
                <Users className="h-7 w-7 text-green-300" />
              </div>
              <span className="text-lg font-medium">Real-time bidding with live participants</span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center lg:justify-start gap-4 group"
            >
              <div className="p-3 bg-yellow-400/20 rounded-full backdrop-blur-sm border border-yellow-400/30 group-hover:bg-yellow-400/30 transition-all duration-300">
                <Zap className="h-7 w-7 text-yellow-300" />
              </div>
              <span className="text-lg font-medium">AI-powered post-auction analytics</span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center lg:justify-start gap-4 group"
            >
              <div className="p-3 bg-orange-400/20 rounded-full backdrop-blur-sm border border-orange-400/30 group-hover:bg-orange-400/30 transition-all duration-300">
                <Trophy className="h-7 w-7 text-orange-300" />
              </div>
              <span className="text-lg font-medium">Build your dream cricket team</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Side - Auth Forms */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="relative">
            {/* Glassmorphism card */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
              {/* Card background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-green-400/5 rounded-3xl" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-green-400/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-center mb-8"
                >
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {activeTab === 'login' ? 'Welcome Back' : 'Join CricBid'}
                  </h2>
                  <p className="text-white/70 text-lg">
                    {activeTab === 'login' 
                      ? 'Sign in to your account' 
                      : `Create your ${userType} account to start bidding`
                    }
                  </p>
                </motion.div>

                {/* User/Admin toggle: when Admin is selected, only show login (no register) */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex gap-2 mb-6 p-1 bg-black/20 rounded-2xl backdrop-blur-sm border border-white/10"
                >
                  <button
                    type="button"
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                      userType === 'user' 
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25' 
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                    onClick={() => setUserType('user')}
                  >
                    <User className="h-4 w-4" />
                    User
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                      userType === 'admin' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                    onClick={() => { setUserType('admin'); setActiveTab('login'); }}
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </button>
                </motion.div>

                {/* Login/Register Forms */}
                  <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  {/* Tab Toggle */}
                  <div className="flex gap-1 mb-8 p-1 bg-black/20 rounded-2xl backdrop-blur-sm border border-white/10">
                    <button
                      type="button"
                      className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                        activeTab === 'login' 
                          ? 'bg-white/20 text-white shadow-lg' 
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                      onClick={() => setActiveTab('login')}
                    >
                      Login
                    </button>
                      {userType === 'user' && (
                        <button
                          type="button"
                          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                            activeTab === 'register'
                              ? 'bg-white/20 text-white shadow-lg' 
                              : 'text-white/70 hover:text-white hover:bg-white/5'
                          }`}
                          onClick={() => setActiveTab('register')}
                        >
                          Register
                        </button>
                      )}
                  </div>

                  {/* Login Form */}
                  {activeTab === 'login' && (
                    <motion.form
                      key="login"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={handleLogin}
                      className="space-y-6"
                    >
                      <div className="space-y-2">
                        <label htmlFor="username" className="text-white/90 font-medium text-sm">
                          Username
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                          <input
                            id="username"
                            type="text"  
                            value={loginForm.username}
                            onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                            className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                            placeholder="Enter your username"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="password" className="text-white/90 font-medium text-sm">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={loginForm.password}
                            onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                            className="w-full pl-12 pr-12 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                            placeholder="Enter your password"
                            required
                          />
                          <button
                            type="button"
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-green-500 via-green-600 to-green-700 hover:from-green-600 hover:via-green-700 hover:to-green-800 text-white font-bold rounded-2xl transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-green-400/50 shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Signing in...
                          </div>
                        ) : (
                          'Sign In'
                        )}
                      </button>
                    </motion.form>
                  )}

                  {/* Register Form */}
                  {activeTab === 'register' && (
                    <motion.form
                      key="register"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={handleRegister}
                      className="space-y-5"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label htmlFor="reg-username" className="text-white/90 font-medium text-sm">
                            Username
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                            <input
                              id="reg-username"
                              type="text"
                              value={registerForm.username}
                              onChange={(e) => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
                              className="w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-transparent backdrop-blur-sm transition-all duration-300 text-sm"
                              placeholder="Username"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="reg-email" className="text-white/90 font-medium text-sm">
                            Email
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                            <input
                              id="reg-email"
                              type="email"
                              value={registerForm.email}
                              onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                              className="w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-transparent backdrop-blur-sm transition-all duration-300 text-sm"
                              placeholder="Email"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="reg-fullname" className="text-white/90 font-medium text-sm">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                          <input
                            id="reg-fullname"
                            type="text"
                            value={registerForm.full_name}
                            onChange={(e) => setRegisterForm(prev => ({ ...prev, full_name: e.target.value }))}
                            className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                            placeholder="Enter your full name"
                            required
                          />
                        </div>
                      </div>

                      {userType === 'user' && (
                        <div className="space-y-2">
                          <label htmlFor="reg-teamname" className="text-white/90 font-medium text-sm">
                            Team Name
                          </label>
                          <div className="relative">
                            <Trophy className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                            <input
                              id="reg-teamname"
                              type="text"
                              value={registerForm.team_name}
                              onChange={(e) => setRegisterForm(prev => ({ ...prev, team_name: e.target.value }))}
                              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                              placeholder="Enter your team name"
                              required
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label htmlFor="reg-password" className="text-white/90 font-medium text-sm">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                          <input
                            id="reg-password"
                            type={showPassword ? 'text' : 'password'}
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                            className="w-full pl-12 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                            placeholder="Create a password"
                            required
                          />
                          <button
                            type="button"
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 text-white font-bold rounded-2xl transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                          'bg-gradient-to-r from-green-500 via-green-600 to-green-700 hover:from-green-600 hover:via-green-700 hover:to-green-800 focus:ring-green-400/50 shadow-green-500/25'
                        }`}
                      >
                        {loading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Creating account...
                          </div>
                        ) : (
                          `Create User Account`
                        )}
                      </button>
                    </motion.form>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}