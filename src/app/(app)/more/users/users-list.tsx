'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, User as UserIcon, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { createUser, updateUser, deleteUser } from './actions';
import type { User } from '@/db/schema';

// User type without passwordHash (for security - server never sends it)
type SafeUser = Omit<User, 'passwordHash'>;

interface UsersListProps {
  initialUsers: SafeUser[];
  currentUserId: string;
}

export function UsersList({ initialUsers, currentUserId }: UsersListProps) {
  const t = useTranslations('users');
  const tCommon = useTranslations('common');

  const [users, setUsers] = useState(initialUsers);
  const [isPending, startTransition] = useTransition();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'operator' as 'admin' | 'operator',
  });

  const resetForm = () => {
    setFormData({ username: '', password: '', name: '', role: 'operator' });
  };

  const handleAdd = () => {
    if (!formData.username || !formData.password || !formData.name) {
      toast.error(t('fieldsRequired'));
      return;
    }

    startTransition(async () => {
      try {
        await createUser(formData);
        toast.success(tCommon('success'));
        setIsAddOpen(false);
        resetForm();
        window.location.reload();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : tCommon('error');
        toast.error(message);
      }
    });
  };

  const handleUpdate = () => {
    if (!editingUser || !formData.name) {
      toast.error(t('fieldsRequired'));
      return;
    }

    startTransition(async () => {
      try {
        await updateUser(editingUser.id, {
          name: formData.name,
          role: formData.role,
          password: formData.password || undefined,
        });
        toast.success(tCommon('success'));
        setEditingUser(null);
        resetForm();
        window.location.reload();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : tCommon('error');
        toast.error(message);
      }
    });
  };

  const handleDelete = (user: SafeUser) => {
    if (user.id === currentUserId) {
      toast.error(t('cannotDeleteSelf'));
      return;
    }
    if (!confirm(t('deleteConfirm', { name: user.name }))) return;

    startTransition(async () => {
      try {
        await deleteUser(user.id);
        toast.success(tCommon('success'));
        setUsers(users.filter(u => u.id !== user.id));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : tCommon('error');
        toast.error(message);
      }
    });
  };

  const startEdit = (user: SafeUser) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      name: user.name,
      role: user.role as 'admin' | 'operator',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              {t('add')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addUser')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('username')} *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('password')} *</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('displayName')} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('role')}</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as 'admin' | 'operator' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operator">{t('roleOperator')}</SelectItem>
                    <SelectItem value="admin">{t('roleAdmin')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} disabled={isPending} className="w-full">
                {tCommon('save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) { setEditingUser(null); resetForm(); }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editUser')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('username')}</Label>
              <Input value={formData.username} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>{t('newPassword')}</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t('leaveBlank')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('displayName')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('role')}</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as 'admin' | 'operator' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">{t('roleOperator')}</SelectItem>
                  <SelectItem value="admin">{t('roleAdmin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUpdate} disabled={isPending} className="w-full">
              {tCommon('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {user.role === 'admin' ? (
                  <Shield className="h-5 w-5 text-amber-500" />
                ) : (
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{user.name}</span>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? t('roleAdmin') : t('roleOperator')}
                    </Badge>
                    {user.id === currentUserId && (
                      <Badge variant="outline">{t('you')}</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">@{user.username}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => startEdit(user)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(user)}
                  disabled={user.id === currentUserId}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
