import { Outlet, useLocation } from '@tanstack/react-router';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav'; // <--- MobileNav import kar lein
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export function MainLayout() {
  const location = useLocation();
  const isShortsPage = location.pathname.includes('/shorts');

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
        <div className={`flex flex-1 w-full overflow-hidden relative ${isShortsPage ? 'h-[calc(100vh-48px)] md:h-[calc(100vh-64px)]' : 'h-[calc(100vh-112px)] md:h-[calc(100vh-64px)]'}`}>
          
          {/* App Sidebar Container (Desktop) */}
          <div className="flex-shrink-0 relative z-20">
            <AppSidebar />
          </div>

          {/* Main Content Area */}
          <SidebarInset 
            className={`flex-1 min-w-0 h-full overflow-y-auto bg-black !m-0 !rounded-none ${
              isShortsPage ? '!p-0' : 'p-4 md:p-6 pb-16 md:pb-6'
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