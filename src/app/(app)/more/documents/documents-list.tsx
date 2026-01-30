'use client';

import { useState, useEffect, useTransition } from 'react';
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
import { Plus, Check, Trash2, FileText, ShoppingCart, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { getDocuments, createDocument, updateDocumentStatus, deleteDocument } from './actions';
import type { Document } from '@/db/schema';

const typeConfig = {
  PO: { icon: FileText, color: 'bg-blue-100 text-blue-800', label: 'Purchase Order' },
  ORDER: { icon: ShoppingCart, color: 'bg-green-100 text-green-800', label: 'Sales Order' },
  RMA: { icon: Undo2, color: 'bg-red-100 text-red-800', label: 'Return' },
};

interface DocumentsListProps {
  initialDocuments: Document[];
}

export function DocumentsList({ initialDocuments }: DocumentsListProps) {
  const t = useTranslations('documents');
  const tCommon = useTranslations('common');

  const [docs, setDocs] = useState(initialDocuments);
  const [isPending, startTransition] = useTransition();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    type: 'PO' as 'PO' | 'ORDER' | 'RMA',
    partyName: '',
    remark: '',
  });

  useEffect(() => {
    getDocuments(typeFilter, statusFilter).then(setDocs);
  }, [typeFilter, statusFilter]);

  const handleAdd = () => {
    startTransition(async () => {
      await createDocument(formData);
      toast.success(tCommon('success'));
      setIsAddOpen(false);
      setFormData({ type: 'PO', partyName: '', remark: '' });
      const updated = await getDocuments(typeFilter, statusFilter);
      setDocs(updated);
    });
  };

  const handleComplete = (id: string) => {
    startTransition(async () => {
      await updateDocumentStatus(id, 'completed');
      toast.success(tCommon('success'));
      const updated = await getDocuments(typeFilter, statusFilter);
      setDocs(updated);
    });
  };

  const handleDelete = (doc: Document) => {
    if (!confirm(t('deleteConfirm', { docNo: doc.docNo }))) return;

    startTransition(async () => {
      await deleteDocument(doc.id);
      toast.success(tCommon('success'));
      setDocs(docs.filter(d => d.id !== doc.id));
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  return (
    <div className="space-y-4">
      {/* Filters and Add */}
      <div className="flex gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder={t('type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allTypes')}</SelectItem>
            <SelectItem value="PO">{t('typePO')}</SelectItem>
            <SelectItem value="ORDER">{t('typeOrder')}</SelectItem>
            <SelectItem value="RMA">{t('typeRMA')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder={t('status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatus')}</SelectItem>
            <SelectItem value="pending">{t('statusPending')}</SelectItem>
            <SelectItem value="completed">{t('statusCompleted')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              {t('add')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addDocument')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('type')}</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as 'PO' | 'ORDER' | 'RMA' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PO">{t('typePO')}</SelectItem>
                    <SelectItem value="ORDER">{t('typeOrder')}</SelectItem>
                    <SelectItem value="RMA">{t('typeRMA')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('partyName')}</Label>
                <Input
                  value={formData.partyName}
                  onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                  placeholder={t('partyNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('remark')}</Label>
                <Input
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                />
              </div>
              <Button onClick={handleAdd} disabled={isPending} className="w-full">
                {tCommon('save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {docs.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          {tCommon('noData')}
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => {
            const config = typeConfig[doc.type as keyof typeof typeConfig];
            const Icon = config?.icon || FileText;

            return (
              <Card key={doc.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={`rounded p-2 ${config?.color || 'bg-gray-100'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{doc.docNo}</span>
                        <Badge variant={doc.status === 'completed' ? 'default' : 'secondary'}>
                          {doc.status === 'completed' ? t('statusCompleted') : t('statusPending')}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {doc.partyName && <span>{doc.partyName} - </span>}
                        {formatDate(doc.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {doc.status === 'pending' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleComplete(doc.id)}
                        title={t('markComplete')}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(doc)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
