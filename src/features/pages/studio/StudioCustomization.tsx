/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { Link } from 'react-router-dom';
import { ExternalLink, Image, Type, Layout } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useStudio } from './StudioLayout';

export default function StudioCustomization() {
  const { profile } = useStudio();

  const channelHandle = profile?.username || 'channel';
  const channelName = profile?.display_name || 'Your Channel';
  const initials = channelName.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-[#0f0f0f]">Channel customization</h1>
          <p className="text-sm text-[#606060] mt-1">Make your channel stand out with branding and layout</p>
        </div>
        <Link
          to={`/channel/${channelHandle}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#e5e5e5] text-sm text-[#0f0f0f] hover:bg-white transition"
        >
          View channel <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Channel preview */}
      <div className="studio-card overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-cyan-500 to-blue-500" />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-8">
            <Avatar className="w-20 h-20 border-4 border-white">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-cyan-500 text-white text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="pb-1">
              <h2 className="text-xl font-medium text-[#0f0f0f]">{channelName}</h2>
              <p className="text-sm text-[#606060]">@{channelHandle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customization options */}
      <div className="grid grid-cols-1 md:grid-cols--2 gap-3">
        {[
          {
            icon: Image,
            title: 'Profile picture',
            desc: 'Your profile picture appears next to your videos and comments',
            action: 'Change on profile',
            to: '/profile',
          },
          {
            icon: Layout,
            title: 'Banner image',
            desc: 'This is your channel\'s banner image on all devices',
            action: 'Change on profile',
            to: '/profile',
          },
          {
            icon: Type,
            title: 'Basic info',
            desc: 'Tell viewers about your channel. Edit your description and links',
            action: 'Edit profile',
            to: '/profile',
          },
        ].map((item) => (
          <div key={item.title} className="studio-card p-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#f2f2f2] flex items-center justify-center shrink-0">
              <item.icon className="w-5 h-5 text-[#606060]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-[#0f0f0f]">{item.title}</h3>
              <p className="text-xs text-[#606060] mt-1">{item.desc}</p>
              <Link to={item.to} className="text-xs text-cyan-500 mt-2 inline-block hover:underline">
                {item.action} →
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="studio-card p-4">
        <h3 className="text-sm font-medium text-[#0f0f0f] mb-2">Layout</h3>
        <p className="text-xs text-[#606060]">
          Featured sections and channel trailer customization coming soon. Edit your channel layout from your profile page for now.
        </p>
      </div>
    </div>
  );
}
