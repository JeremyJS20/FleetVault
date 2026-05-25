import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus } from 'lucide-react';
import { useAuth } from '../../Infrastructure/auth.context.js';
import { usePolicies, useUpdatePolicy, useCreatePolicy } from '../../Infrastructure/hooks/useCatalog.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Button } from '../components/ui/Button.js';
import { DataTable } from '../components/ui/DataTable.js';
import { FormModal } from '../components/ui/FormModal.js';
import { FormField } from '../components/ui/FormField.js';
import { Toast } from '../components/ui/Toast.js';

export const RentalPolicyPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRATOR';

  const { data: policies = [], isLoading } = usePolicies();
  const updateMutation = useUpdatePolicy();
  const createMutation = useCreatePolicy();

  const [editingPolicy, setEditingPolicy] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editKey, setEditKey] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleOpenEdit = (policy: any) => {
    setEditingPolicy(policy);
    setIsCreating(false);
    setEditKey(policy.key);
    setEditTitle(policy.title);
    setEditContent(policy.content);
    setEditIsActive(policy.isActive);
    setIsFormOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingPolicy(null);
    setIsCreating(true);
    setEditKey('');
    setEditTitle('');
    setEditContent('');
    setEditIsActive(true);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isCreating) {
        await createMutation.mutateAsync({
          data: { key: editKey, title: editTitle, content: editContent, isActive: editIsActive },
        });
        setToast({ message: t('rentalPolicy.createdSuccess'), type: 'success' });
      } else if (editingPolicy) {
        await updateMutation.mutateAsync({
          id: editingPolicy.id,
          data: { title: editTitle, content: editContent, isActive: editIsActive },
        });
        setToast({ message: t('rentalPolicy.updatedSuccess'), type: 'success' });
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setToast({ message: err.message || t('rentalPolicy.updateFailed'), type: 'error' });
    }
  };

  const isPending = updateMutation.isPending || createMutation.isPending;

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'key',
      header: t('rentalPolicy.key'),
      cell: (info) => <span className="font-mono text-xs text-fg-tertiary">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'title',
      header: t('rentalPolicy.titleLabel'),
      cell: (info) => <span className="font-bold text-fg-main">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'content',
      header: t('rentalPolicy.content'),
      cell: (info) => (
        <span className="text-xs text-fg-secondary line-clamp-2 max-w-xs">
          {(info.getValue() as string)?.slice(0, 200)}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: t('rentalPolicy.active'),
      cell: (info) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            info.getValue()
              ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25'
              : 'text-red-500 bg-red-500/10 border-red-500/25'
          }`}
        >
          {info.getValue() ? t('common.active') : t('common.inactive')}
        </span>
      ),
    },
  ];

  if (isAdmin) {
    columns.push({
      id: 'actions',
      header: t('common.actions'),
      cell: (info) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleOpenEdit(info.row.original)}
          className="!p-2.5 rounded-xl"
        >
          <Pencil size={15} />
        </Button>
      ),
    });
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <PageHeader
        title={t('rentalPolicy.title')}
        description={t('rentalPolicy.subtitle')}
      >
        {isAdmin && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs"
          >
            <Plus size={13} />
            <span>{t('rentalPolicy.create')}</span>
          </Button>
        )}
      </PageHeader>

      <DataTable
        columns={columns}
        data={policies}
        isLoading={isLoading}
        pageCount={1}
        pageIndex={0}
        pageSize={policies.length || 10}
        onPageChange={() => {}}
      />

      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={isCreating ? t('rentalPolicy.createTitle') : t('rentalPolicy.editTitle', { title: editingPolicy?.title || '' })}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {isCreating && (
            <FormField label={t('rentalPolicy.key')} required>
              <input
                type="text"
                value={editKey}
                onChange={(e) => setEditKey(e.target.value)}
                className="w-full text-xs min-h-[44px] px-3 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main focus:outline-none focus:border-accent-primary transition-all font-mono"
                placeholder="ej: cobertura, combustible, ..."
                required
              />
            </FormField>
          )}

          <FormField label={t('rentalPolicy.titleLabel')} required>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-xs min-h-[44px] px-3 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main focus:outline-none focus:border-accent-primary transition-all"
              required
            />
          </FormField>

          <FormField label={t('rentalPolicy.contentLabel')} required>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full text-xs min-h-[160px] px-3 py-3 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main focus:outline-none focus:border-accent-primary transition-all resize-y font-mono"
              required
            />
          </FormField>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-border-surface/45 bg-bg-inset text-accent-primary focus:ring-accent-primary"
            />
            <span className="text-sm font-semibold text-fg-secondary">{t('rentalPolicy.active')}</span>
          </label>

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)} type="button">
              {t('common.cancel')}
            </Button>
            <Button variant="primary" type="submit" isLoading={isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </FormModal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default RentalPolicyPage;
