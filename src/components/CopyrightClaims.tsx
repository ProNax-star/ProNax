import { useState } from 'react';
import { AlertTriangle, Shield, CheckCircle, XCircle, Clock, FileText, ExternalLink, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { disputeCopyrightClaim, releaseCopyrightClaim } from '@/lib/copyrightDetection';
import { supabase } from '@/integrations/supabase/loose';

interface CopyrightClaim {
  id: string;
  claim_type: string;
  severity: string;
  status: string;
  detected_at: string;
  resolved_at: string | null;
  action_taken: string;
  match_percentage?: number;
  matched_content_title?: string;
  matched_content_owner?: string;
  dispute_reason?: string;
  dispute_evidence?: string[];
}

interface CopyrightClaimsProps {
  videoId: string;
  videoTitle: string;
  claims: CopyrightClaim[];
  onClaimsUpdate?: () => void;
  isOwner?: boolean;
}

export function CopyrightClaims({ 
  videoId, 
  videoTitle, 
  claims, 
  onClaimsUpdate, 
  isOwner = true 
}: CopyrightClaimsProps) {
  const [disputing, setDisputing] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState('');
  const [showDisputeDialog, setShowDisputeDialog] = useState<string | null>(null);

  const handleDispute = async (claimId: string) => {
    if (!disputeReason.trim()) {
      toast({ title: 'Dispute reason required', description: 'Please provide a reason for your dispute.', variant: 'destructive' });
      return;
    }

    setDisputing(claimId);
    const evidence = disputeEvidence ? disputeEvidence.split('\n').filter(Boolean) : undefined;
    const success = await disputeCopyrightClaim(claimId, disputeReason.trim(), evidence);
    setDisputing(null);

    if (success) {
      toast({ title: 'Dispute submitted', description: 'Your dispute has been submitted for review.' });
      setDisputeReason('');
      setDisputeEvidence('');
      setShowDisputeDialog(null);
      onClaimsUpdate?.();
    } else {
      toast({ title: 'Dispute failed', description: 'Failed to submit dispute. Please try again.', variant: 'destructive' });
    }
  };

  const handleRelease = async (claimId: string) => {
    const success = await releaseCopyrightClaim(claimId);
    if (success) {
      toast({ title: 'Claim released', description: 'The copyright claim has been released.' });
      onClaimsUpdate?.();
    } else {
      toast({ title: 'Release failed', description: 'Failed to release claim. Please try again.', variant: 'destructive' });
    }
  };

  if (claims.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
        <CheckCircle className="w-5 h-5 text-emerald-400" />
        <div>
          <p className="text-sm font-semibold text-emerald-400">No copyright issues</p>
          <p className="text-xs text-muted-foreground">This video has no active copyright claims.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {claims.map((claim) => (
        <div
          key={claim.id}
          className={`p-4 rounded-xl border ${
            claim.status === 'active'
              ? claim.severity === 'critical'
                ? 'bg-destructive/10 border-destructive/30'
                : claim.severity === 'block'
                  ? 'bg-orange-500/10 border-orange-500/30'
                  : 'bg-amber-500/10 border-amber-500/30'
              : claim.status === 'disputed'
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-emerald-500/10 border-emerald-500/30'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${
              claim.status === 'active'
                ? claim.severity === 'critical'
                  ? 'bg-destructive/20 text-destructive'
                  : 'bg-amber-500/20 text-amber-400'
                : claim.status === 'disputed'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {claim.status === 'active' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : claim.status === 'disputed' ? (
                <Clock className="w-5 h-5" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  claim.severity === 'critical' ? 'bg-destructive/20 text-destructive' :
                  claim.severity === 'block' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {claim.severity.toUpperCase()}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  claim.status === 'active' ? 'bg-primary/20 text-primary' :
                  claim.status === 'disputed' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {claim.status.toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {claim.claim_type.toUpperCase()}
                </span>
              </div>

              {claim.matched_content_title && (
                <p className="text-sm font-medium text-foreground mb-1">
                  Matched: {claim.matched_content_title}
                </p>
              )}
              {claim.matched_content_owner && (
                <p className="text-xs text-muted-foreground mb-2">
                  Owner: {claim.matched_content_owner}
                </p>
              )}
              {claim.match_percentage && (
                <p className="text-xs text-muted-foreground mb-2">
                  Match: {claim.match_percentage.toFixed(0)}%
                </p>
              )}

              {claim.action_taken && claim.action_taken !== 'none' && (
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Action: {claim.action_taken}
                  </span>
                </div>
              )}

              {claim.dispute_reason && (
                <div className="mt-2 p-2 rounded bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-1">Dispute reason:</p>
                  <p className="text-xs text-foreground">{claim.dispute_reason}</p>
                </div>
              )}

              {claim.dispute_evidence && claim.dispute_evidence.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Evidence:</p>
                  <div className="flex flex-wrap gap-1">
                    {claim.dispute_evidence.map((evidence, idx) => (
                      <a
                        key={idx}
                        href={evidence}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        <FileText className="w-3 h-3" />
                        Evidence {idx + 1}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground mt-2">
                Detected: {new Date(claim.detected_at).toLocaleString()}
                {claim.resolved_at && ` • Resolved: ${new Date(claim.resolved_at).toLocaleString()}`}
              </p>

              {isOwner && claim.status === 'active' && (
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDisputeDialog(claim.id)}
                    className="text-xs"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Dispute
                  </Button>
                </div>
              )}

              {isOwner && claim.status === 'disputed' && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Under review
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Dispute Dialog */}
      <Dialog open={!!showDisputeDialog} onOpenChange={() => setShowDisputeDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Dispute Copyright Claim</DialogTitle>
            <DialogDescription>
              Provide a reason and evidence to dispute this copyright claim on "{videoTitle}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="dispute-reason" className="text-sm">Dispute Reason</Label>
              <Textarea
                id="dispute-reason"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Explain why you believe this claim is incorrect..."
                rows={3}
                className="mt-1.5 bg-input/60 resize-none"
                maxLength={1000}
              />
              <p className="text-[10px] text-muted-foreground mt-1">{disputeReason.length}/1000</p>
            </div>
            <div>
              <Label htmlFor="dispute-evidence" className="text-sm">Evidence URLs (optional)</Label>
              <Textarea
                id="dispute-evidence"
                value={disputeEvidence}
                onChange={(e) => setDisputeEvidence(e.target.value)}
                placeholder="Enter URLs to evidence (one per line)..."
                rows={3}
                className="mt-1.5 bg-input/60 resize-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Provide links to licenses, permissions, or other supporting documents.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDisputeDialog(null)} disabled={!!disputing}>
              Cancel
            </Button>
            <Button 
              onClick={() => showDisputeDialog && handleDispute(showDisputeDialog)} 
              disabled={!!disputing}
              className="gradient-primary text-primary-foreground glow-primary"
            >
              {disputing ? 'Submitting...' : 'Submit Dispute'}
              <Send className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
