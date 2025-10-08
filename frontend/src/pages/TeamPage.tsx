import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { Users, Trophy, Star, Crown, Edit, Calendar, MapPin, Phone, Mail, Shield, Award, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { formatCurrencyCrore } from '@/lib/formatCurrency';
import { useToast } from '@/hooks/use-toast';

interface Player {
  id: number;
  name: string;
  role: string;
  price: number;
  base_price?: number;
  nationality?: string;
  acquired_round?: number;
  rating: number;
  runs_scored?: number;
  wickets_taken?: number;
  strike_rate?: number;
  economy_rate?: number;
  points?: number;
}

interface TeamStats {
  totalPlayers: number;
  totalSpent: number;
  remainingBudget: number;
  avgRating: number;
  batsmen?: number;
  bowlers?: number;
  wicket_keepers?: number;
  all_rounders?: number;
}

export default function TeamPage() {
  const { toast } = useToast();
  const user = useAuthStore((state) => state.user);
  const [teamName, setTeamName] = useState('My Team');
  const [teamDescription, setTeamDescription] = useState('Building a championship team through strategic player acquisition.');
  const [players, setPlayers] = useState<Player[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({
    name: teamName,
    description: teamDescription,
  });
  
  // Add a message for empty team state
  const noPlayersMessage = loading 
    ? "Loading your team roster..."
    : "You haven't acquired any players yet. Join an auction to build your team!";

  useEffect(() => {
    // Set team name from user object if available
    if (user && user.team_name) {
      setTeamName(user.team_name);
      setEditForm((prev) => ({ ...prev, name: user.team_name }));
    }
    // Only fetch team data if we have a user
    if (user && user.id) {
      fetchTeamData();
    }
  }, [user]);

  const fetchTeamData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/users/${user.id}/team`);
      
      if (response.data) {
        // Set team name if it exists in response and user has no team name
        if (response.data.team_name && (!user.team_name || user.team_name === "My Team")) {
          setTeamName(response.data.team_name);
          setEditForm(prev => ({ ...prev, name: response.data.team_name }));
        }
        
        // Set players
        setPlayers(response.data.players || []);
        
        // Log response for debugging
        console.log("Team data fetched:", response.data);
      }
    } catch (error) {
      console.error('Failed to fetch team data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch team data. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const teamStats: TeamStats = {
    totalPlayers: players.length,
    totalSpent: players.reduce((sum, player) => sum + player.price, 0),
    remainingBudget: 100 - players.reduce((sum, player) => sum + player.price, 0),
    avgRating: players.length > 0 ? players.reduce((sum, player) => sum + player.rating, 0) / players.length : 0,
    batsmen: players.filter(p => p.role.toLowerCase() === "batsman").length,
    bowlers: players.filter(p => p.role.toLowerCase() === "bowler").length,
    wicket_keepers: players.filter(p => p.role.toLowerCase() === "wicket-keeper").length,
    all_rounders: players.filter(p => p.role.toLowerCase() === "all-rounder").length,
  };

  const handleSaveTeam = async () => {
    try {
      // TODO: Save team information to backend
      setTeamName(editForm.name);
      setTeamDescription(editForm.description);
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Team information updated successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update team information',
        variant: 'destructive',
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'batsman': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'bowler': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'all-rounder': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'wicket-keeper': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 dark:from-slate-900 dark:via-green-900 dark:to-emerald-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl">
              <Shield className="h-10 w-10 md:h-12 md:w-12 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-green-800 dark:from-green-400 dark:via-emerald-400 dark:to-green-300 bg-clip-text text-transparent">
                {loading ? "Loading Team" : "My Team"}
              </h1>
              <p className="text-xl md:text-2xl text-gray-700 dark:text-slate-300 font-semibold">
                {teamName}
                {loading && <span className="inline-block ml-2 animate-pulse">...</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Team Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Total Players</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                    {teamStats.totalPlayers}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/30 transition-colors">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Total Spent</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors">
                    {formatCurrencyCrore(teamStats.totalSpent)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-800/30 transition-colors">
                  <Trophy className="h-6 w-6 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Remaining Budget</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                    {formatCurrencyCrore(teamStats.remainingBudget)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-800/30 transition-colors">
                  <Target className="h-6 w-6 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Avg Rating</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors">
                    {teamStats.avgRating.toFixed(1)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center group-hover:bg-orange-200 dark:group-hover:bg-orange-800/30 transition-colors">
                  <Star className="h-6 w-6 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Information */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl text-gray-800 dark:text-slate-100">
                  <span className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    Team Information
                  </span>
                  <Dialog open={isEditing} onOpenChange={setIsEditing}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Team Information</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Team Name</label>
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Description</label>
                          <Textarea
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="mt-1"
                            rows={3}
                          />
                        </div>
                        <Button onClick={handleSaveTeam} className="w-full">
                          Save Changes
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Avatar className="h-24 w-24 mx-auto mb-4 ring-4 ring-blue-500/30">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold">
                      {teamName.split(' ').map(word => word.charAt(0)).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {teamName}
                  </h3>
                  <p className="text-gray-600 dark:text-slate-400 mt-2">
                    {teamDescription}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">
                      Founded: IPL 2024
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">
                      Mumbai, India
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Award className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">
                      Championship: 0 Titles
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-800 dark:text-slate-200">Budget Usage</h4>
                  <Progress value={(teamStats.totalSpent / 100) * 100} className="h-3" />
                  <div className="flex justify-between text-sm text-gray-600 dark:text-slate-400">
                    <span>Used: {formatCurrencyCrore(teamStats.totalSpent)}</span>
                    <span>Remaining: {formatCurrencyCrore(teamStats.remainingBudget)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Players List */}
          <div className="lg:col-span-2">
            <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl text-gray-800 dark:text-slate-100">
                  <span className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Squad Players ({players.length}/11)
                  </span>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Active
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : players.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {players.map((player) => (
                    <div key={player.id} className="p-4 bg-gray-50/80 dark:bg-slate-700/50 rounded-xl border border-gray-200/50 dark:border-slate-600/50 hover:bg-white/90 dark:hover:bg-slate-600/60 hover:border-blue-300/50 dark:hover:border-blue-600/50 transition-all duration-300 hover:scale-105 hover:shadow-lg group relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 ring-2 ring-blue-500/30 group-hover:ring-blue-500/60 transition-all">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold group-hover:from-blue-600 group-hover:to-indigo-700 transition-all">
                              {player.name.split(' ').map(n => n.charAt(0)).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                              {player.name}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge className={`${getRoleColor(player.role)} text-xs group-hover:scale-105 transition-transform`}>
                                {player.role}
                              </Badge>
                              {player.nationality && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {player.nationality}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-bold text-gray-900 dark:text-slate-100 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                              {player.rating}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors">
                            {formatCurrencyCrore(player.price)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Player stats */}
                      {(player.runs_scored !== undefined || player.wickets_taken !== undefined) && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-600/50">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {player.runs_scored !== undefined && (
                              <div className="text-gray-600 dark:text-gray-300">
                                <span className="font-medium">Runs:</span> {player.runs_scored}
                              </div>
                            )}
                            {player.wickets_taken !== undefined && (
                              <div className="text-gray-600 dark:text-gray-300">
                                <span className="font-medium">Wickets:</span> {player.wickets_taken}
                              </div>
                            )}
                            {player.strike_rate != null && (
                              <div className="text-gray-600 dark:text-gray-300">
                                <span className="font-medium">SR:</span> {player.strike_rate.toFixed(2)}
                              </div>
                            )}
                            {player.economy_rate != null && (
                              <div className="text-gray-600 dark:text-gray-300">
                                <span className="font-medium">Econ:</span> {player.economy_rate.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Purchase info */}
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                        <span>Base: {formatCurrencyCrore(player.base_price || 0)}</span>
                        {player.acquired_round && <span>Round: {player.acquired_round}</span>}
                      </div>
                      {/* Small sold-to-you stamp for players in this team (this page shows the user's team) */}
                      <div className="absolute top-3 right-3 pointer-events-none">
                        <div className="text-xs bg-green-600 font-extrabold text-white px-3 py-1 rounded-lg shadow-2xl transform rotate-12 border-2 border-white/40">SOLD TO YOU</div>
                      </div>
                    </div>
                  ))}

                  {/* Empty slots */}
                  {Array.from({ length: Math.max(0, 11 - players.length) }, (_, i) => (
                    <div key={`empty-${i}`} className="p-4 bg-gray-100/50 dark:bg-slate-800/30 rounded-xl border-2 border-dashed border-gray-300/50 dark:border-slate-600/50 flex items-center justify-center">
                      <div className="text-center text-gray-400 dark:text-slate-500">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Available Slot</p>
                      </div>
                    </div>
                  ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">No Players Yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                      {noPlayersMessage}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Team Composition */}
        <Card className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-blue-900/20 backdrop-blur-sm border border-blue-300/30 dark:border-blue-600/30 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-1">
                  Team Composition
                </h3>
                <p className="text-gray-700 dark:text-slate-300">
                  Current breakdown of player types in your squad
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {teamStats.batsmen || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Batsmen
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {teamStats.bowlers || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Bowlers
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {teamStats.all_rounders || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    All-Rounders
                  </div>
                </div>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {teamStats.wicket_keepers || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Wicket-Keepers
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="font-medium text-gray-800 dark:text-slate-200 mb-2">Team Strategy Tips</h4>
              <p className="text-gray-700 dark:text-slate-300 text-sm">
                Build a balanced team with strong batting lineup and effective bowling attack. 
                Focus on acquiring experienced players while maintaining budget for key all-rounders.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
