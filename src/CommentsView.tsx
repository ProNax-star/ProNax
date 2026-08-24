/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { geminiFetch } from "../geminiClient";
import React, { useState } from "react";
import {
  MessageSquare,
  Search,
  Heart,
  ThumbsUp,
  Sparkles,
  Send,
  Trash2,
  Loader2,
} from "lucide-react";
import { Comment } from "../types";

interface CommentsViewProps {
  comments: Comment[];
  onAddReply: (commentId: string, replyText: string) => void;
  onToggleHeart: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
}

export const CommentsView: React.FC<CommentsViewProps> = ({
  comments,
  onAddReply,
  onToggleHeart,
  onDeleteComment,
}) => {
  const [activeTab, setActiveTab] = useState<"published" | "held_for_review">(
    "published"
  );
  const [filterText, setFilterText] = useState("");
  const [replyInputMap, setReplyInputMap] = useState<Record<string, string>>({});
  const [aiRepliesMap, setAiRepliesMap] = useState<Record<string, string[]>>({});
  const [loadingAiId, setLoadingAiId] = useState<string | null>(null);

  const filteredComments = comments.filter((c) => {
    if (c.status !== activeTab) return false;
    if (
      filterText &&
      !c.text.toLowerCase().includes(filterText.toLowerCase()) &&
      !c.author.toLowerCase().includes(filterText.toLowerCase()) &&
      !c.videoTitle.toLowerCase().includes(filterText.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const generateAIReply = async (comment: Comment) => {
    try {
      setLoadingAiId(comment.id);
      const res = await geminiFetch("comment-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentText: comment.text,
          authorName: comment.author,
          tone: "grateful, expert, and encouraging",
        }),
      });

      const data = await res.json();
      if (data.replies && Array.isArray(data.replies)) {
        setAiRepliesMap((prev) => ({ ...prev, [comment.id]: data.replies }));
      }
    } catch (error) {
      console.error("AI reply error:", error);
    } finally {
      setLoadingAiId(null);
    }
  };

  const handleSendReply = (commentId: string) => {
    const text = replyInputMap[commentId];
    if (!text || !text.trim()) return;
    onAddReply(commentId, text.trim());
    setReplyInputMap((prev) => ({ ...prev, [commentId]: "" }));
    setAiRepliesMap((prev) => ({ ...prev, [commentId]: [] }));
  };

  return (
    <div className="p-4 md:p-6 space-y-6 text-gray-100 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          Channel comments & mentions
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Engage with your community, moderate comments, and use AI smart replies.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-[#2d2d2d] gap-6 text-sm font-semibold text-gray-400 select-none">
        <button
          onClick={() => setActiveTab("published")}
          className={`pb-3 transition-all ${
            activeTab === "published"
              ? "text-red-500 border-b-2 border-red-500 font-bold"
              : "hover:text-gray-200"
          }`}
          id="comments-tab-published"
        >
          Published ({comments.filter((c) => c.status === "published").length})
        </button>

        <button
          onClick={() => setActiveTab("held_for_review")}
          className={`pb-3 transition-all flex items-center gap-1.5 ${
            activeTab === "held_for_review"
              ? "text-red-500 border-b-2 border-red-500 font-bold"
              : "hover:text-gray-200"
          }`}
          id="comments-tab-held"
        >
          <span>Held for review</span>
          {comments.filter((c) => c.status === "held_for_review").length > 0 && (
            <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 text-[10px] rounded-full">
              {comments.filter((c) => c.status === "held_for_review").length}
            </span>
          )}
        </button>
      </div>

      {/* Filter input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Filter comments or search keyword..."
          className="w-full rounded-xl bg-[#1f1f1f] border border-[#333] py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
        />
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {filteredComments.length > 0 ? (
          filteredComments.map((comment) => {
            const aiReplies = aiRepliesMap[comment.id] || [];
            const isAiLoading = loadingAiId === comment.id;

            return (
              <div
                key={comment.id}
                className="p-5 bg-[#1a1a1a] rounded-2xl border border-[#2d2d2d] space-y-3 shadow-md hover:border-[#383838] transition-colors"
              >
                {/* Comment Context Header */}
                <div className="flex items-center justify-between text-xs text-gray-400 border-b border-[#252525] pb-2">
                  <span className="font-semibold text-gray-300 truncate max-w-lg">
                    Video: <span className="text-white">{comment.videoTitle}</span>
                  </span>
                  <span>{comment.timeAgo}</span>
                </div>

                {/* Main Comment Body */}
                <div className="flex gap-3 items-start">
                  <img
                    src={comment.avatar || undefined}
                    alt={comment.author}
                    className="h-9 w-9 rounded-full object-cover shrink-0 border border-[#333]"
                    referrerPolicy="no-referrer"
                  />

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        {comment.author}
                      </span>
                      {comment.subscriberCount && (
                        <span className="text-[10px] font-medium bg-[#282828] text-gray-400 px-2 py-0.5 rounded-full">
                          {comment.subscriberCount}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-200 leading-relaxed">
                      {comment.text}
                    </p>

                    {/* Action Toolbar */}
                    <div className="flex items-center gap-4 pt-2 text-xs text-gray-400">
                      <div className="flex items-center gap-1 hover:text-white cursor-pointer">
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span>{comment.likes}</span>
                      </div>

                      <button
                        onClick={() => onToggleHeart(comment.id)}
                        className={`flex items-center gap-1 transition-colors ${
                          comment.heart
                            ? "text-rose-500 fill-rose-500"
                            : "hover:text-rose-400"
                        }`}
                        title="Heart comment"
                      >
                        <Heart
                          className={`h-3.5 w-3.5 ${
                            comment.heart ? "fill-current" : ""
                          }`}
                        />
                      </button>

                      {/* AI Smart Reply Button */}
                      <button
                        onClick={() => generateAIReply(comment)}
                        disabled={isAiLoading}
                        className="flex items-center gap-1 text-purple-400 hover:text-purple-300 font-semibold bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg text-[11px] transition-all"
                      >
                        {isAiLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3 text-amber-300" />
                        )}
                        <span>AI Smart Reply</span>
                      </button>

                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="hover:text-rose-400 transition-colors ml-auto"
                        title="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* AI Smart Reply Suggestions Drawer */}
                    {aiReplies.length > 0 && (
                      <div className="mt-3 p-3 bg-[#231e2d] border border-purple-500/30 rounded-xl space-y-2">
                        <p className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                          Gemini Suggested Smart Replies (Click to select):
                        </p>
                        <div className="space-y-1.5">
                          {aiReplies.map((replyText, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setReplyInputMap((prev) => ({
                                  ...prev,
                                  [comment.id]: replyText,
                                }));
                              }}
                              className="w-full text-left p-2 rounded-lg bg-[#1a1724] hover:bg-[#2f273d] text-xs text-gray-200 border border-[#3d3350] transition-colors"
                            >
                              "{replyText}"
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Existing Reply Display */}
                    {comment.replyText && (
                      <div className="mt-3 ml-4 p-3 bg-[#232323] border-l-2 border-red-500 rounded-r-xl text-xs text-gray-200">
                        <p className="text-[10px] font-bold text-red-400 mb-0.5">
                          Dev Creator Studio (You):
                        </p>
                        <p>{comment.replyText}</p>
                      </div>
                    )}

                    {/* Reply Input Box */}
                    <div className="flex gap-2 pt-2">
                      <input
                        type="text"
                        value={replyInputMap[comment.id] || ""}
                        onChange={(e) =>
                          setReplyInputMap((prev) => ({
                            ...prev,
                            [comment.id]: e.target.value,
                          }))
                        }
                        placeholder="Reply publicly as Dev Creator Studio..."
                        className="flex-1 rounded-xl bg-[#121212] border border-[#333] px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                      />
                      <button
                        onClick={() => handleSendReply(comment.id)}
                        disabled={!replyInputMap[comment.id]?.trim()}
                        className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <Send className="h-3 w-3" />
                        <span>Reply</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-gray-400 bg-[#1a1a1a] rounded-2xl border border-[#2d2d2d]">
            <MessageSquare className="h-8 w-8 mx-auto text-gray-600 mb-2" />
            <p className="text-sm font-semibold">No comments in this section.</p>
          </div>
        )}
      </div>
    </div>
  );
};
