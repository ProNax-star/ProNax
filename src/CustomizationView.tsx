/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import React, { useState } from "react";
import { Upload, Check, Camera } from "lucide-react";
import { ChannelStats } from "../types";

interface CustomizationViewProps {
  channelStats: ChannelStats;
  onUpdateChannelStats: (updated: Partial<ChannelStats>) => void;
}

export const CustomizationView: React.FC<CustomizationViewProps> = ({
  channelStats,
  onUpdateChannelStats,
}) => {
  const [activeTab, setActiveTab] = useState<"layout" | "branding" | "basic_info">(
    "branding"
  );

  const [name, setName] = useState(channelStats.name);
  const [handle, setHandle] = useState(channelStats.handle);
  const [avatar, setAvatar] = useState(channelStats.avatar);
  const [banner, setBanner] = useState(channelStats.banner);
  const [description, setDescription] = useState(
    "Official Dev Creator Studio channel. Sharing tutorials, full-stack AI roadmaps, code architecture tips, and software engineering deep dives."
  );

  const [isSaved, setIsSaved] = useState(false);

  const handlePublish = () => {
    onUpdateChannelStats({
      name,
      handle,
      avatar,
      banner,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 text-gray-100 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Channel customization
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Customize your channel's branding, layout, and basic information.
          </p>
        </div>

        <button
          onClick={handlePublish}
          className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
          id="customization-publish-btn"
        >
          {isSaved ? <Check className="h-4 w-4" /> : null}
          <span>{isSaved ? "CHANGES PUBLISHED" : "PUBLISH"}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-[#2d2d2d] gap-6 text-sm font-semibold text-gray-400 select-none">
        <button
          onClick={() => setActiveTab("branding")}
          className={`pb-3 capitalize transition-all ${
            activeTab === "branding"
              ? "text-red-500 border-b-2 border-red-500 font-bold"
              : "hover:text-gray-200"
          }`}
          id="customization-tab-branding"
        >
          Branding
        </button>
        <button
          onClick={() => setActiveTab("basic_info")}
          className={`pb-3 capitalize transition-all ${
            activeTab === "basic_info"
              ? "text-red-500 border-b-2 border-red-500 font-bold"
              : "hover:text-gray-200"
          }`}
          id="customization-tab-basic"
        >
          Basic Info
        </button>
        <button
          onClick={() => setActiveTab("layout")}
          className={`pb-3 capitalize transition-all ${
            activeTab === "layout"
              ? "text-red-500 border-b-2 border-red-500 font-bold"
              : "hover:text-gray-200"
          }`}
        >
          Layout
        </button>
      </div>

      {/* Branding Tab */}
      {activeTab === "branding" && (
        <div className="space-y-6">
          {/* Picture */}
          <div className="p-6 bg-[#1a1a1a] rounded-2xl border border-[#2d2d2d] space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Profile Picture
            </h2>
            <p className="text-xs text-gray-400">
              Your profile picture will appear where your channel is presented on Pronax Studio (e.g. next to your videos and comments).
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
              <img
                src={avatar || undefined}
                alt="Profile Avatar"
                className="h-28 w-28 rounded-full object-cover border-2 border-red-500 shadow-lg"
                referrerPolicy="no-referrer"
              />

              <div className="space-y-3 text-xs">
                <p className="text-gray-400">
                  Recommended: Square image, 98 x 98 px or larger (PNG or JPG). Max 4MB.
                </p>

                <div className="flex gap-3">
                  <label className="bg-[#2a2a2a] hover:bg-[#383838] text-white px-4 py-2 rounded-xl font-semibold cursor-pointer transition-colors flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5" />
                    <span>CHANGE</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAvatar(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>

                  <button
                    onClick={() =>
                      setAvatar(
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250"
                      )
                    }
                    className="bg-[#202020] hover:bg-[#2c2c2c] text-gray-400 hover:text-white px-4 py-2 rounded-xl font-semibold transition-colors"
                  >
                    RESET
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Banner Image */}
          <div className="p-6 bg-[#1a1a1a] rounded-2xl border border-[#2d2d2d] space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Banner Image
            </h2>
            <p className="text-xs text-gray-400">
              This image will appear across the top of your channel page.
            </p>

            <div className="space-y-4 pt-2">
              <div className="h-36 w-full rounded-xl overflow-hidden border border-[#333] relative bg-black">
                <img
                  src={banner || undefined}
                  alt="Channel Banner"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  Recommended: At least 2048 x 1152 px (6MB or less).
                </span>

                <label className="bg-[#2a2a2a] hover:bg-[#383838] text-white px-4 py-2 rounded-xl font-semibold cursor-pointer transition-colors flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  <span>CHANGE BANNER</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setBanner(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basic Info Tab */}
      {activeTab === "basic_info" && (
        <div className="p-6 bg-[#1a1a1a] rounded-2xl border border-[#2d2d2d] space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase mb-2">
              Channel Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full max-w-lg rounded-xl bg-[#121212] border border-[#333] p-3 text-xs text-white focus:border-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase mb-2">
              Channel Handle
            </label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="w-full max-w-lg rounded-xl bg-[#121212] border border-[#333] p-3 text-xs text-white focus:border-red-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase mb-2">
              Channel Description
            </label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full max-w-xl rounded-xl bg-[#121212] border border-[#333] p-3 text-xs text-white focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Layout Tab */}
      {activeTab === "layout" && (
        <div className="p-6 bg-[#1a1a1a] rounded-2xl border border-[#2d2d2d] space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Video Spotlight
          </h2>
          <p className="text-xs text-gray-400">
            Add a video to the top of your channel homepage.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-4 bg-[#232323] rounded-xl border border-[#333] text-xs">
              <div>
                <p className="font-bold text-white">
                  Channel trailer for people who haven't followed
                </p>
                <p className="text-gray-400 mt-0.5">
                  Share a preview of your channel to show non-followers what to expect.
                </p>
              </div>
              <button
                onClick={() => alert("Select video trailer")}
                className="text-red-400 hover:text-red-300 font-bold"
              >
                ADD
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#232323] rounded-xl border border-[#333] text-xs">
              <div>
                <p className="font-bold text-white">
                  Featured video for returning followers
                </p>
                <p className="text-gray-400 mt-0.5">
                  Highlight a video for your followers to watch next.
                </p>
              </div>
              <button
                onClick={() => alert("Select featured video")}
                className="text-red-400 hover:text-red-300 font-bold"
              >
                ADD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
