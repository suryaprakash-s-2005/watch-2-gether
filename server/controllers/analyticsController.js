import User from '../models/User.js';
import UserAnalytics from '../models/UserAnalytics.js';
import WatchSession from '../models/WatchSession.js';


const formatDate = (date) => date.toISOString().split('T')[0];


const getDayName = (dateStr) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const d = new Date(dateStr);
  return days[d.getDay()];
};


const getMonthName = (dateStr) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const d = new Date(dateStr);
  return months[d.getMonth()];
};




export const getWatchStats = async (req, res) => {
  const userId = req.user._id;

  try {
    let analytics = await UserAnalytics.findOne({ userId });
    if (!analytics) {
      analytics = await UserAnalytics.create({ userId, dailyWatchData: [] });
    }

    const dailyMap = new Map();
    analytics.dailyWatchData.forEach(d => {
      dailyMap.set(d.date, d.minutes);
    });

    
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const minutes = dailyMap.get(dateStr) || 0;
      
      
      const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      dailyData.push({
        label,
        hours: Math.round((minutes / 60) * 10) / 10
      });
    }

    
    const weeklyData = [];
    for (let i = 3; i >= 0; i--) {
      let weekMinutes = 0;
      const startDay = new Date();
      startDay.setDate(startDay.getDate() - (i * 7 + 6));
      
      const endDay = new Date();
      endDay.setDate(endDay.getDate() - (i * 7));

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const checkDay = new Date(startDay);
        checkDay.setDate(checkDay.getDate() + dayOffset);
        weekMinutes += dailyMap.get(formatDate(checkDay)) || 0;
      }

      const label = `Wk -${i}`;
      weeklyData.push({
        label: i === 0 ? 'This Week' : label,
        hours: Math.round((weekMinutes / 60) * 10) / 10
      });
    }

    
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const yearMonth = d.toISOString().substring(0, 7); 
      
      let monthMinutes = 0;
      analytics.dailyWatchData.forEach(item => {
        if (item.date.startsWith(yearMonth)) {
          monthMinutes += item.minutes;
        }
      });

      const label = d.toLocaleDateString('en-US', { month: 'short' });
      monthlyData.push({
        label,
        hours: Math.round((monthMinutes / 60) * 10) / 10
      });
    }

    
    const categoryData = [];
    if (analytics.categoryWatchMinutes) {
      analytics.categoryWatchMinutes.forEach((minutes, category) => {
        categoryData.push({
          name: category,
          value: Math.round((minutes / 60) * 10) / 10 
        });
      });
    }

    
    if (categoryData.length === 0) {
      categoryData.push(
        { name: 'Entertainment', value: 0 },
        { name: 'Music', value: 0 },
        { name: 'Gaming', value: 0 }
      );
    } else {
      categoryData.sort((a, b) => b.value - a.value);
    }

    res.status(200).json({
      daily: dailyData,
      weekly: weeklyData,
      monthly: monthlyData,
      categories: categoryData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




export const getWatchTogetherAnalytics = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let analytics = await UserAnalytics.findOne({ userId });
    
    
    const sessions = await WatchSession.find({ participants: userId });
    
    const totalVideos = sessions.length;
    const totalWatchHours = Math.round((user.totalWatchMinutes / 60) * 10) / 10;
    const sharedWatchHours = Math.round((user.sharedWatchMinutes / 60) * 10) / 10;

    
    let avgSession = 0;
    if (totalVideos > 0) {
      const sumDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
      avgSession = Math.round(sumDuration / totalVideos);
    }

    // Calculate Most Active Day and Month
    let mostActiveDay = 'N/A';
    let mostActiveMonth = 'N/A';

    if (analytics && analytics.dailyWatchData.length > 0) {
      const dayActivity = {}; // "Monday" -> totalMinutes
      const monthActivity = {}; // "June" -> totalMinutes

      analytics.dailyWatchData.forEach(d => {
        const day = getDayName(d.date);
        const month = getMonthName(d.date);

        dayActivity[day] = (dayActivity[day] || 0) + d.minutes;
        monthActivity[month] = (monthActivity[month] || 0) + d.minutes;
      });

      // Find max in dayActivity
      let maxDayVal = -1;
      Object.keys(dayActivity).forEach(day => {
        if (dayActivity[day] > maxDayVal) {
          maxDayVal = dayActivity[day];
          mostActiveDay = day;
        }
      });

      // Find max in monthActivity
      let maxMonthVal = -1;
      Object.keys(monthActivity).forEach(month => {
        if (monthActivity[month] > maxMonthVal) {
          maxMonthVal = monthActivity[month];
          mostActiveMonth = month;
        }
      });
    }

    // Favorite YouTube categories list
    const favCategories = [];
    if (analytics && analytics.categoryWatchMinutes) {
      const sorted = [];
      analytics.categoryWatchMinutes.forEach((minutes, category) => {
        sorted.push({ category, minutes });
      });
      sorted.sort((a, b) => b.minutes - a.minutes);
      sorted.slice(0, 3).forEach(item => favCategories.push(item.category));
    }

    if (favCategories.length === 0) {
      favCategories.push('Entertainment');
    }

    res.status(200).json({
      totalVideosWatched: totalVideos,
      totalWatchTime: totalWatchHours,
      sharedWatchTime: sharedWatchHours,
      averageSessionLength: avgSession, // in minutes
      mostActiveDay,
      mostActiveMonth,
      favoriteYouTubeCategories: favCategories
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
