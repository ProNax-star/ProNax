/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { supabase } from "@/integrations/supabase/loose";

export interface ChartDataPoint {
  date: string;
  views: number;
  watchTime: number;
  subscribers: number;
  revenue: number;
}

export interface TrafficSource {
  name: string;
  percentage: number;
  views: number;
}

export interface GeographyData {
  country: string;
  countryCode: string;
  percentage: number;
}

export interface AnalyticsData {
  chartData: ChartDataPoint[];
  trafficSources: TrafficSource[];
  geographies: GeographyData[];
  realTimeViews: {
    last48Hours: number;
    last60Minutes: number;
  };
}

/**
 * Fetch analytics chart data for a given date range
 */
export async function fetchAnalyticsChartData(
  userId: string,
  days: number = 28
): Promise<ChartDataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateIso = startDate.toISOString();

  try {
    // Fetch daily aggregated views from analytics_events or videos
    const { data: videos, error } = await supabase
      .from("videos")
      .select("created_at, views_count")
      .eq("owner_id", userId)
      .gte("created_at", startDateIso)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Group by date and aggregate metrics
    const dailyData: Record<string, ChartDataPoint> = {};

    (videos || []).forEach((video) => {
      const date = new Date(video.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          views: 0,
          watchTime: 0,
          subscribers: 0,
          revenue: 0,
        };
      }
      
      dailyData[date].views += video.views_count || 0;
      // Estimate watch time (assuming 5 min avg view duration)
      dailyData[date].watchTime += (video.views_count || 0) * 5 / 60;
    });

    // Fill in missing dates with zeros
    const result: ChartDataPoint[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= new Date()) {
      const dateStr = currentDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      
      if (dailyData[dateStr]) {
        result.push(dailyData[dateStr]);
      } else {
        result.push({
          date: dateStr,
          views: 0,
          watchTime: 0,
          subscribers: 0,
          revenue: 0,
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Fetch subscriber growth data
    const { data: follows } = await supabase
      .from("follows")
      .select("created_at")
      .eq("following_id", userId)
      .gte("created_at", startDateIso)
      .order("created_at", { ascending: true });

    (follows || []).forEach((follow) => {
      const date = new Date(follow.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const entry = result.find((r) => r.date === date);
      if (entry) {
        entry.subscribers += 1;
      }
    });

    // Fetch revenue data
    const { data: revenue } = await supabase
      .from("revenue_logs")
      .select("created_at, amount_earned")
      .eq("user_id", userId)
      .gte("created_at", startDateIso)
      .order("created_at", { ascending: true });

    (revenue || []).forEach((rev) => {
      const date = new Date(rev.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const entry = result.find((r) => r.date === date);
      if (entry) {
        entry.revenue += rev.amount_earned || 0;
      }
    });

    return result;
  } catch (error) {
    console.error("[analyticsApi] Failed to fetch chart data:", error);
    return [];
  }
}

/**
 * Fetch traffic sources data
 */
export async function fetchTrafficSources(
  userId: string
): Promise<TrafficSource[]> {
  try {
    const { data, error } = await (supabase.rpc as any)('get_traffic_sources_analytics', { p_user_id: userId });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return [];
    }
    
    return data.map((source: any) => ({
      name: source.source,
      percentage: source.percentage,
      views: source.views,
    }));
  } catch (error) {
    console.error("[analyticsApi] Failed to fetch traffic sources:", error);
    return [];
  }
}

/**
 * Fetch geography data
 */
export async function fetchGeographies(
  userId: string
): Promise<GeographyData[]> {
  try {
    const { data, error } = await (supabase.rpc as any)('get_geography_analytics', { p_user_id: userId });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return [];
    }
    
    return data.map((geo: any) => ({
      country: geo.country_name,
      countryCode: geo.country_code,
      percentage: geo.percentage,
    }));
  } catch (error) {
    console.error("[analyticsApi] Failed to fetch geographies:", error);
    return [];
  }
}

/**
 * Fetch real-time view data
 */
export async function fetchRealTimeViews(
  userId: string
): Promise<{ last48Hours: number; last60Minutes: number }> {
  try {
    const { data, error } = await (supabase.rpc as any)('get_realtime_views', { p_user_id: userId });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return { last48Hours: 0, last60Minutes: 0 };
    }
    
    const result = data[0] as any;
    return {
      last48Hours: result.last_48_hours || 0,
      last60Minutes: result.last_60_minutes || 0,
    };
  } catch (error) {
    console.error("[analyticsApi] Failed to fetch real-time views:", error);
    return { last48Hours: 0, last60Minutes: 0 };
  }
}

/**
 * Fetch minute-by-minute views for real-time chart
 */
export async function fetchMinuteViews(
  userId: string,
  minutes: number = 60
): Promise<{ min: string; views: number }[]> {
  try {
    const { data, error } = await (supabase.rpc as any)('get_minute_views', { 
      p_user_id: userId, 
      p_minutes: minutes 
    });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return [];
    }
    
    return data.map((minute: any) => ({
      min: minute.minute_label,
      views: minute.views || 0,
    }));
  } catch (error) {
    console.error("[analyticsApi] Failed to fetch minute views:", error);
    return [];
  }
}

/**
 * Fetch all analytics data
 */
export async function fetchAnalyticsData(
  userId: string,
  days: number = 28
): Promise<AnalyticsData> {
  const [chartData, trafficSources, geographies, realTimeViews] =
    await Promise.all([
      fetchAnalyticsChartData(userId, days),
      fetchTrafficSources(userId),
      fetchGeographies(userId),
      fetchRealTimeViews(userId),
    ]);

  return {
    chartData,
    trafficSources,
    geographies,
    realTimeViews,
  };
}
