import React, { useState } from "react";
import {
  X,
  Settings as SettingsIcon,
  Check,
  Save,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    "general" | "channel" | "upload_defaults" | "permissions" | "community" | "storage"
  >("general");

  const [currency, setCurrency] = useState("USD ($)");
  const [country, setCountry] = useState("United States");
  const [keywords, setKeywords] = useState("coding, webdev, react, ai, gemini");
  const [defaultVisibility, setDefaultVisibility] = useState("Public");
  const [savedMessage, setSavedMessage] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#333] w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col text-gray-100 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2d2d2d] bg-[#222]">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-gray-300" />
            <span>Studio Settings</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#333] text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-[480px]">
          {/* Sidebar Menu */}
          <div className="w-full md:w-56 border-r border-[#2d2d2d] bg-[#141414] p-2 space-y-1 text-xs font-semibold select-none shrink-0">
            {[
              { id: "general", label: "General" },
              { id: "channel", label: "Channel" },
              { id: "upload_defaults", label: "Upload defaults" },
              { id: "storage", label: "Video Storage & R2" },
              { id: "permissions", label: "Permissions" },
              { id: "community", label: "Community" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? "bg-[#282828] text-[#FE2C55] font-bold border-l-4 border-[#FE2C55]"
                    : "text-gray-400 hover:bg-[#202020] hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Main Content Pane */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 text-xs">
            {activeTab === "general" && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                  Default Units
                </h3>
                <div>
                  <label className="block text-gray-400 mb-1.5 font-medium">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full max-w-xs rounded-xl bg-[#101010] border border-[#333] p-2.5 text-white font-semibold focus:border-red-500 focus:outline-none"
                  >
                    <option value="USD ($)">USD - US Dollar ($)</option>
                    <option value="EUR (€)">EUR - Euro (€)</option>
                    <option value="GBP (£)">GBP - British Pound (£)</option>
                    <option value="PKR (Rs)">PKR - Pakistani Rupee (Rs)</option>
                    <option value="INR (₹)">INR - Indian Rupee (₹)</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === "channel" && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                  Channel Information
                </h3>
                <div>
                  <label className="block text-gray-400 mb-1 font-medium">
                    Country of Residence
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full max-w-sm rounded-xl bg-[#101010] border border-[#333] p-2.5 text-white focus:border-red-500 focus:outline-none"
                  >
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Pakistan">Pakistan</option>
                    <option value="India">India</option>
                    <option value="Germany">Germany</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-medium">
                    Channel Search Keywords
                  </label>
                  <textarea
                    rows={3}
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="w-full rounded-xl bg-[#101010] border border-[#333] p-3 text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {activeTab === "upload_defaults" && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                  Default Upload Settings
                </h3>
                <div>
                  <label className="block text-gray-400 mb-1 font-medium">
                    Default Visibility
                  </label>
                  <select
                    value={defaultVisibility}
                    onChange={(e) => setDefaultVisibility(e.target.value)}
                    className="w-full max-w-xs rounded-xl bg-[#101010] border border-[#333] p-2.5 text-white focus:border-red-500 focus:outline-none"
                  >
                    <option value="Public">Public</option>
                    <option value="Unlisted">Unlisted</option>
                    <option value="Private">Private</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === "storage" && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Cloudflare R2 Video Vault & CDN</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                    CONNECTED
                  </span>
                </h3>

                <div className="p-4 bg-[#111] rounded-xl border border-[#333] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-semibold">Primary Vault Bucket:</span>
                    <span className="text-cyan-400 font-mono font-bold">pronax-video-storage-vault</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-semibold">Global CDN Delivery:</span>
                    <span className="text-cyan-400 font-mono">https://cdn.pronax.tv</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-semibold">Storage Provider:</span>
                    <span className="text-white font-mono">Cloudflare R2 Zero-Egress Object Storage</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#222]">
                    <span className="text-gray-400 font-semibold">Resumable Chunking:</span>
                    <span className="text-emerald-400 font-bold">Enabled (10MB Parallel Parts)</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400">
                  All raw MP4, WebM, and HLS video chunks generated by ProNax Studio are stored securely in Cloudflare R2 object storage with multi-region CDN caching.
                </p>
              </div>
            )}

            {activeTab === "permissions" && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                  Permissions for Dev Creator Studio
                </h3>
                <div className="p-4 bg-[#222] rounded-xl border border-[#333] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">zkg4600@gmail.com</p>
                    <p className="text-gray-400">Primary Channel Owner</p>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full text-[11px] font-bold border border-emerald-500/20">
                    Owner
                  </span>
                </div>
              </div>
            )}

            {activeTab === "community" && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                  Automated Filters
                </h3>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-300">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="accent-red-600 h-4 w-4"
                  />
                  <span>Block comments with suspicious links</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2d2d2d] bg-[#222] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#333] hover:bg-[#444] text-gray-300 font-bold text-xs"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
          >
            {savedMessage ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            <span>{savedMessage ? "SAVED!" : "SAVE"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
