import { useState } from 'react';
import { Plus, Trash2, Clock, Video, Link as LinkIcon, ExternalLink, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface EndScreenElement {
  id: string;
  type: 'video' | 'playlist' | 'channel' | 'link';
  targetId?: string;
  title: string;
  startTime: number; // seconds before end
  duration: number; // seconds to display (5-20)
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

interface EndScreenConfigProps {
  videoId?: string;
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  elements?: EndScreenElement[];
  onElementsChange?: (elements: EndScreenElement[]) => void;
  videoDuration?: number;
}

export function EndScreenConfig({
  enabled,
  onEnabledChange,
  elements = [],
  onElementsChange = () => {},
  videoDuration = 0,
}: EndScreenConfigProps) {
  const [newElement, setNewElement] = useState<Partial<EndScreenElement>>({
    type: 'video',
    startTime: 20,
    duration: 10,
    position: 'bottom-right',
  });

  const addElement = () => {
    if (!newElement.type || !newElement.title) return;
    const element: EndScreenElement = {
      id: `end-${Date.now()}`,
      type: newElement.type,
      targetId: newElement.targetId,
      title: newElement.title,
      startTime: newElement.startTime || 20,
      duration: newElement.duration || 10,
      position: newElement.position || 'bottom-right',
    };
    onElementsChange([...elements, element]);
    setNewElement({
      type: 'video',
      startTime: 20,
      duration: 10,
      position: 'bottom-right',
    });
  };

  const removeElement = (id: string) => {
    onElementsChange(elements.filter(el => el.id !== id));
  };

  const updateElement = (id: string, updates: Partial<EndScreenElement>) => {
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
          <div className="p-2 rounded-lg bg-primary/10">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">End Screen</h3>
            <p className="text-xs text-muted-foreground">Interactive overlays in last 5-20 seconds</p>
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
            <Label className="text-xs font-semibold uppercase tracking-wider">Add Element</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={newElement.type}
                  onValueChange={(value: any) => setNewElement({ ...newElement, type: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="playlist">Playlist</SelectItem>
                    <SelectItem value="channel">Channel</SelectItem>
                    <SelectItem value="link">External Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Title</Label>
                <Input
                  value={newElement.title || ''}
                  onChange={(e) => setNewElement({ ...newElement, title: e.target.value })}
                  placeholder="Element title"
                  className="mt-1"
                />
              </div>
              {(newElement.type === 'video' || newElement.type === 'playlist') && (
                <div>
                  <Label className="text-xs">Target ID</Label>
                  <Input
                    value={newElement.targetId || ''}
                    onChange={(e) => setNewElement({ ...newElement, targetId: e.target.value })}
                    placeholder="Video or Playlist ID"
                    className="mt-1"
                  />
                </div>
              )}
              {newElement.type === 'link' && (
                <div>
                  <Label className="text-xs">URL</Label>
                  <Input
                    value={newElement.targetId || ''}
                    onChange={(e) => setNewElement({ ...newElement, targetId: e.target.value })}
                    placeholder="https://example.com"
                    className="mt-1"
                  />
                </div>
              )}
              <div>
                <Label className="text-xs">Start Time (sec before end)</Label>
                <Input
                  type="number"
                  min={5}
                  max={20}
                  value={newElement.startTime || 20}
                  onChange={(e) => setNewElement({ ...newElement, startTime: parseInt(e.target.value) || 20 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Duration (sec)</Label>
                <Input
                  type="number"
                  min={5}
                  max={20}
                  value={newElement.duration || 10}
                  onChange={(e) => setNewElement({ ...newElement, duration: parseInt(e.target.value) || 10 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Position</Label>
                <Select
                  value={newElement.position}
                  onValueChange={(value: any) => setNewElement({ ...newElement, position: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top-left">Top Left</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={addElement} size="sm" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Element
            </Button>
          </div>

          {elements.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider">Elements ({elements.length})</Label>
              {elements.map((element) => (
                <Card key={element.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground mt-1 cursor-move" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {element.type === 'video' && <Video className="w-4 h-4 text-primary" />}
                        {element.type === 'playlist' && <Video className="w-4 h-4 text-secondary" />}
                        {element.type === 'channel' && <Video className="w-4 h-4 text-accent" />}
                        {element.type === 'link' && <LinkIcon className="w-4 h-4 text-primary" />}
                        <span className="text-sm font-medium truncate">{element.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(element.startTime)} before end</span>
                        <span>•</span>
                        <span>{element.duration}s duration</span>
                        <span>•</span>
                        <span className="capitalize">{element.position.replace('-', ' ')}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeElement(element.id)}
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
