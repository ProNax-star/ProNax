/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useState } from 'react';
import { 
  AlertTriangle, Shield, CheckCircle, XCircle, 
  Scissors, Music, VolumeX, FileText, Globe,
  MapPin, Clock, ExternalLink
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

interface CopyrightClaim {
  id: string;
  claim_type: 'audio' | 'visual' | 'manual';
  severity: 'warning' | 'block' | 'partial';
  status: 'active' | 'disputed' | 'resolved';
  matched_content_title?: string;
  matched_content_owner?: string;
  match_percentage?: number;
  detected_at: string;
  action_taken?: string;
  territory_restrictions?: string[];
  monetization_impact?: string;
}

interface VideoRow {
  id: string;
  title: string;
}

interface CopyrightClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: VideoRow;
  claims: CopyrightClaim[];
}

export function CopyrightClaimModal({ 
  open, 
  onOpenChange, 
  video, 
  claims 
}: CopyrightClaimModalProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (action: string, claimId: string) => {
    setActionLoading(action);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setActionLoading(null);
    
    toast({ 
      title: 'Action completed', 
      description: `${action} has been applied to this copyright claim.` 
    });
  };

  const activeClaims = claims.filter(c => c.status === 'active');
  const hasActiveClaims = activeClaims.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Copyright Claim Overview</DialogTitle>
          <DialogDescription>
            Review and take action on copyright claims for "{video.title}"
          </DialogDescription>
        </DialogHeader>

        {!hasActiveClaims ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold">No active claims</h3>
            <p className="text-sm text-muted-foreground text-center">
              This video has no active copyright claims.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Claim Overview Header */}
            <Card className="p-4 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-500 mb-2">
                    Copyright-protected content was found on this video
                  </h3>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3 h-3" />
                      <span>No impact to channel (This isn't a copyright strike)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      <span>Video blocked in some territories</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Claim Details */}
            {activeClaims.map((claim) => (
              <Card key={claim.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Claim Details</h4>
                    <div className="space-y-2 text-xs">
                      {claim.matched_content_title && (
                        <div>
                          <span className="text-muted-foreground">Track / Content:</span>{' '}
                          <span className="font-medium">{claim.matched_content_title}</span>
                        </div>
                      )}
                      {claim.matched_content_owner && (
                        <div>
                          <span className="text-muted-foreground">Artist / Owner:</span>{' '}
                          <span className="font-medium">{claim.matched_content_owner}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Claim Type:</span>
                        <Badge variant="outline" className="capitalize">
                          {claim.claim_type} Match
                        </Badge>
                        {claim.match_percentage && (
                          <span className="text-muted-foreground">•</span>
                        )}
                        {claim.match_percentage && (
                          <span className="font-medium">{claim.match_percentage.toFixed(0)}% match</span>
                        )}
                      </div>
                      {claim.territory_restrictions && claim.territory_restrictions.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Globe className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Blocked in:</span>
                          <span className="font-medium">{claim.territory_restrictions.join(', ')}</span>
                        </div>
                      )}
                      {claim.monetization_impact && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Monetization:</span>
                          <span className="font-medium">{claim.monetization_impact}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Detected: {new Date(claim.detected_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-border/40 pt-3">
                  <p className="text-xs font-semibold mb-2">Take Action</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction('trim', claim.id)}
                      disabled={actionLoading === 'trim'}
                      className="justify-start gap-2"
                    >
                      <Scissors className="w-4 h-4" />
                      <div className="text-left">
                        <div className="text-xs font-medium">Trim out segment</div>
                        <div className="text-[10px] text-muted-foreground">Cut out copyrighted portion</div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction('replace', claim.id)}
                      disabled={actionLoading === 'replace'}
                      className="justify-start gap-2"
                    >
                      <Music className="w-4 h-4" />
                      <div className="text-left">
                        <div className="text-xs font-medium">Replace song</div>
                        <div className="text-[10px] text-muted-foreground">Use royalty-free music</div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction('mute', claim.id)}
                      disabled={actionLoading === 'mute'}
                      className="justify-start gap-2"
                    >
                      <VolumeX className="w-4 h-4" />
                      <div className="text-left">
                        <div className="text-xs font-medium">Mute song</div>
                        <div className="text-[10px] text-muted-foreground">Mute only copyrighted audio</div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction('dispute', claim.id)}
                      disabled={actionLoading === 'dispute'}
                      className="justify-start gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      <div className="text-left">
                        <div className="text-xs font-medium">Dispute</div>
                        <div className="text-[10px] text-muted-foreground">If you own the rights</div>
                      </div>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {/* Additional Info */}
            <Card className="p-3 bg-muted/30 border-border/40">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                <p>
                  Learn more about copyright claims and how to resolve them in our{' '}
                  <a href="#" className="text-primary hover:underline">Help Center</a>.
                </p>
              </div>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
