import { useState, useEffect } from 'react';
import useAnalyticsStore from '../store/analyticsStore';
import Navbar from '../components/Navbar';
import { 
  Play, Clock, Users, Activity, Calendar, 
  TrendingUp, BarChart2, PieChart as PieIcon, ShieldAlert
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { motion } from 'framer-motion';


const PIE_COLORS = ['#EF4444', '#38BDF8', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#64748B'];

const Analytics = () => {
  const { stats, summary, isLoading, fetchStats, fetchSummary } = useAnalyticsStore();
  const [timeframe, setTimeframe] = useState('daily'); 

  useEffect(() => {
    fetchStats();
    fetchSummary();
  }, [fetchStats, fetchSummary]);

  
  const chartData = stats[timeframe] || [];

  const handleTimeframeChange = (frame) => {
    setTimeframe(frame);
  };

  
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-xl shadow-xl text-xs font-semibold text-white">
          <p className="text-slate-400 font-normal mb-1">{payload[0].payload.label}</p>
          <p className="flex items-center gap-1.5 font-bold text-youtube-red">
            <Clock size={11} fill="currentColor" />
            {payload[0].value} hours
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-youtube-red"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col relative overflow-hidden">
      {}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-youtube-red/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 relative z-10 flex flex-col gap-6">
        
        {/* Title */}
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2 tracking-tight">
            <BarChart2 className="text-youtube-red" />
            Playback & Watch Analytics
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Track your viewing hours, category preferences, and watch-together metrics inside Watch-2-Gether.
          </p>
        </div>

        {/* Overview Stats Grid */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            <div className="glass-panel p-4.5 rounded-2xl border border-slate-800/80 hover:border-slate-750 transition duration-200">
              <div className="text-youtube-red bg-youtube-red/10 p-2.5 rounded-xl w-fit mb-3">
                <Play size={16} fill="currentColor" />
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Videos Watched</p>
              <h3 className="text-lg font-extrabold text-white mt-1 leading-none">{summary.totalVideosWatched || 0}</h3>
            </div>

            <div className="glass-panel p-4.5 rounded-2xl border border-slate-800/80 hover:border-slate-750 transition duration-200">
              <div className="text-sky-400 bg-sky-500/10 p-2.5 rounded-xl w-fit mb-3">
                <Clock size={16} />
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Watch Time</p>
              <h3 className="text-lg font-extrabold text-white mt-1 leading-none">{summary.totalWatchTime || 0}h</h3>
            </div>

            <div className="glass-panel p-4.5 rounded-2xl border border-slate-800/80 hover:border-slate-750 transition duration-200">
              <div className="text-purple-400 bg-purple-500/10 p-2.5 rounded-xl w-fit mb-3">
                <Users size={16} />
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Time Together</p>
              <h3 className="text-lg font-extrabold text-white mt-1 leading-none">{summary.sharedWatchTime || 0}h</h3>
            </div>

            <div className="glass-panel p-4.5 rounded-2xl border border-slate-800/80 hover:border-slate-750 transition duration-200">
              <div className="text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl w-fit mb-3">
                <Activity size={16} />
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avg Session</p>
              <h3 className="text-lg font-extrabold text-white mt-1 leading-none">{summary.averageSessionLength || 0}m</h3>
            </div>

            <div className="glass-panel p-4.5 rounded-2xl border border-slate-800/80 hover:border-slate-750 transition duration-200">
              <div className="text-amber-400 bg-amber-500/10 p-2.5 rounded-xl w-fit mb-3">
                <Calendar size={16} />
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Most Active Day</p>
              <h3 className="text-lg font-extrabold text-white mt-1 leading-none truncate">{summary.mostActiveDay || 'N/A'}</h3>
            </div>

            <div className="glass-panel p-4.5 rounded-2xl border border-slate-800/80 hover:border-slate-750 transition duration-200">
              <div className="text-pink-400 bg-pink-500/10 p-2.5 rounded-xl w-fit mb-3">
                <TrendingUp size={16} />
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Month</p>
              <h3 className="text-lg font-extrabold text-white mt-1 leading-none truncate">{summary.mostActiveMonth || 'N/A'}</h3>
            </div>

          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Area Chart (8 columns on lg) */}
          <div className="lg:col-span-8 glass-panel p-6 rounded-3xl border border-slate-800 hover:border-slate-750 transition duration-300 flex flex-col h-[300px] sm:h-[350px] md:h-[400px] min-w-0">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock size={16} className="text-youtube-red" />
                Viewing History (Hours)
              </h2>
              
              {/* Toggles */}
              <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 text-[10px] font-bold">
                <button
                  onClick={() => handleTimeframeChange('daily')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    timeframe === 'daily' 
                      ? 'bg-slate-800 text-white' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => handleTimeframeChange('weekly')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    timeframe === 'weekly' 
                      ? 'bg-slate-800 text-white' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => handleTimeframeChange('monthly')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    timeframe === 'monthly' 
                      ? 'bg-slate-800 text-white' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* Recharts Area Container */}
            <div className="flex-1 w-full text-xs min-h-[260px] min-w-0">
              {chartData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
                  <ShieldAlert size={28} className="text-slate-700 mb-2" />
                  No watch history available for the selected timeframe.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="label" 
                      stroke="#475569" 
                      fontSize={10}
                      tickLine={false} 
                      axisLine={false} 
                      dy={10}
                    />
                    <YAxis 
                      stroke="#475569" 
                      fontSize={10}
                      tickLine={false} 
                      axisLine={false}
                      dx={-5}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="hours" 
                      stroke="url(#colorHours)" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#colorHours)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Pie Chart (4 columns on lg) */}
          <div className="lg:col-span-4 glass-panel p-6 rounded-3xl border border-slate-800 hover:border-slate-750 transition duration-300 flex flex-col h-[300px] sm:h-[350px] md:h-[400px] min-w-0">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <PieIcon size={16} className="text-sky-400" />
              Category Breakdown
            </h2>

            {/* Recharts Pie Container */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 text-[10px] min-h-[220px] min-w-0 w-full">
              {stats.categories && stats.categories.length > 0 && stats.categories.some(c => c.value > 0) ? (
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1 relative w-full min-h-[160px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <PieChart>
                        <Pie
                          data={stats.categories}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {stats.categories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`${value} hours`, 'Watched']}
                          contentStyle={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', color: '#fff', fontSize: '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend list below */}
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-[100px] overflow-y-auto px-2">
                    {stats.categories.map((cat, index) => (
                      <div key={cat.name} className="flex items-center gap-1.5 truncate">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        ></span>
                        <span className="text-slate-300 truncate font-medium">{cat.name}</span>
                        <span className="text-slate-500 font-bold ml-auto">{cat.value}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-center flex flex-col items-center">
                  <ShieldAlert size={28} className="text-slate-700 mb-2" />
                  No viewing logs to partition categories. Play videos to track category share!
                </div>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};

export default Analytics;
