/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import React from "react";
import { UploadModal as CommonUploadModal } from "@/components/UploadModal";
import { Video } from "../types";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishVideo: (newVideo: Video) => void;
  videoFile?: File | null;
  onVideoChange?: (file: File | null) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onPublishVideo,
  videoFile,
  onVideoChange,
}) => {
  return (
    <CommonUploadModal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          if (onVideoChange) onVideoChange(null);
        }
      }}
      videoFile={videoFile}
      onVideoChange={onVideoChange}
      onSuccess={(payload) => {
        const newVid: Video = {
          id: "v" + Date.now(),
          title: payload.title || "Untitled Video",
          description: payload.description || "",
          thumbnail: payload.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
          duration: payload.is_short ? "0:45" : "11:20",
          visibility: payload.visibility === 'public' ? 'Public' : payload.visibility === 'unlisted' ? 'Unlisted' : 'Private',
          monetization: payload.monetization_enabled ?? true,
          restrictions: payload.copyright_status === 'claimed' ? 'Copyright Claim' : 'None',
          uploadDate: "Just now",
          views: 0,
          commentsCount: 0,
          likes: 0,
          dislikes: 0,
          likePercentage: 100,
          ctr: 10.0,
          avgViewDuration: payload.is_short ? "0:42" : "6:10",
          tags: ["PRO NAX", payload.category || "General"],
          category: payload.category || "Science & Technology",
          isShort: payload.is_short ?? false,
        };
        onPublishVideo(newVid);
        if (onVideoChange) onVideoChange(null);
      }}
    />
  );
};
