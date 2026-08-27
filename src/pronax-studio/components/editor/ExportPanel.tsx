/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import React, { useState } from "react";
import { Download, Video as VideoIcon, Wand2, CheckCircle2, AlertCircle } from "lucide-react";
import { Panel } from "./Panel";

interface ExportPanelProps {
  onExport: (settings: ExportSettings) => void;
  isExporting: boolean;
}

export interface ExportSettings {
  format: "mp4" | "webm" | "mov";
  quality: "1080p" | "720p" | "480p" | "360p";
  codec: "h264" | "h265" | "vp9";
  bitrate: number;
  includeAudio: boolean;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ onExport, isExporting }) => {
  const [settings, setSettings] = useState<ExportSettings>({
    format: "mp4",
    quality: "1080p",
    codec: "h264",
    bitrate: 8000,
    includeAudio: true,
  });

  const [exportStatus, setExportStatus] = useState<"idle" | "preparing" | "encoding" | "complete" | "error">("idle");

  const handleExport = () => {
    setExportStatus("preparing");
    onExport(settings);
    
    // Simulate export process
    setTimeout(() => setExportStatus("encoding"), 1000);
    setTimeout(() => setExportStatus("complete"), 5000);
  };

  return (
    <Panel title="Export" icon={<Download className="h-4 w-4" />}>
      <div className="space-y-4">
        {/* Format Selection */}
        <div>
          <label className="text-[11px] text-gray-400 mb-2 block">Format</label>
          <div className="grid grid-cols-3 gap-2">
            {(["mp4", "webm", "mov"] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSettings({ ...settings, format: fmt })}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${
                  settings.format === fmt
                    ? "border-red-500 bg-red-500/10 text-red-400"
                    : "border-[#2e2e38] bg-[#1e1e24] text-gray-400 hover:border-[#3e3e48]"
                }`}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Quality Selection */}
        <div>
          <label className="text-[11px] text-gray-400 mb-2 block">Quality</label>
          <div className="grid grid-cols-2 gap-2">
            {(["1080p", "720p", "480p", "360p"] as const).map((q) => (
              <button
                key={q}
                onClick={() => setSettings({ ...settings, quality: q })}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${
                  settings.quality === q
                    ? "border-red-500 bg-red-500/10 text-red-400"
                    : "border-[#2e2e38] bg-[#1e1e24] text-gray-400 hover:border-[#3e3e48]"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Codec Selection */}
        <div>
          <label className="text-[11px] text-gray-400 mb-2 block">Codec</label>
          <select
            value={settings.codec}
            onChange={(e) => setSettings({ ...settings, codec: e.target.value as any })}
            className="w-full bg-[#1e1e24] border border-[#2e2e38] rounded-lg px-3 py-2 text-xs text-gray-300 focus:border-red-500 outline-none"
          >
            <option value="h264">H.264 (Best compatibility)</option>
            <option value="h265">H.265 (Better compression)</option>
            <option value="vp9">VP9 (Web optimized)</option>
          </select>
        </div>

        {/* Bitrate Slider */}
        <div>
          <label className="text-[11px] text-gray-400 mb-2 block">Bitrate: {settings.bitrate} kbps</label>
          <input
            type="range"
            min="1000"
            max="20000"
            step="500"
            value={settings.bitrate}
            onChange={(e) => setSettings({ ...settings, bitrate: Number(e.target.value) })}
            className="w-full h-1.5 bg-[#2a2a35] rounded cursor-pointer"
            style={{ accentColor: "#ef4444" }}
          />
        </div>

        {/* Audio Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-gray-400">Include Audio</label>
          <button
            onClick={() => setSettings({ ...settings, includeAudio: !settings.includeAudio })}
            className={`w-10 h-5 rounded-full transition ${
              settings.includeAudio ? "bg-red-500" : "bg-[#2e2e38]"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white transition-transform ${
                settings.includeAudio ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Export Status */}
        {exportStatus !== "idle" && (
          <div className={`p-3 rounded-lg border ${
            exportStatus === "complete" 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : exportStatus === "error"
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-blue-500/10 border-blue-500/30 text-blue-400"
          }`}>
            <div className="flex items-center gap-2">
              {exportStatus === "complete" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : exportStatus === "error" ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <VideoIcon className="h-4 w-4 animate-pulse" />
              )}
              <span className="text-xs font-medium">
                {exportStatus === "preparing" && "Preparing export..."}
                {exportStatus === "encoding" && "Encoding video..."}
                {exportStatus === "complete" && "Export complete!"}
                {exportStatus === "error" && "Export failed"}
              </span>
            </div>
          </div>
        )}

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting || exportStatus === "encoding"}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-[#2e2e38] disabled:text-gray-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition"
        >
          <Wand2 className="h-4 w-4" />
          {isExporting || exportStatus === "encoding" ? "Exporting..." : "Export Video"}
        </button>
      </div>
    </Panel>
  );
};
