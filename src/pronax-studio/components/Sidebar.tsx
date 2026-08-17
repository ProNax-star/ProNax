import React from "react";
import {
  LayoutDashboard,
  Video,
  BarChart3,
  MessageSquare,
  DollarSign,
  Wand2,
  Music2,
  Captions,
  Settings,
  HelpCircle,
} from "lucide-react";
import { ViewMode, ChannelStats } from "../types";

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  channelStats: ChannelStats;
  isCollapsed: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  channelStats,
  isCollapsed,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const menuItems = [
    {
      id: "dashboard" as ViewMode,
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "content" as ViewMode,
      label: "Content",
      icon: Video,
    },
    {
      id: "analytics" as ViewMode,
      label: "Analytics",
      icon: BarChart3,
    },
    {
      id: "comments" as ViewMode,
      label: "Comments",
      icon: MessageSquare,
    },
    {
      id: "subtitles" as ViewMode,
      label: "Subtitles",
      icon: Captions,
    },
    {
      id: "earn" as ViewMode,
      label: "Earn",
      icon: DollarSign,
    },
    {
      id: "customization" as ViewMode,
      label: "Customization",
      icon: Wand2,
    },
    {
      id: "audio-library" as ViewMode,
      label: "Audio library",
      icon: Music2,
    },
    {
      id: "settings" as ViewMode,
      label: "Settings",
      icon: Settings,
    },
  ];

  const handleItemClick = (view: ViewMode) => {
    onSelectView(view);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full w-64 md:w-auto text-gray-300">
      <div className="flex-1 min-h-0 overflow-y-auto py-3 no-scrollbar">
        {/* Channel Info Card (Visible when expanded or on mobile overlay) */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="flex flex-col items-center px-4 pb-4 mb-2 border-b border-[#222]">
            <div className="relative group cursor-pointer mb-2">
              <img
                src={channelStats.avatar}
                alt={channelStats.name}
                className="h-20 w-20 md:h-24 md:w-24 rounded-full object-cover ring-2 ring-[#FE2C55]/30 group-hover:ring-[#FE2C55] transition-all"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">
              Your channel
            </p>
            <h2 className="text-sm font-bold text-white mt-0.5 break-words whitespace-normal max-w-full text-center leading-tight" dir="auto">
              {channelStats.name}
            </h2>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="space-y-2 px-2 mt-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const showLabel = !isCollapsed || isMobileOpen;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`flex w-full items-center gap-4 rounded-xl px-3.5 py-3 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#272727] text-[#FE2C55] shadow-lg shadow-[#FE2C55]/30 border-l-4 border-[#FE2C55] hover:shadow-xl hover:shadow-[#FE2C55]/40"
                    : "text-gray-300 hover:bg-[#1f1f1f] hover:text-white hover:shadow-md"
                } ${isCollapsed && !isMobileOpen ? "justify-center px-0" : ""}`}
                title={item.label}
                id={`sidebar-item-${item.id}`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive ? "text-[#FE2C55]" : "text-gray-400"
                  }`}
                />
                {showLabel && <span className="truncate break-words whitespace-normal">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Settings & Help */}
      <div className="border-t border-[#222] p-2 space-y-2 shrink-0">
        {(!isCollapsed || isMobileOpen) && (
          <>
            <button
              onClick={() => {
                alert("Send Studio Feedback");
                if (onCloseMobile) onCloseMobile();
              }}
              className="flex w-full items-center gap-4 rounded-xl px-3.5 py-3 text-xs font-medium text-gray-400 hover:bg-[#1f1f1f] hover:text-white transition-all"
            >
              <HelpCircle className="h-4 w-4 text-gray-500 shrink-0" />
              <span>Send feedback</span>
            </button>
            <p className="px-3 py-2 text-[10px] font-medium text-gray-500 leading-normal border-t border-[#1e1e1e]/60 mt-1">
              Pronax Studio — Independent Creator Management Platform
            </p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex select-none">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Mobile Sidebar Content Container */}
          <div className="relative z-10 w-64 max-w-[80vw] bg-[#0f0f0f] border-r border-[#272727] h-full shadow-2xl flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden md:flex sticky top-16 h-[calc(100vh-4rem)] bg-[#0f0f0f] border-r border-[#272727] flex-col justify-between transition-all duration-200 z-30 select-none ${
          isCollapsed ? "w-18" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
