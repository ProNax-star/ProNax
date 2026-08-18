import { useEffect } from "react";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { ProfileMenu } from "@/components/ProfileMenu";
import { SmartSearch } from "@/components/SmartSearch";
import { AdBlockPopup } from "@/components/AdBlockPopup";
import { useAdBlockDetector } from "@/hooks/useAdBlockDetector";
import { NotificationsBell } from "@/components/NotificationsBell";
import { EngineBoundary } from "@/components/EngineBoundary";
import { BanWatchdog } from "@/components/BanWatchdog";
import { InstallButton, InstallPrompt } from "@/components/InstallPrompt";
import { getPerfMode } from "@/hooks/usePerfMode";
import { AdSlot } from "@/components/AdSlot";

export function AppShell() {
  const adBlock = useAdBlockDetector();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isShortsRoute = pathname.startsWith("/shorts");
  const isStudioRoute = pathname.startsWith("/studio") || pathname.startsWith("/pronax-studio");

  useEffect(() => {
    getPerfMode();
  }, []);

  useEffect(() => {
    void import("@/lib/analyticsBus").then((m) => m.analyticsBus.init());
  }, []);

  return (
    <>
      <BanWatchdog />
      <AdBlockPopup
        visible={adBlock.open}
        onDismiss={adBlock.dismiss}
        onRecheck={adBlock.recheck}
        onActivatePremium={adBlock.activatePremium}
      />
      <InstallPrompt />
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          {!isStudioRoute && <AppSidebar />}
          <div className="flex-1 flex flex-col min-w-0">
            {!isStudioRoute && (
              <div className="lg:hidden sticky top-0 z-50 glass-strong border-b border-border/30 h-16 flex items-center justify-between px-4 gap-3">
                <div className="flex items-center gap-3 shrink-0">
                  <SidebarTrigger aria-label="Toggle menu" className="text-foreground p-2 rounded-lg hover:bg-muted/20 transition-colors">
                    <Menu className="w-5 h-5" />
                  </SidebarTrigger>
                  <span className="text-sm font-display font-bold text-primary text-glow tracking-wide">PRO NAX</span>
                </div>
                <div className="flex-1 min-w-0 max-w-[200px]">
                  <SmartSearch />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <InstallButton compact />
                  <EngineBoundary name="notifications" silent>
                    <NotificationsBell />
                  </EngineBoundary>
                  <ProfileMenu />
                </div>
              </div>
            )}

            {!isStudioRoute && (
              <div className="hidden lg:flex sticky top-0 z-40 h-12 items-center justify-between px-4 gap-2 border-b border-border/20 glass-strong">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <SidebarTrigger aria-label="Toggle sidebar" className="text-foreground shrink-0">
                    <Menu className="w-5 h-5" />
                  </SidebarTrigger>
                  <SmartSearch />
                </div>
                <div className="flex items-center gap-2">
                  <InstallButton />
                  <EngineBoundary name="notifications" silent>
                    <NotificationsBell />
                  </EngineBoundary>
                  <ProfileMenu />
                </div>
              </div>
            )}


            <main id="main-content" role="main" className="flex-1 flex flex-col min-w-0">
              <Outlet />
            </main>

            {!isShortsRoute && !isStudioRoute && (
              <AdSlot
                slot="floating_anchor"
                className="fixed bottom-0 left-0 right-0 z-40 my-0 border-t border-cyan-500/30 bg-black/95 backdrop-blur-md shadow-2xl"
              />
            )}
            {!isShortsRoute && !isStudioRoute && <MobileNav />}
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
