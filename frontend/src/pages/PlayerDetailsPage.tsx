import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Trophy, Star, Shield, Activity, 
  TrendingUp, MapPin, User, Calendar, Award, 
  Zap, Target, Flag, BarChart3, Clock
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrencyCrore } from '@/lib/formatCurrency';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Stamp from '@/components/Stamp';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface Player {
  id: number;
  player_name: string;
  role: string;
  nationality: string;
  base_price: number;
  is_available: boolean;
  // Extended fields that might be available in a detailed view
  age?: number;
  matches_played?: number;
  batting_average?: number;
  bowling_average?: number;
  strike_rate?: number;
  economy_rate?: number;
  highest_score?: number;   
  best_bowling?: string;
  image_url?: string;
  runs_scored?: number;
  wickets_taken?: number;
  runs_conceded?: number;
  points_earned?: number;
}

// Helper function to get deterministic values based on player ID
const getSeededValue = (playerId: number, min: number, max: number, offset: number = 0): number => {
  const seedValue = (playerId * 137) % 100; // Use prime number for better distribution
  const seed = (seedValue + offset) % 100;
  return min + (seed / 100) * (max - min);
};
// Generate realistic stats based on the player's role
const generatePlayerStats = (player: Player) => {
  const role = player.role.toLowerCase();
  const isBatsman = role.includes('batsman');
  const isBowler = role.includes('bowler');
  const isAllRounder = role.includes('all-rounder');
  const isWicketkeeper = role.includes('wicket');
  
  // We'll use the player id to seed our calculations so the same player always gets the same stats
  const playerId = player.id;
  
  const stats = {
    age: Math.floor(getSeededValue(20, 36, 1)), // 20-35 years
    matches_played: Math.floor(getSeededValue(10, 161, 2)), // 10-160 matches
    batting_average: 0,
    strike_rate: 0,
    bowling_average: 0,
    economy_rate: 0,
    highest_score: 0,
    best_bowling: '',
  };
  
  // Batting stats - based on seeded values for consistent player stats
  if (isBatsman || isAllRounder || isWicketkeeper) {
    stats.batting_average = +(getSeededValue(player.id, 15, 50, 3)).toFixed(2); // 15-50
    stats.strike_rate = +(getSeededValue(player.id, 100, 150, 4)).toFixed(2); // 100-150
    stats.highest_score = Math.floor(getSeededValue(player.id, 50, 201, 5)); // 50-200
  } else {
    // Bowlers have lower batting stats
    stats.batting_average = +(getSeededValue(player.id, 5, 20, 3)).toFixed(2); // 5-20
    stats.strike_rate = +(getSeededValue(player.id, 70, 110, 4)).toFixed(2); // 70-110
    stats.highest_score = Math.floor(getSeededValue(player.id, 10, 61, 5)); // 10-60
  }
  
  // Bowling stats - based on seeded values for consistent player stats
  if (isBowler || isAllRounder) {
    stats.bowling_average = +(getSeededValue(player.id, 15, 35, 6)).toFixed(2); // 15-35
    stats.economy_rate = +(getSeededValue(player.id, 5, 9, 7)).toFixed(2); // 5-9
    
    const wickets = Math.floor(getSeededValue(player.id, 1, 7, 8)); // 1-6 wickets
    const runs = Math.floor(getSeededValue(player.id, 10, 41, 9)); // 10-40 runs
    stats.best_bowling = `${wickets}/${runs}`;
  } else {
    // Non-bowlers might have occasional bowling stats
    stats.bowling_average = +(getSeededValue(player.id, 30, 50, 6)).toFixed(2); // 30-50
    stats.economy_rate = +(getSeededValue(player.id, 7, 10, 7)).toFixed(2); // 7-10
    
    const wickets = Math.floor(getSeededValue(player.id, 1, 4, 8)); // 1-3 wickets
    const runs = Math.floor(getSeededValue(player.id, 20, 61, 9)); // 20-60 runs
    stats.best_bowling = `${wickets}/${runs}`;
  }
  
  return stats;
};

// Calculate Overall Rating (OVR) based on player stats and role
const calculateOverallRating = (player: Player, playerStats: any): number => {
  // If playerStats is null, return a default value
  if (!playerStats) {
    return 70; // Default rating if no stats available
  }
  
  const role = player.role.toLowerCase();
  const isBatsman = role.includes('batsman');
  const isBowler = role.includes('bowler');
  const isAllRounder = role.includes('all-rounder');
  const isWicketkeeper = role.includes('wicket');
  
  // Base value from price (higher price generally means better player)
  let baseValue = player.base_price / 10 * 70; // Gives 0-70 points based on price
  
  // Points from stats based on role
  let statsPoints = 0;
  
  if (isBatsman || isWicketkeeper) {
    // Batsmen and WKs get more points from batting stats
    const battingAvg = playerStats.batting_average || 0;
    const strikeRate = playerStats.strike_rate || 100;
    statsPoints += (battingAvg / 50) * 20; // 0-20 points
    statsPoints += ((strikeRate - 100) / 50) * 10; // 0-10 points
  } else if (isBowler) {
    // Bowlers get more points from bowling stats
    const bowlingAvg = playerStats.bowling_average || 30;
    const economyRate = playerStats.economy_rate || 9;
    statsPoints += ((30 - bowlingAvg) / 15) * 20; // 0-20 points
    statsPoints += ((9 - economyRate) / 4) * 10; // 0-10 points
  } else if (isAllRounder) {
    // All-rounders get balanced points
    const battingAvg = playerStats.batting_average || 0;
    const strikeRate = playerStats.strike_rate || 100;
    const bowlingAvg = playerStats.bowling_average || 30;
    const economyRate = playerStats.economy_rate || 9;
    statsPoints += (battingAvg / 50) * 10; // 0-10 points
    statsPoints += ((strikeRate - 100) / 50) * 5; // 0-5 points
    statsPoints += ((30 - bowlingAvg) / 15) * 10; // 0-10 points
    statsPoints += ((9 - economyRate) / 4) * 5; // 0-5 points
  }
  
  // Add experience points based on matches played
  const matchesPlayed = playerStats.matches_played || 0;
  const experiencePoints = Math.min((matchesPlayed / 100) * 10, 10); // 0-10 points
  
  // Calculate total (max 100)
  let total = baseValue + statsPoints + experiencePoints;
  total = Math.min(Math.max(total, 60), 99); // Keep between 60-99
  
  return Math.round(total);
};

// Player attributes based on role
const getPlayerAttributes = (player: Player, playerStats: any) => {
  const role = player.role.toLowerCase();
  const playerId = player.id;
  const attributes = [];
  
  // Use deterministic values based on player ID
  const getAttributeValue = (min: number, max: number, offset: number = 0): number => {
    return Math.floor(getSeededValue(playerId, min, max, offset));
  };
  
  // Make sure playerStats is not null before calculating OVR
  const statsToUse = playerStats || generatePlayerStats(player);
  
  // Calculate OVR rating
  const overallRating = calculateOverallRating(player, statsToUse);
  
  // Common attributes
  attributes.push({
    name: 'Experience',
    value: getAttributeValue(60, 95, 10), // 60-95%
    icon: <Calendar className="h-4 w-4" />
  });
  
  if (role.includes('batsman')) {
    attributes.push(
      {
        name: 'Technique',
        value: getAttributeValue(80, 100, 20), // 80-100%
        icon: <Target className="h-4 w-4" />
      },
      {
        name: 'Power Hitting',
        value: getAttributeValue(70, 100, 30), // 70-100%
        icon: <Zap className="h-4 w-4" />
      }
    );
  }
  
  if (role.includes('bowler')) {
    attributes.push(
      {
        name: 'Accuracy',
        value: getAttributeValue(80, 100, 40), // 80-100%
        icon: <Target className="h-4 w-4" />
      },
      {
        name: 'Variation',
        value: getAttributeValue(75, 100, 50), // 75-100%
        icon: <Activity className="h-4 w-4" />
      }
    );
  }
  
  if (role.includes('all-rounder')) {
    attributes.push(
      {
        name: 'Batting',
        value: getAttributeValue(75, 95, 60), // 75-95%
        icon: <BarChart3 className="h-4 w-4" />
      },
      {
        name: 'Bowling',
        value: getAttributeValue(75, 95, 70), // 75-95%
        icon: <BarChart3 className="h-4 w-4" />
      }
    );
  }
  
  if (role.includes('wicket')) {
    attributes.push(
      {
        name: 'Reflexes',
        value: getAttributeValue(85, 100, 80), // 85-100%
        icon: <Zap className="h-4 w-4" />
      },
      {
        name: 'Agility',
        value: getAttributeValue(80, 100, 90), // 80-100%
        icon: <Activity className="h-4 w-4" />
      }
    );
  }
  
  // Add one deterministic attribute for all players
  const randomAttrs = [
    {
      name: 'Leadership',
      value: getAttributeValue(50, 100, 100), // 50-100%
      icon: <Flag className="h-4 w-4" />
    },
    {
      name: 'Consistency',
      value: getAttributeValue(60, 100, 110), // 60-100%
      icon: <Activity className="h-4 w-4" />
    },
    {
      name: 'Form',
      value: getAttributeValue(40, 100, 120), // 40-100%
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      name: 'Fitness',
      value: getAttributeValue(70, 100, 130), // 70-100%
      icon: <Activity className="h-4 w-4" />
    }
  ];
  
  // Pick attribute based on player ID to ensure consistency
  const attrIndex = player.id % randomAttrs.length;
  attributes.push(randomAttrs[attrIndex]);
  return attributes;
};

export default function PlayerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [playerAttributes, setPlayerAttributes] = useState<any[]>([]);
  const currentUser = useAuthStore(state => state.user);

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        setLoading(true);
        // Call the API to get player details
        const response = await api.get(`/players/${id}`);
        
        console.log('Player API response:', response.data);
        
  // Handle the response format from FastAPI backend
  const responseData = response.data;

  // Backend may return { success: true, player: { ... } } or the player object directly.
  const playerData = responseData?.player ?? responseData;

  if (playerData) {
          // Transform the data structure if needed - handle FastAPI response format
          const playerInfo = {
            id: playerData.id,
            player_name: playerData.name || playerData.player_name || 'Unknown Player', // Handle both name formats
            role: playerData.role || 'All-Rounder',
            nationality: playerData.nationality || 'International',
            base_price: playerData.base_price || 5.0,
            is_available: playerData.is_available !== undefined ? playerData.is_available : true,
            runs_scored: playerData.runs_scored,
            wickets_taken: playerData.wickets_taken,
            runs_conceded: playerData.runs_conceded,
            points_earned: playerData.points_earned,
            stats: playerData.stats
          };
          
          setPlayer(playerInfo);
          
          // Use API data if available, otherwise generate mock stats
          let playerStats;
          
          try {
            if (playerData.runs_scored || playerData.wickets_taken) {
              // Use real stats from API
              playerStats = {
                age: Math.floor(getSeededValue(playerData.id, 20, 36, 1)), // Age not in API, calculate it deterministically
                matches_played: Math.floor(getSeededValue(playerData.id, 10, 161, 2)), // Matches not in API, calculate it deterministically
                batting_average: playerData.runs_scored ? +(playerData.runs_scored / Math.max(1, playerData.matches_played || 20)).toFixed(2) : 0,
                strike_rate: playerData.strike_rate || 0,
                bowling_average: playerData.wickets_taken ? +(playerData.runs_conceded / Math.max(1, playerData.wickets_taken)).toFixed(2) : 0,
                economy_rate: playerData.economy_rate || 0,
                highest_score: playerData.highest_score || Math.floor(getSeededValue(playerData.id, 20, 101, 5)),
                best_bowling: playerData.best_bowling || `${Math.floor(getSeededValue(playerData.id, 1, 6, 8))}/${Math.floor(getSeededValue(playerData.id, 10, 41, 9))}`,
              };
            } else {
              // Generate deterministic stats
              playerStats = generatePlayerStats(playerData);
            }
          } catch (error) {
            console.error('Error processing player stats:', error);
            // Fallback to generated stats if there's any error
            playerStats = generatePlayerStats(playerData);
          }
          setPlayerStats(playerStats);
          
          // Generate attributes using the calculated or real stats
          const attributes = getPlayerAttributes(playerData, playerStats);
          setPlayerAttributes(attributes);
        } else {
          toast({
            title: 'Error',
            description: 'Could not retrieve player data',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('Error fetching player details:', error);
        toast({
          title: 'Error',
          description: 'Failed to load player details. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPlayer();
    }
  }, [id, toast]);

  function getRoleColor(role: string) {
    role = role.toLowerCase();
    if (role.includes('batsman')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
    if (role.includes('bowler')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
    if (role.includes('wicket')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    }
    if (role.includes('all-rounder')) {
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }

  // Loading skeleton UI
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center">
          <Skeleton className="h-10 w-10 rounded-full mr-3" />
          <Skeleton className="h-8 w-40" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 relative">
            <Card className="h-[500px]">
              <CardHeader>
                {/* Show small stamp on details card when player is sold */}
                {player && !player.is_available && (
                  <div className="absolute z-40 top-4 right-4">
                    {/* If backend provides acquired_by field we can compare to show 'SOLD TO YOU' */}
                    {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                    {/* @ts-ignore */}
                    <Stamp variant={(player as any).acquired_by === currentUser?.id ? 'sold-to-you' : 'sold'} />
                  </div>
                )}
                <Skeleton className="h-8 w-40 mb-2" />
                <Skeleton className="h-6 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full mb-6" />
                <Skeleton className="h-6 w-full mb-3" />
                <Skeleton className="h-6 w-full mb-3" />
                <Skeleton className="h-6 w-full" />
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-full mb-4" />
                <Skeleton className="h-8 w-full mb-4" />
                <Skeleton className="h-8 w-full mb-4" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-2xl font-bold mb-2">Player Not Found</h2>
            <p className="text-gray-500 dark:text-slate-400 mb-6">
              The player you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link to="/players">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Players
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back navigation */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent">
          <Link to="/players" className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Players
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player Profile Card */}
        <div className="lg:col-span-1">
          <Card className="group overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white/90 to-blue-50/90 dark:from-slate-800/90 dark:to-slate-900/90 backdrop-blur-sm transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/10 opacity-70"></div>
            
            <CardHeader className="relative z-10 pb-2">
              <div className="flex items-center justify-between mb-2">
                <Badge className={`${getRoleColor(player.role)} uppercase text-xs font-semibold py-1`}>
                  {player.role}
                </Badge>
                <Badge className={player.is_available ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}>
                  {player.is_available ? 'Available' : 'Sold'}
                </Badge>
              </div>
              
              <div className="mb-4">
                <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg mb-2 transition-transform duration-300 group-hover:scale-105">
                  <User className="h-12 w-12 text-white" />
                </div>
              </div>
              
              <CardTitle className="text-center text-2xl font-bold text-gray-800 dark:text-slate-100">
                {player.player_name}
              </CardTitle>
              
              <div className="flex items-center justify-center mt-1 text-gray-600 dark:text-slate-400">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{player.nationality}</span>
              </div>
            </CardHeader>
            
            <CardContent className="relative z-10 pt-4">
              <Separator className="my-4 bg-gradient-to-r from-transparent via-gray-200 dark:via-slate-700 to-transparent" />
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-slate-400 font-medium flex items-center">
                    <Award className="h-4 w-4 mr-2 text-amber-500" />
                    Base Price
                  </span>
                  <span className="font-bold text-gray-800 dark:text-slate-200">{formatCurrencyCrore(player.base_price)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-slate-400 font-medium flex items-center">
                    <Trophy className="h-4 w-4 mr-2 text-blue-500" />
                    Matches
                  </span>
                  <span className="font-bold text-gray-800 dark:text-slate-200">{playerStats?.matches_played || 'N/A'}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-slate-400 font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-green-500" />
                    Age
                  </span>
                  <span className="font-bold text-gray-800 dark:text-slate-200">{playerStats?.age || 'N/A'} years</span>
                </div>
              </div>
              
              <Separator className="my-4 bg-gradient-to-r from-transparent via-gray-200 dark:via-slate-700 to-transparent" />
              
              {/* Player Rating */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600 dark:text-slate-400 font-medium flex items-center">
                    <Star className="h-4 w-4 mr-2 text-amber-500" />
                    Overall Rating (OVR)
                  </span>
                  <div className="flex items-center">
                    <div className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white text-base sm:text-sm font-bold shadow-md transition-transform duration-200 transform group-hover:scale-105">
                      {calculateOverallRating(player, playerStats) || 75}
                    </div>
                  </div>
                </div>
              </div>
              
              {player.is_available && (
                <Button className="w-full mt-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white">
                  Add to Watchlist
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Stats and Attributes */}
        <div className="lg:col-span-2">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-white/90 to-blue-50/90 dark:from-slate-800/90 dark:to-slate-900/90 backdrop-blur-sm transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5 text-blue-500" />
                  Batting Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-slate-400">Average</span>
                    <span className="font-semibold">{playerStats?.batting_average || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-slate-400">Strike Rate</span>
                    <span className="font-semibold">{playerStats?.strike_rate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-slate-400">Highest Score</span>
                    <span className="font-semibold">{playerStats?.highest_score || 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-white/90 to-green-50/90 dark:from-slate-800/90 dark:to-slate-900/90 backdrop-blur-sm transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center">
                  <Activity className="mr-2 h-5 w-5 text-green-500" />
                  Bowling Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-slate-400">Average</span>
                    <span className="font-semibold">{playerStats?.bowling_average || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-slate-400">Economy Rate</span>
                    <span className="font-semibold">{playerStats?.economy_rate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-slate-400">Best Bowling</span>
                    <span className="font-semibold">{playerStats?.best_bowling || 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Player Attributes */}
          <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-white/90 to-indigo-50/90 dark:from-slate-800/90 dark:to-indigo-900/90 backdrop-blur-sm transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center">
                <Shield className="mr-2 h-5 w-5 text-indigo-500" />
                Player Attributes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {playerAttributes.map((attr, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-gray-700 dark:text-slate-300">
                        {attr.icon}
                        <span className="ml-2 font-medium">{attr.name}</span>
                      </div>
                      <span className="text-sm font-semibold">{attr.value}%</span>
                    </div>
                    <Progress value={attr.value} className="h-2" 
                      style={{
                        background: 'rgba(209, 213, 219, 0.2)',
                        '--progress-background': `linear-gradient(to right, ${
                          attr.value > 85 ? '#10B981' : 
                          attr.value > 70 ? '#3B82F6' : 
                          attr.value > 50 ? '#F59E0B' : '#EF4444'
                        }, ${
                          attr.value > 85 ? '#059669' : 
                          attr.value > 70 ? '#2563EB' : 
                          attr.value > 50 ? '#D97706' : '#DC2626'
                        })`
                      } as React.CSSProperties}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Recent Performance */}
          <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-white/90 to-purple-50/90 dark:from-slate-800/90 dark:to-purple-900/90 backdrop-blur-sm mt-6 transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-purple-500" />
                Recent Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-4">
                <div className="text-center text-gray-500 dark:text-slate-400 italic">
                  <Clock className="h-5 w-5 mx-auto mb-2" />
                  <p>Performance data will be updated soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
