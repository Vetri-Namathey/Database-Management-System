import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Star, MapPin, TrendingUp, Users, Award, Trophy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatCurrencyCrore } from '@/lib/formatCurrency';
import { useToast } from '@/hooks/use-toast';

interface Player {
  id: number;
  player_name: string;
  role: string;
  nationality: string;
  base_price: number;
  is_available: boolean;
}

export default function PlayersPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedNationality, setSelectedNationality] = useState<string>('all');

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await api.get('/players');
      setPlayers(response.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load players',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.player_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || player.role === selectedRole;
    const matchesNationality = selectedNationality === 'all' || player.nationality === selectedNationality;
    return matchesSearch && matchesRole && matchesNationality;
  });

  const uniqueRoles = [...new Set(players.map(p => p.role))];
  const uniqueNationalities = [...new Set(players.map(p => p.nationality))];

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'batsman':
      case 'batsmen':
        return '🏏';
      case 'bowler':
        return '⚡';
      case 'all-rounder':
      case 'allrounder':
        return '🌟';
      case 'wicket-keeper':
      case 'wicketkeeper':
        return '🧤';
      default:
        return '👤';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'batsman':
      case 'batsmen':
        return 'bg-green-100 text-green-800';
      case 'bowler':
        return 'bg-blue-100 text-blue-800';
      case 'all-rounder':
      case 'allrounder':
        return 'bg-purple-100 text-purple-800';
      case 'wicket-keeper':
      case 'wicketkeeper':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="h-80 bg-white/60 dark:bg-slate-800/60 animate-pulse rounded-xl shadow-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900 p-4 md:p-6">
      <div className="max-w-8xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 md:space-y-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-xl">
              <Trophy className="h-8 w-8 md:h-10 md:w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 dark:from-blue-400 dark:via-cyan-400 dark:to-blue-300 bg-clip-text text-transparent">
              Player Database
            </h1>
          </div>
          <p className="text-lg md:text-xl text-gray-700 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Explore cricket's finest talents. Discover stats, specialties, and find your next team superstar.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-slate-100">{players.length}</p>
              <p className="text-xs md:text-sm text-gray-600 dark:text-slate-400 font-medium">Total Players</p>
            </CardContent>
          </Card>
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-slate-100">{players.filter(p => p.is_available).length}</p>
              <p className="text-xs md:text-sm text-gray-600 dark:text-slate-400 font-medium">Available</p>
            </CardContent>
          </Card>
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <MapPin className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-slate-100">{uniqueNationalities.length}</p>
              <p className="text-xs md:text-sm text-gray-600 dark:text-slate-400 font-medium">Countries</p>
            </CardContent>
          </Card>
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-slate-100">{uniqueRoles.length}</p>
              <p className="text-xs md:text-sm text-gray-600 dark:text-slate-400 font-medium">Roles</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-gray-800 dark:text-slate-100">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <Filter className="h-4 w-4 text-white" />
              </div>
              Filter Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
                <Input
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white dark:bg-slate-700/50 border-blue-200 dark:border-slate-600 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                />
              </div>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="bg-white dark:bg-slate-700/50 border-blue-200 dark:border-slate-600 text-gray-900 dark:text-slate-100 focus:border-blue-400 focus:ring-blue-400/20">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedNationality} onValueChange={setSelectedNationality}>
                <SelectTrigger className="bg-white dark:bg-slate-700/50 border-blue-200 dark:border-slate-600 text-gray-900 dark:text-slate-100 focus:border-blue-400 focus:ring-blue-400/20">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {uniqueNationalities.map(nationality => (
                    <SelectItem key={nationality} value={nationality}>{nationality}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Players Grid */}
        {filteredPlayers.length === 0 ? (
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-xl">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-semibold text-gray-700 dark:text-slate-200 mb-3">No players found</h3>
              <p className="text-gray-500 dark:text-slate-400 text-lg">Try adjusting your search or filter criteria</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
            {filteredPlayers.map((player) => (
              <Card 
                key={player.id} 
                className="bg-white/20 dark:bg-slate-800/30 backdrop-blur-md border-white/30 dark:border-slate-700/40 shadow-lg hover:bg-white/40 dark:hover:bg-slate-700/50 hover:border-white/50 dark:hover:border-slate-600/60 transition-all duration-300 transform hover:scale-105 group overflow-hidden cursor-pointer"
                onClick={() => player.is_available && navigate(`/players/${player.id}`)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 dark:from-slate-700/10 via-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardHeader className="pb-3 relative z-10">
                  <div className="flex items-start">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl md:text-3xl bg-white/30 dark:bg-slate-700/40 backdrop-blur-sm rounded-lg p-2 flex items-center justify-center shadow-md group-hover:bg-white/50 dark:group-hover:bg-slate-600/60">
                        {getRoleIcon(player.role)}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base md:text-lg font-bold text-gray-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors leading-tight">
                          {player.player_name}
                        </CardTitle>
                        <p className="text-xs md:text-sm text-gray-600 dark:text-slate-400 flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {player.nationality}
                        </p>
                      </div>
                    </div>
                    {/* Absolute badge to ensure consistent alignment */}
                    <div className="absolute top-3 right-3">
                      {player.is_available ? (
                        <Badge className="bg-green-200/80 text-green-900 hover:bg-green-300/80 text-xs font-medium backdrop-blur-sm">
                          Available
                        </Badge>
                      ) : (
                        // show small sold stamp
                        <div className="pointer-events-none">
                          {/* Use the Stamp component as a small overlay by duplicating its markup here for simplicity */}
                          <div className="text-xs bg-red-600 font-extrabold text-white px-3 py-1 rounded-lg shadow-2xl transform rotate-12 border-2 border-white/40">SOLD</div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <Badge className={`${getRoleBadgeColor(player.role)} font-medium text-xs backdrop-blur-sm`}>
                      {player.role}
                    </Badge>
                    <div className="flex items-center gap-1 text-gray-700 dark:text-slate-200 bg-white/30 dark:bg-slate-700/40 backdrop-blur-sm rounded-lg px-2 py-1 group-hover:bg-white/50 dark:group-hover:bg-slate-600/60 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                      <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="font-bold text-sm md:text-base">{formatCurrencyCrore(player.base_price)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 bg-white/20 dark:bg-slate-700/30 backdrop-blur-sm rounded-lg p-3 group-hover:bg-white/35 dark:group-hover:bg-slate-600/40">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-gray-700 dark:text-slate-300 font-medium">Base Price</span>
                      <span className="font-bold text-gray-800 dark:text-slate-100">{formatCurrencyCrore(player.base_price)}</span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-gray-700 dark:text-slate-300 font-medium">Status</span>
                      <span className={`font-bold ${player.is_available ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {player.is_available ? 'Available' : 'Sold'}
                      </span>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-white/30 dark:bg-slate-700/40 hover:bg-white/50 dark:hover:bg-slate-600/60 text-gray-800 dark:text-slate-100 hover:text-blue-700 dark:hover:text-blue-300 font-medium shadow-lg transform hover:scale-105 transition-all duration-200 backdrop-blur-sm border border-white/40 dark:border-slate-600/50 hover:border-white/60 dark:hover:border-slate-500/70"
                    onClick={() => navigate(`/players/${player.id}`)}
                    disabled={!player.is_available}
                  >
                    {player.is_available ? 'View Details' : 'Sold Out'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Results Count */}
        <div className="text-center">
          <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-0 dark:border-slate-700/50 shadow-lg inline-block">
            <CardContent className="p-4">
              <p className="text-gray-700 dark:text-slate-300 font-medium">
                Showing <span className="text-blue-600 dark:text-blue-400 font-bold">{filteredPlayers.length}</span> of <span className="text-indigo-600 dark:text-indigo-400 font-bold">{players.length}</span> players
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
