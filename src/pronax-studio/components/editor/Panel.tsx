/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import React, { useState } from "react";

interface PanelProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  children,
  icon,
}) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-[#1a1a20] border border-[#2e2e38] rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-2.5 flex items-center justify-between bg-[#1e1e24] hover:bg-[#262630] transition-colors"
      >
        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          {icon}
          {title}
        </span>
        <span className="text-gray-500 text-[10px]">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
};
