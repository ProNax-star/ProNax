/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Wifi, Check, AlertTriangle } from 'lucide-react';

export function MonitorTab() {
  const [stats, setStats] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
  });

  useEffect(() => {
    // Simulate system stats
    const interval = setInterval(() => {
      setStats({
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        network: Math.random() * 100,
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ icon: Icon, label, value, unit }: any) => (
    <div className="glass-strong rounded-xl border border-border/40 p-4">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5 text-primary" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">
        {value.toFixed(1)}{unit}
      </div>
      <div className="w-full bg-secondary rounded-full h-2 mt-2">
        <div
          className="bg-primary rounded-full h-2 transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Cpu} label="CPU Usage" value={stats.cpu} unit="%" />
        <StatCard icon={Activity} label="Memory" value={stats.memory} unit="%" />
        <StatCard icon={HardDrive} label="Disk" value={stats.disk} unit="%" />
        <StatCard icon={Wifi} label="Network" value={stats.network} unit="%" />
      </div>

      <div className="glass-strong rounded-xl border border-border/40 p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Check className="w-5 h-5 text-green-500" />
          System Status
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
            <span className="text-sm">Database</span>
            <span className="text-xs text-green-500 font-medium">Connected</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
            <span className="text-sm">Storage Service</span>
            <span className="text-xs text-green-500 font-medium">Operational</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
            <span className="text-sm">Auth Service</span>
            <span className="text-xs text-green-500 font-medium">Active</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
            <span className="text-sm">Queue System</span>
            <span className="text-xs text-yellow-500 font-medium">Processing</span>
          </div>
        </div>
      </div>
    </div>
  );
}