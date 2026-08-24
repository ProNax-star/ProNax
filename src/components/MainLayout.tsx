/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { Outlet, useLocation } from '@tanstack/react-router';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav'; // <--- MobileNav import kar lein
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export function MainLayout() {
  const location = useLocation();
  const isShortsPage = location.pathname.includes('/shorts');
  // Admin console renders its own full-screen shell — no user app header/sidebar/bottom nav.
  const isStandalonePage = /^\/admin(\/|$)/.test(location.pathname);

  if (isStandalonePage) {
    return (
      <div className="min-h-screen w-full bg-black text-white">
        <Outlet />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-white relative">
        
        {/* Top Header */}
        {!isShortsPage && (
          <div className="w-full flex-shrink-0 z-30">
            <AppHeader onSidebarToggle={() => {}} />
          </div>
        )}

        {/* Desktop Header Only for Shorts Page */}
        {isShortsPage && (
          <div className="hidden md:block w-full flex-shrink-0 z-30">
            <AppHeader onSidebarToggle={() => {}} />
          </div>
        )}

        {/* Flex Wrapper for Sidebar & Content */}
        <div className={`flex flex-1 w-full overflow-hidden relative ${isShortsPage ? 'h-[100dvh] md:h-[calc(100vh-64px)]' : 'h-[calc(100vh-104px)] md:h-[calc(100vh-64px)]'}`}>
          
          {/* App Sidebar Container (Desktop) */}
          <div className="flex-shrink-0 relative z-20">
            <AppSidebar />
          </div>

          {/* Main Content Area */}
          <SidebarInset 
            className={`flex-1 min-w-0 h-full overflow-y-auto bg-black !m-0 !rounded-none ${
              isShortsPage ? '!p-0' : 'px-0 py-2 md:p-6 pb-20 md:pb-6'
            }`}
          >
            <div className={`w-full h-full ${isShortsPage ? 'max-w-none' : 'max-w-[1600px] mx-auto'}`}>
              <Outlet />
            </div>
          </SidebarInset>

        </div>

        {/* Mobile Bottom Navigation Bar */}
        <MobileNav />
      </div>
    </SidebarProvider>
  );
}