"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const [timeoutMs, setTimeoutMs] = useState(2500);
  const [refreshSec, setRefreshSec] = useState(30);
  const [logLevel, setLogLevel] = useState("info");
  const [simFailure, setSimFailure] = useState(false);
  const [simDelay, setSimDelay] = useState(true);
  const [sysAlerts, setSysAlerts] = useState(true);

  // Load from localStorage if present
  useEffect(() => {
    const savedTimeout = localStorage.getItem("settings_timeout");
    const savedRefresh = localStorage.getItem("settings_refresh");
    const savedLogLevel = localStorage.getItem("settings_log_level");
    const savedSimFailure = localStorage.getItem("settings_sim_failure");
    const savedSimDelay = localStorage.getItem("settings_sim_delay");
    const savedSysAlerts = localStorage.getItem("settings_sys_alerts");

    if (savedTimeout) setTimeoutMs(Number(savedTimeout));
    if (savedRefresh) setRefreshSec(Number(savedRefresh));
    if (savedLogLevel) setLogLevel(savedLogLevel);
    if (savedSimFailure) setSimFailure(savedSimFailure === "true");
    if (savedSimDelay) setSimDelay(savedSimDelay === "true");
    if (savedSysAlerts) setSysAlerts(savedSysAlerts === "true");
  }, []);

  const handleSave = () => {
    localStorage.setItem("settings_timeout", String(timeoutMs));
    localStorage.setItem("settings_refresh", String(refreshSec));
    localStorage.setItem("settings_log_level", logLevel);
    localStorage.setItem("settings_sim_failure", String(simFailure));
    localStorage.setItem("settings_sim_delay", String(simDelay));
    localStorage.setItem("settings_sys_alerts", String(sysAlerts));
    
    toast.success("Settings configuration saved successfully.");
  };

  const handleReset = () => {
    setTimeoutMs(2000);
    setRefreshSec(30);
    setLogLevel("info");
    setSimFailure(false);
    setSimDelay(true);
    setSysAlerts(true);
    toast.info("Settings reverted to defaults.");
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] p-6 lg:p-8">
      <div className="space-y-6 max-w-4xl mx-auto">
        
        {/* Header */}
        <header className="border-b border-zinc-200 pb-5">
          <h1 className="text-[28px] font-medium tracking-tight text-zinc-900 font-display">Command Settings</h1>
          <p className="mt-0.5 text-sm text-zinc-500 font-body">Aggregator behavior configurations and network threshold management</p>
        </header>

        <div className="grid gap-6">
          {/* General Aggregator Config Card */}
          <Card className="border border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100 pb-4">
              <CardTitle className="text-base font-semibold text-zinc-800 font-body">Aggregation Parameters</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {/* Timeout MS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold text-zinc-800 font-body">Default Fetch Timeout</label>
                    <p className="text-xs text-zinc-400 font-medium font-body">Max duration allocated per supplier query request</p>
                  </div>
                  <span className="rounded-lg bg-zinc-100 border border-zinc-200 px-2.5 py-1 text-xs font-bold text-zinc-800 font-mono">
                    {timeoutMs} ms
                  </span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={10000}
                  step={100}
                  className="w-full accent-zinc-900 cursor-pointer"
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(Number(e.target.value))}
                />
                <div className="flex justify-between text-[10px] text-zinc-400 font-bold font-body">
                  <span>500 ms (Aggressive)</span>
                  <span>10,000 ms (High Latency)</span>
                </div>
              </div>

              {/* Refresh interval */}
              <div className="space-y-3 pt-4 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold text-zinc-800 font-body">Auto-Refresh Interval</label>
                    <p className="text-xs text-zinc-400 font-medium font-body">Hit-rate countdown duration limit for background syncs</p>
                  </div>
                  <span className="rounded-lg bg-zinc-100 border border-zinc-200 px-2.5 py-1 text-xs font-bold text-zinc-800 font-mono">
                    {refreshSec} seconds
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={5}
                  className="w-full accent-zinc-900 cursor-pointer"
                  value={refreshSec}
                  onChange={(e) => setRefreshSec(Number(e.target.value))}
                />
                <div className="flex justify-between text-[10px] text-zinc-400 font-bold font-body">
                  <span>5 s (Fast Refresh)</span>
                  <span>120 s (Conservative)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diagnostics and Simulator Toggles */}
          <Card className="border border-zinc-200 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100 pb-4">
              <CardTitle className="text-base font-semibold text-zinc-800 font-body">Simulator & Diagnostics</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Log Level select */}
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <label className="text-sm font-semibold text-zinc-800 font-body">Debugging Logging Level</label>
                  <p className="text-xs text-zinc-400 font-medium font-body">Detailed tracing outputs level for console reports</p>
                </div>
                <div className="relative min-w-[150px]">
                  <select
                    value={logLevel}
                    onChange={(e) => setLogLevel(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-4 pr-10 py-1.8 h-9 text-xs text-zinc-700 font-semibold cursor-pointer outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all duration-150 font-body"
                  >
                    <option value="debug">DEBUG (Verbose)</option>
                    <option value="info">INFO (Recommended)</option>
                    <option value="warn">WARN (Errors only)</option>
                    <option value="error">CRITICAL</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                    <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Simulation delay switch */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                <div className="space-y-0.5">
                  <label className="text-sm font-semibold text-zinc-800 font-body">Simulate Supplier Network Latency</label>
                  <p className="text-xs text-zinc-400 font-medium font-body">Inject synthetic delays to test frontend loader transitions</p>
                </div>
                <Switch checked={simDelay} onCheckedChange={setSimDelay} />
              </div>

              {/* Simulation failures switch */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                <div className="space-y-0.5">
                  <label className="text-sm font-semibold text-zinc-800 font-body">Inject Synthetic Timeout Failures</label>
                  <p className="text-xs text-zinc-400 font-medium font-body font-body">Forcibly mock error rates to examine fallback handlers</p>
                </div>
                <Switch checked={simFailure} onCheckedChange={setSimFailure} />
              </div>

              {/* System alerts switch */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                <div className="space-y-0.5">
                  <label className="text-sm font-semibold text-zinc-800 font-body">Trigger Toast Notifications</label>
                  <p className="text-xs text-zinc-400 font-medium font-body">Push toast alerts for critical offline supplier events</p>
                </div>
                <Switch checked={sysAlerts} onCheckedChange={setSysAlerts} />
              </div>
            </CardContent>
          </Card>

          {/* Action Row */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-sm font-body"
            >
              Reset Defaults
            </Button>
            {/* Primary Save Button - bg-zinc-900 (black) */}
            <Button
              type="button"
              onClick={handleSave}
              className="h-9 rounded-lg bg-zinc-900 hover:bg-zinc-750 text-white px-6 text-xs font-semibold shadow-sm transition-colors duration-150 font-body"
            >
              Save Configuration
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
