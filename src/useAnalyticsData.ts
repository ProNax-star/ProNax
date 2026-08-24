/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useState, useEffect, useCallback } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  fetchAnalyticsData,
  type AnalyticsData,
  type ChartDataPoint,
  type TrafficSource,
  type GeographyData,
} from "./analyticsApi";

export function useAnalyticsData(days: number = 28) {
  const { user } = useAuthSession();
  const userId = user?.id;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const analyticsData = await fetchAnalyticsData(userId, days);
      setData(analyticsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch analytics data";
      setError(message);
      console.error("[useAnalyticsData] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}

export function useAnalyticsChartData(days: number = 28) {
  const { user } = useAuthSession();
  const userId = user?.id;

  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { fetchAnalyticsChartData } = await import("./analyticsApi");
      const chartData = await fetchAnalyticsChartData(userId, days);
      setData(chartData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch chart data";
      setError(message);
      console.error("[useAnalyticsChartData] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}

export function useTrafficSources() {
  const { user } = useAuthSession();
  const userId = user?.id;

  const [data, setData] = useState<TrafficSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { fetchTrafficSources } = await import("./analyticsApi");
      const trafficData = await fetchTrafficSources(userId);
      setData(trafficData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch traffic sources";
      setError(message);
      console.error("[useTrafficSources] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}

export function useGeographies() {
  const { user } = useAuthSession();
  const userId = user?.id;

  const [data, setData] = useState<GeographyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { fetchGeographies } = await import("./analyticsApi");
      const geoData = await fetchGeographies(userId);
      setData(geoData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch geographies";
      setError(message);
      console.error("[useGeographies] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}

export function useRealTimeViews() {
  const { user } = useAuthSession();
  const userId = user?.id;

  const [data, setData] = useState<{ last48Hours: number; last60Minutes: number }>({
    last48Hours: 0,
    last60Minutes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { fetchRealTimeViews } = await import("./analyticsApi");
      const realTimeData = await fetchRealTimeViews(userId);
      setData(realTimeData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch real-time views";
      setError(message);
      console.error("[useRealTimeViews] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds for real-time data
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}

export function useMinuteViews(minutes: number = 60) {
  const { user } = useAuthSession();
  const userId = user?.id;

  const [data, setData] = useState<{ min: string; views: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { fetchMinuteViews } = await import("./analyticsApi");
      const minuteData = await fetchMinuteViews(userId, minutes);
      setData(minuteData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch minute views";
      setError(message);
      console.error("[useMinuteViews] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, minutes]);

  useEffect(() => {
    fetchData();
    // Refresh every 10 seconds for minute-by-minute data
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}
