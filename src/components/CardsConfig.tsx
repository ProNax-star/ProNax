import { useState } from 'react';
import { Plus, Trash2, Clock, Video, ListVideo, Link as LinkIcon, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface CardElement {
  id: string;
  type: 'video' | 'playlist' | 'link';
  targetId?: string;
  title: string;
  startTime: number; // seconds
  duration: number; // seconds to display (5-20)
  customMessage?: string;
}

interface CardsConfigProps {
  videoId?: string;
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  elements?: CardElement[];
  onElementsChange?: (elements: CardElement[]) => void;
  videoDuration?: number;
}

export function CardsConfig({
  enabled,
  onEnabledChange,
  elements = [],
  onElementsChange = () => {},
  videoDuration = 0,
}: CardsConfigProps) {
  const [newCard, setNewCard] = useState<Partial<CardElement>>({
    type: 'video',
    startTime: 10,
    duration: 10,
  });

  const addCard = () => {
    if (!newCard.type || !newCard.title) return;
    const card: CardElement = {
      id: `card-${Date.now()}`,
      type: newCard.type,
      targetId: newCard.targetId,
      title: newCard.title,
      startTime: newCard.startTime || 10,
      duration: newCard.duration || 10,
      customMessage: newCard.customMessage,
    };
    onElementsChange([...elements, card]);
    setNewCard({
      type: 'video',
      startTime: 10,
      duration: 10,
    });
  };

  const removeCard = (id: string) => {
    onElementsChange(elements.filter(el => el.id !== id));
  };

  const updateCard = (id: string, updates: Partial<CardElement>) => {
    onElementsChange(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary/10">
            <ListVideo className="w-4 h-4 text-secondary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Cards</h3>
            <p className="text-xs text-muted-foreground">Mid-video interactive cards</p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onEnabledChange}
        />
      </div>

      {enabled && (
        <>
          <div className="border border-border/40 rounded-xl p-4 space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider">Add Card</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={newCard.type}
                  onValueChange={(value: any) => setNewCard({ ...newCard, type: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="playlist">Playlist</SelectItem>
                    <SelectItem value="link">External Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Title</Label>
                <Input
                  value={newCard.title || ''}
                  onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                  placeholder="Card title"
                  className="mt-1"
                />
              </div>
              {(newCard.type === 'video' || newCard.type === 'playlist') && (
                <div>
                  <Label className="text-xs">Target ID</Label>
                  <Input
                    value={newCard.targetId || ''}
                    onChange={(e) => setNewCard({ ...newCard, targetId: e.target.value })}
                    placeholder="Video or Playlist ID"
                    className="mt-1"
                  />
                </div>
              )}
              {newCard.type === 'link' && (
                <div>
                  <Label className="text-xs">URL</Label>
                  <Input
                    value={newCard.targetId || ''}
                    onChange={(e) => setNewCard({ ...newCard, targetId: e.target.value })}
                    placeholder="https://example.com"
                    className="mt-1"
                  />
                </div>
              )}
              <div>
                <Label className="text-xs">Start Time (seconds)</Label>
                <Input
                  type="number"
                  min={0}
                  max={videoDuration || 9999}
                  value={newCard.startTime || 10}
                  onChange={(e) => setNewCard({ ...newCard, startTime: parseInt(e.target.value) || 10 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Duration (sec)</Label>
                <Input
                  type="number"
                  min={5}
                  max={20}
                  value={newCard.duration || 10}
                  onChange={(e) => setNewCard({ ...newCard, duration: parseInt(e.target.value) || 10 })}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Custom Message (optional)</Label>
                <Input
                  value={newCard.customMessage || ''}
                  onChange={(e) => setNewCard({ ...newCard, customMessage: e.target.value })}
                  placeholder="Check out this video!"
                  className="mt-1"
                />
              </div>
            </div>
            <Button onClick={addCard} size="sm" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Card
            </Button>
          </div>

          {elements.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider">Cards ({elements.length})</Label>
              {elements.map((card) => (
                <Card key={card.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground mt-1 cursor-move" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {card.type === 'video' && <Video className="w-4 h-4 text-primary" />}
                        {card.type === 'playlist' && <ListVideo className="w-4 h-4 text-secondary" />}
                        {card.type === 'link' && <LinkIcon className="w-4 h-4 text-accent" />}
                        <span className="text-sm font-medium truncate">{card.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>At {formatTime(card.startTime)}</span>
                        <span>•</span>
                        <span>{card.duration}s duration</span>
                      </div>
                      {card.customMessage && (
                        <p className="text-xs text-muted-foreground mt-1 italic">"{card.customMessage}"</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCard(card.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
