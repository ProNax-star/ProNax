/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import React, { useState, useEffect } from "react";
import {
  X,
  Radio,
  Copy,
  Check,
  Eye,
  MessageSquare,
  Send,
} from "lucide-react";
import { ChannelStats } from "../types";
import { formatMoney, DEFAULT_CURRENCY } from '@/lib/money';

interface LiveControlRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelStats: ChannelStats;
  currentVideo?: {
    id: string;
    views: number;
  };
  realUsers?: Array<{
    id: string;
    display_name: string;
    avatar_url: string;
  }>;
}

interface ChatMessage {
  id: string;
  author: string;
  avatar: string;
  text: string;
  timestamp: string;
  isSuperChat?: boolean;
  superChatAmount?: string;
  isPinned?: boolean;
}

export const LiveControlRoomModal: React.FC<LiveControlRoomModalProps> = ({
  isOpen,
  onClose,
  channelStats,
  currentVideo,
  realUsers,
}) => {
  // Stream States
  const [isLive, setIsLive] = useState(false);
  const [streamTitle, setStreamTitle] = useState(
    "🔴 Building a Production App Live! Q&A + Code Review"
  );
  const [activeTab, setActiveTab] = useState<"settings" | "health" | "analytics">(
    "settings"
  );

  // Stream Key & Settings
  const [streamKey, setStreamKey] = useState("live_8402910492_x82910a9201");
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [latency, setLatency] = useState<"normal" | "low" | "ultra_low">(
    "low"
  );
  const [autoStart, setAutoStart] = useState(true);
  const [autoStop, setAutoStop] = useState(true);

  // Live Metrics
  const [viewerCount, setViewerCount] = useState(currentVideo?.views || 0);
  const [bitrate, setBitrate] = useState(6800); // Kbps
  const [fps, setFps] = useState(60);

  // Chat Simulator State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      author: "AlexDev",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
      text: "Hello everyone! Excited for today's stream 🎉",
      timestamp: "12:00 PM",
    },
    {
      id: "m2",
      author: "Sarah_Codes",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
      text: `Superchat ${formatMoney(20, { currency: DEFAULT_CURRENCY })}! Love the channel content!`,
      timestamp: "12:01 PM",
      isSuperChat: true,
      superChatAmount: formatMoney(20, { currency: DEFAULT_CURRENCY }),
    },
  ]);
  const [inputChatText, setInputChatText] = useState("");
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);
  const [subscriberOnly, setSubscriberOnly] = useState(false);
  const [slowMode, setSlowMode] = useState(false);

  // Auto-generate viewer chat messages when live
  useEffect(() => {
    if (!isLive) return;

    // Use real users from database if available, otherwise fallback to simulated users
    const availableAuthors = realUsers && realUsers.length > 0
      ? realUsers.map(u => ({
          name: u.display_name || "User",
          avatar: u.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"
        }))
      : [
          { name: "CodeNinja", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=100" },
          { name: "Emily_React", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100" },
          { name: "FullstackGamer", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100" },
        ];

    const sampleTexts = [
      "Can you explain the state management again?",
      "The stream audio sounds super clear!",
      "Greeting from Tokyo! 🇯🇵",
      "Which Gemini model are you invoking?",
      "Awesome code setup 🔥",
    ];

    const interval = setInterval(() => {
      const randomAuthor =
        availableAuthors[Math.floor(Math.random() * availableAuthors.length)];
      const randomText =
        sampleTexts[Math.floor(Math.random() * sampleTexts.length)];

      const newMsg: ChatMessage = {
        id: "msg_" + Date.now(),
        author: randomAuthor.name,
        avatar: randomAuthor.avatar,
        text: randomText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setChatMessages((prev) => [...prev.slice(-30), newMsg]);
      setViewerCount((prev) => prev + Math.floor(Math.random() * 11) - 5);
      setBitrate(6700 + Math.floor(Math.random() * 200));
    }, 2500);

    return () => clearInterval(interval);
  }, [isLive]);

  if (!isOpen) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(streamKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSendCreatorMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputChatText.trim()) return;

    const newMsg: ChatMessage = {
      id: "msg_owner_" + Date.now(),
      author: `${channelStats.name} (Host)`,
      avatar: channelStats.avatar,
      text: inputChatText,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setInputChatText("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#181818] border border-[#333] w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col text-gray-100 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between p-4 border-b border-[#2d2d2d] bg-[#202020]">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl flex items-center gap-2 font-bold text-xs ${
                isLive
                  ? "bg-red-600 text-white animate-pulse"
                  : "bg-[#333] text-gray-400"
              }`}
            >
              <Radio className="h-4 w-4" />
              <span>{isLive ? "LIVE NOW" : "STREAM OFFLINE"}</span>
            </div>

            <div>
              <input
                type="text"
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                className="bg-transparent text-sm font-bold text-white focus:outline-none border-b border-transparent focus:border-red-500"
              />
              <p className="text-[11px] text-gray-400">
                Pronax Live Control Room
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-6 py-2 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 ${
                isLive
                  ? "bg-rose-700 hover:bg-rose-600 text-white"
                  : "bg-red-600 hover:bg-red-500 text-white"
              }`}
              id="go-live-toggle-btn"
            >
              {isLive ? "END STREAM" : "GO LIVE"}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[#333] text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Control Room Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Left / Center Section: Stream Preview & Dashboard Tabs */}
          <div className="flex-1 flex flex-col p-4 md:p-5 space-y-4 md:space-y-5 overflow-y-auto border-r border-[#2d2d2d]">
            {/* Live Video Canvas */}
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-[#333] flex items-center justify-center">
              {isLive ? (
                <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-tr from-slate-900 to-zinc-900">
                  <img
                    src={channelStats.banner || undefined}
                    alt="Stream Feed"
                    className="w-full h-full object-cover opacity-60"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                    LIVE | 1080p60
                  </div>
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/80 backdrop-blur-sm border border-[#444] px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-200">
                    <Eye className="h-4 w-4 text-emerald-400" />
                    <span>{viewerCount.toLocaleString()} watching</span>
                  </div>
                  <div className="absolute bottom-4 left-4 bg-black/80 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-emerald-400 border border-[#444]">
                    Stream Bitrate: {bitrate.toLocaleString()} Kbps
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <Radio className="h-12 w-12 text-gray-600 animate-pulse" />
                  <h3 className="text-base font-bold text-white">
                    Connect streaming software to go live
                  </h3>
                  <p className="text-xs text-gray-400 max-w-md">
                    Send your video stream from OBS, Streamlabs, or hardware encoder using the Stream Key below.
                  </p>
                </div>
              )}
            </div>

            {/* Dashboard Tabs (Stream Settings, Stream Health, Analytics) */}
            <div className="flex border-b border-[#2d2d2d] gap-6 text-xs font-bold text-gray-400 select-none">
              <button
                onClick={() => setActiveTab("settings")}
                className={`pb-2 transition-all ${
                  activeTab === "settings"
                    ? "text-red-500 border-b-2 border-red-500"
                    : "hover:text-gray-200"
                }`}
              >
                Stream Settings
              </button>
              <button
                onClick={() => setActiveTab("health")}
                className={`pb-2 transition-all ${
                  activeTab === "health"
                    ? "text-red-500 border-b-2 border-red-500"
                    : "hover:text-gray-200"
                }`}
              >
                Stream Health
              </button>
            </div>

            {/* Tab 1: Stream Settings */}
            {activeTab === "settings" && (
              <div className="space-y-4 text-xs">
                {/* Stream Key */}
                <div className="p-4 bg-[#212121] border border-[#333] rounded-2xl space-y-2">
                  <label className="block text-gray-300 font-bold uppercase">
                    Stream Key (Paste in OBS)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type={showStreamKey ? "text" : "password"}
                      value={streamKey}
                      readOnly
                      className="flex-1 rounded-xl bg-[#121212] border border-[#3d3d3d] p-2.5 font-mono text-white focus:outline-none"
                    />
                    <button
                      onClick={() => setShowStreamKey(!showStreamKey)}
                      className="p-2.5 rounded-xl bg-[#2a2a2a] hover:bg-[#333] text-gray-300 font-semibold"
                    >
                      {showStreamKey ? "Hide" : "Reveal"}
                    </button>
                    <button
                      onClick={() => {
                        const newKey = "live_" + Math.random().toString(36).substring(2, 12) + "_v2";
                        setStreamKey(newKey);
                      }}
                      className="p-2.5 rounded-xl bg-[#2a2a2a] hover:bg-[#333] text-gray-300 font-semibold"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleCopyKey}
                      className="flex items-center gap-1.5 p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold"
                    >
                      {copiedKey ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span>{copiedKey ? "COPIED" : "COPY"}</span>
                    </button>
                  </div>
                </div>

                {/* Auto start & stop toggles */}
                <div className="p-4 bg-[#212121] border border-[#333] rounded-2xl grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAutoStart(!autoStart)}
                    className={`p-3 rounded-xl border text-left transition ${
                      autoStart ? "border-emerald-500/50 bg-emerald-500/10 text-white" : "border-[#333] bg-[#141414] text-gray-400"
                    }`}
                  >
                    <p className="font-bold text-xs">Auto Start</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{autoStart ? "Enabled" : "Disabled"}</p>
                  </button>

                  <button
                    onClick={() => setAutoStop(!autoStop)}
                    className={`p-3 rounded-xl border text-left transition ${
                      autoStop ? "border-emerald-500/50 bg-emerald-500/10 text-white" : "border-[#333] bg-[#141414] text-gray-400"
                    }`}
                  >
                    <p className="font-bold text-xs">Auto Stop</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{autoStop ? "Enabled" : "Disabled"}</p>
                  </button>
                </div>

                {/* Stream Latency Options */}
                <div className="p-4 bg-[#212121] border border-[#333] rounded-2xl space-y-2">
                  <label className="block text-gray-300 font-bold uppercase">
                    Stream Latency Mode
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "normal", label: "Normal Latency", desc: "Best video quality" },
                      { id: "low", label: "Low Latency", desc: "Real-time viewer interaction" },
                      { id: "ultra_low", label: "Ultra-Low Latency", desc: "Fastest response (< 2s)" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setLatency(mode.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          latency === mode.id
                            ? "bg-[#FE2C55]/10 border-[#FE2C55] text-white font-bold"
                            : "bg-[#161616] border-[#333] text-gray-400 hover:bg-[#282828]"
                        }`}
                      >
                        <p className="font-bold text-white">{mode.label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {mode.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Stream Health */}
            {activeTab === "health" && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-[#14221a] border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                    <div>
                      <h4 className="font-bold text-white">
                        EXCELLENT STREAM CONNECTION
                      </h4>
                      <p className="text-[11px] text-emerald-400">
                        Zero dropped frames. Keyframe frequency optimal.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFps(fps === 60 ? 30 : 60)}
                    className="font-mono font-bold text-white bg-black/40 px-3 py-1 rounded-lg border border-white/10 hover:border-white/30"
                  >
                    {fps} FPS
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#212121] border border-[#333] rounded-2xl space-y-1">
                    <span className="text-gray-400">Video Bitrate</span>
                    <p className="text-xl font-black text-white">
                      {bitrate.toLocaleString()} Kbps
                    </p>
                  </div>
                  <div className="p-4 bg-[#212121] border border-[#333] rounded-2xl space-y-1">
                    <span className="text-gray-400">Audio Codec</span>
                    <p className="text-xl font-black text-white">
                      AAC 160 Kbps 48kHz
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Section: Live Chat Simulator */}
          <div className="w-full lg:w-80 h-72 lg:h-auto border-t lg:border-t-0 lg:border-l border-[#2d2d2d] bg-[#141414] flex flex-col justify-between shrink-0">
            {/* Chat Top Bar */}
            <div className="p-3 border-b border-[#2d2d2d] flex items-center justify-between text-xs font-bold text-white">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-red-500" />
                <span>Live Chat</span>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  onClick={() => setSlowMode(!slowMode)}
                  className={`px-2 py-1 rounded transition ${
                    slowMode ? "bg-amber-600 text-white" : "bg-[#282828] text-gray-400"
                  }`}
                >
                  Slow Mode
                </button>
                <button
                  onClick={() => setSubscriberOnly(!subscriberOnly)}
                  className={`px-2 py-1 rounded ${
                    subscriberOnly
                      ? "bg-[#FE2C55] text-white"
                      : "bg-[#282828] text-gray-400"
                  }`}
                >
                  Followers Only
                </button>
              </div>
            </div>

            {/* Chat Messages Feed */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              {pinnedMessage && (
                <div className="p-2.5 rounded-xl bg-[#FE2C55]/20 border border-[#FE2C55]/40 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#FE2C55]">Pinned: </span>
                    <span className="text-white">{pinnedMessage.text}</span>
                  </div>
                  <button onClick={() => setPinnedMessage(null)} className="text-gray-400 hover:text-white text-[10px]">Unpin</button>
                </div>
              )}
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => setPinnedMessage(msg)}
                  title="Click to pin message"
                  className={`flex items-start gap-2.5 p-2 rounded-xl transition-all cursor-pointer ${
                    msg.isSuperChat
                      ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40"
                      : "hover:bg-[#202020]"
                  }`}
                >
                  <img
                    src={msg.avatar || undefined}
                    alt={msg.author}
                    className="h-6 w-6 rounded-full object-cover shrink-0 mt-0.5"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-200 truncate">
                        {msg.author}
                      </span>
                      {msg.isSuperChat && (
                        <span className="text-[10px] font-black text-amber-400 bg-amber-400/20 px-1.5 py-0.5 rounded">
                          {msg.superChatAmount}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300 text-[11px] leading-relaxed mt-0.5">
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={handleSendCreatorMessage}
              className="p-3 border-t border-[#2d2d2d] bg-[#1a1a1a] flex gap-2"
            >
              <input
                type="text"
                value={inputChatText}
                onChange={(e) => setInputChatText(e.target.value)}
                placeholder="Say something as Host..."
                className="flex-1 rounded-xl bg-[#101010] border border-[#333] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FE2C55]"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-[#FE2C55] hover:bg-[#FF4D6D] text-white font-bold"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
