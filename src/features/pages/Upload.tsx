import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadModal } from '@/components/UploadModal';
import { Button } from '@/components/ui/button';
import { UploadCloud, ArrowLeft, Sparkles } from 'lucide-react';

export default function UploadPage() {
  const [modalOpen, setModalOpen] = useState(true);
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/studio');
  };

  return (
    <div className="min-h-screen bg-[#07080c] text-white px-4 pb-20 sm:p-6 md:p-8 flex flex-col items-center justify-center relative overflow-hidden [perspective:1000px]">
      {/* Background Ambient Neon Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-xl w-full text-center space-y-6 bg-[#0d0f18]/85 border border-cyan-500/30 p-6 sm:p-8 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.15)] backdrop-blur-2xl relative z-10 holo-sweep">
        <div className="w-16 h-16 bg-gradient-to-br from-red-600/20 to-cyan-500/20 border border-cyan-400/40 rounded-2xl flex items-center justify-center mx-auto text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
          <UploadCloud className="w-8 h-8 text-cyan-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            PRO NAX Studio Publishing Wizard
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto leading-relaxed">
            Upload, auto-generate dynamic frame thumbnails, run real-time Content ID copyright scans, and manage monetization & ad suitability self-certification.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={() => setModalOpen(true)}
            className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-cyan-600 hover:from-red-500 hover:to-cyan-500 text-white font-bold px-7 py-3 rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.3)] border border-cyan-300/40 min-h-[44px] active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Launch 3-Step Wizard
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/studio')}
            className="w-full sm:w-auto border-cyan-500/30 text-cyan-200 hover:bg-cyan-950/40 font-semibold px-6 py-3 rounded-xl min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Creator Studio
          </Button>
        </div>
      </div>

      <UploadModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) navigate('/studio');
        }}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
