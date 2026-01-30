'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { createLocation, updateLocation, deleteLocation } from './actions';
import type { Location } from '@/db/schema';

interface LocationsListProps {
  initialLocations: Location[];
}

export function LocationsList({ initialLocations }: LocationsListProps) {
  const t = useTranslations('locations');
  const tCommon = useTranslations('common');

  const [locations, setLocations] = useState(initialLocations);
  const [isPending, startTransition] = useTransition();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '' });

  const handleAdd = () => {
    if (!formData.code.trim()) {
      toast.error(t('codeRequired'));
      return;
    }

    startTransition(async () => {
      await createLocation({ code: formData.code, name: formData.name || undefined });
      toast.success(tCommon('success'));
      setIsAddOpen(false);
      setFormData({ code: '', name: '' });
      // Refresh data
      window.location.reload();
    });
  };

  const handleUpdate = (id: string) => {
    if (!formData.code.trim()) {
      toast.error(t('codeRequired'));
      return;
    }

    startTransition(async () => {
      await updateLocation(id, { code: formData.code, name: formData.name || undefined });
      toast.success(tCommon('success'));
      setEditingId(null);
      setFormData({ code: '', name: '' });
      window.location.reload();
    });
  };

  const handleDelete = (id: string, code: string) => {
    if (!confirm(t('deleteConfirm', { code }))) return;

    startTransition(async () => {
      await deleteLocation(id);
      toast.success(tCommon('success'));
      setLocations(locations.filter(l => l.id !== id));
    });
  };

  const startEdit = (location: Location) => {
    setEditingId(location.id);
    setFormData({ code: location.code, name: location.name || '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              {t('add')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addLocation')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('code')} *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="A-01"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('name')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('namePlaceholder')}
                />
              </div>
              <Button onClick={handleAdd} disabled={isPending} className="w-full">
                {tCommon('save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {locations.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          {tCommon('noData')}
        </div>
      ) : (
        <div className="space-y-2">
          {locations.map((location) => (
            <Card key={location.id}>
              <CardContent className="flex items-center justify-between p-4">
                {editingId === location.id ? (
                  <div className="flex flex-1 gap-2">
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-24"
                    />
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => handleUpdate(location.id)} disabled={isPending}>
                      {tCommon('save')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      {tCommon('cancel')}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-mono font-medium">{location.code}</span>
                        {location.name && (
                          <span className="ml-2 text-sm text-muted-foreground">
                            {location.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(location)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(location.id, location.code)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
