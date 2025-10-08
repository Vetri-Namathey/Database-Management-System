import React, { useEffect, useState } from 'react';
import { User, Mail, Trophy, Calendar, Shield, Wallet, Edit3, Save, X, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { formatCurrencyCrore } from '@/lib/formatCurrency';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/hooks/use-toast';

interface ProfileData {
  id: number;
  username: string;
  email: string;
  full_name: string;
  team_name: string | null;
  role: string;
  wallet_balance: number;
  created_at: string;
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    team_name: '',
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await api.get(`/user/${user?.username}`);
      setProfile(response.data);
      setEditForm({
        full_name: response.data.full_name,
        team_name: response.data.team_name || '',
        email: response.data.email,
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const updateData: any = {
        full_name: editForm.full_name,
        email: editForm.email
      };

      // Only include team_name for non-admin users
      if (profile?.role !== 'admin') {
        updateData.team_name = editForm.team_name;
      }

      // Include password change if provided
      if (editForm.new_password) {
        if (editForm.new_password !== editForm.confirm_password) {
          toast({
            title: 'Error',
            description: 'New passwords do not match',
            variant: 'destructive',
          });
          return;
        }
        updateData.current_password = editForm.current_password;
        updateData.new_password = editForm.new_password;
      }

      await api.put(`/user/${user?.username}`, updateData);
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      setEditing(false);
      fetchProfile();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setEditing(false);
    if (profile) {
      setEditForm({
        full_name: profile.full_name,
        team_name: profile.team_name || '',
        email: profile.email,
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-32 bg-white/60 dark:bg-slate-800/60 animate-pulse rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-white/60 dark:bg-slate-800/60 animate-pulse rounded-xl" />
            <div className="h-96 bg-white/60 dark:bg-slate-800/60 animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-xl">
              {profile.role === 'admin' ? (
                <Shield className="h-8 w-8 md:h-10 md:w-10 text-white" />
              ) : (
                <User className="h-8 w-8 md:h-10 md:w-10 text-white" />
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 dark:from-blue-400 dark:via-cyan-400 dark:to-blue-300 bg-clip-text text-transparent">
              My Profile
            </h1>
          </div>
          <p className="text-lg text-gray-700 dark:text-slate-300">
            {profile.role === 'admin' ? 'Admin Account Settings' : 'Manage your account and team settings'}
          </p>
        </div>

        {/* Profile Header Card */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="h-24 w-24 md:h-32 md:w-32 ring-4 ring-blue-500/20 shadow-xl">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl md:text-3xl font-bold">
                  {profile.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left space-y-2">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-slate-100">
                  {profile.full_name}
                </h2>
                <p className="text-lg text-gray-600 dark:text-slate-400">@{profile.username}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                  <Badge className={`${profile.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'} px-3 py-1`}>
                    {profile.role === 'admin' ? 'Administrator' : 'Team Manager'}
                  </Badge>
                  {profile.team_name && (
                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-3 py-1">
                      <Trophy className="h-3 w-3 mr-1" />
                      {profile.team_name}
                    </Badge>
                  )}
                </div>
              </div>
              
              <Button
                onClick={() => setEditing(!editing)}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg"
              >
                {editing ? <X className="h-4 w-4 mr-2" /> : <Edit3 className="h-4 w-4 mr-2" />}
                {editing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Information */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-gray-800 dark:text-slate-100">
                <Mail className="h-5 w-5 text-blue-500" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                      Full Name
                    </label>
                    <Input
                      value={editForm.full_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className="bg-white dark:bg-slate-700/50 border-gray-300 dark:border-slate-600"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-white dark:bg-slate-700/50 border-gray-300 dark:border-slate-600"
                    />
                  </div>

                  {profile.role !== 'admin' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                        Team Name
                      </label>
                      <Input
                        value={editForm.team_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, team_name: e.target.value }))}
                        className="bg-white dark:bg-slate-700/50 border-gray-300 dark:border-slate-600"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Email:</span>
                    <span className="font-medium text-gray-800 dark:text-slate-200">{profile.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Username:</span>
                    <span className="font-medium text-gray-800 dark:text-slate-200">@{profile.username}</span>
                  </div>
                  {profile.role !== 'admin' && profile.team_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-slate-400">Team:</span>
                      <span className="font-medium text-gray-800 dark:text-slate-200">{profile.team_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Member Since:</span>
                    <span className="font-medium text-gray-800 dark:text-slate-200">
                      {new Date(profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Stats & Security */}
          <div className="space-y-6">
            {/* Wallet (only for users) */}
            {profile.role !== 'admin' && (
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-gray-800 dark:text-slate-100">
                    <Wallet className="h-5 w-5 text-green-500" />
                    Wallet Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrencyCrore(profile.wallet_balance)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">
                      Available for auctions
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Settings */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-gray-800 dark:text-slate-100">
                  <Shield className="h-5 w-5 text-red-500" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                        Current Password
                      </label>
                      <div className="relative">
                        <Input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={editForm.current_password}
                          onChange={(e) => setEditForm(prev => ({ ...prev, current_password: e.target.value }))}
                          className="bg-white dark:bg-slate-700/50 border-gray-300 dark:border-slate-600 pr-10"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                        >
                          {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                        New Password
                      </label>
                      <div className="relative">
                        <Input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={editForm.new_password}
                          onChange={(e) => setEditForm(prev => ({ ...prev, new_password: e.target.value }))}
                          className="bg-white dark:bg-slate-700/50 border-gray-300 dark:border-slate-600 pr-10"
                          placeholder="Enter new password (optional)"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={editForm.confirm_password}
                          onChange={(e) => setEditForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                          className="bg-white dark:bg-slate-700/50 border-gray-300 dark:border-slate-600 pr-10"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-600 dark:text-slate-400">
                      Password last updated
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-500 mt-2">
                      Click edit to change your password
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Save/Cancel Buttons */}
        {editing && (
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg px-8"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              className="px-8 border-gray-300 dark:border-slate-600"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
