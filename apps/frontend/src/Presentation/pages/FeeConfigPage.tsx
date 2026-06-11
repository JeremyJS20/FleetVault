import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFeeConfigs, useUpdateFeeConfig, useCreateDamageType, useToggleDamageTypeStatus } from '../../Infrastructure/hooks/useCatalog.js';
import { apiClient } from '../../Infrastructure/api-client.js';
import { formatCurrency } from '@rent-car/common';
import { PageHeader } from '../components/ui/PageHeader.js';
import { FormModal } from '../components/ui/FormModal.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { ToggleSwitch } from '../components/ui/ToggleSwitch.js';
import { Toast } from '../components/ui/Toast.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { Plus, Pencil } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';

export const FeeConfigPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: fees = [], isLoading } = useFeeConfigs();
  const updateFeeConfig = useUpdateFeeConfig();
  const createDamageType = useCreateDamageType();
  const toggleDamageTypeStatus = useToggleDamageTypeStatus();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editFee, setEditFee] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const damageFees = fees.filter((f: any) => f.damageTypeId);
  const otherFees = fees.filter((f: any) => !f.damageTypeId);

  const handleOtherToggle = async (fee: any) => {
    try {
      await updateFeeConfig.mutateAsync({ id: fee.id, data: { isActive: !(fee.isActive ?? true) } });
      setToast({ message: t('common.statusUpdated'), type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || t('common.statusUpdateFailed'), type: 'error' });
    }
  };

  const handleDamageToggle = async (fee: any) => {
    try {
      await toggleDamageTypeStatus.mutateAsync({ id: fee.damageTypeId });
      setToast({ message: t('common.statusUpdated'), type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || t('common.statusUpdateFailed'), type: 'error' });
    }
  };

  const openEdit = (fee: any) => {
    setEditFee(fee);
    setEditAmount(String(fee.amount));
  };

  const closeEdit = () => {
    setEditFee(null);
    setEditAmount('');
  };

  const handleSave = async () => {
    if (!editFee) return;
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) return;
    try {
      await updateFeeConfig.mutateAsync({ id: editFee.id, data: { amount } });
      setToast({ message: t('common.statusUpdated'), type: 'success' });
      closeEdit();
    } catch (err: any) {
      setToast({ message: err.message || t('common.operationFailed'), type: 'error' });
    }
  };

  const resetCreate = () => {
    setShowCreate(false);
    setNewName('');
    setNewDesc('');
    setNewAmount('');
  };

  const handleCreate = async () => {
    if (!newName) return;
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount < 0) return;
    const autoKey = newName.toUpperCase().replace(/\s+/g, '_');
    try {
      const dt = await createDamageType.mutateAsync({ data: { name: newName, key: autoKey, description: newDesc || null } });
      await apiClient(`/api/damage-types/${dt.id}/fee`, {
        method: 'POST',
        body: JSON.stringify({ amount, damageTypeId: dt.id }),
      });
      setToast({ message: t('common.operationSuccess'), type: 'success' });
      resetCreate();
    } catch (err: any) {
      setToast({ message: err.message || t('common.operationFailed'), type: 'error' });
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full animate-fade-in">
      <PageHeader
        title={t('feeConfig.title')}
        description={t('feeConfig.subtitle')}
      />

      {/* Damage Fees section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-fg-main uppercase tracking-wider">
            {t('feeConfig.damageFeesTitle')}
          </h3>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs"><Plus size={13} /><span>{t('common.create')}</span></Button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border-surface/30 bg-bg-card/45 backdrop-blur-md">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-surface bg-bg-inset/40">
                <th className="text-left p-4 text-sm font-bold uppercase tracking-wider text-fg-secondary">{t('feeConfig.damageFeesTitle')}</th>
                <th className="text-right p-4 text-sm font-bold uppercase tracking-wider text-fg-secondary">{t('feeConfig.amount')}</th>
                <th className="text-left p-4 text-sm font-bold uppercase tracking-wider text-fg-secondary">{t('feeConfig.description')}</th>
                <th className="text-center p-4 text-sm font-bold uppercase tracking-wider text-fg-secondary">{t('common.status')}</th>
                <th className="text-center p-4 text-sm font-bold uppercase tracking-wider text-fg-secondary w-20">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {damageFees.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-fg-tertiary">{t('feeConfig.noDamageFees')}</td></tr>
              ) : (
                damageFees.map((fee: any) => {
                  const isActive = fee.damageType?.isActive ?? true;
                  return (
                    <tr key={fee.id} className={`border-b border-border-surface/10 last:border-0 ${!isActive ? 'opacity-50' : ''}`}>
                      <td className="p-4 font-bold text-fg-main">{fee.label}</td>
                      <td className="p-4 text-right font-mono font-bold text-fg-main">{formatCurrency(fee.amount)}</td>
                      <td className="p-4 text-fg-secondary">{fee.description || '—'}</td>
                      <td className="p-4 text-center">
                        <StatusBadge status={isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <ToggleSwitch
                            checked={isActive}
                            onChange={() => setConfirmState({
                              title: t('common.confirm'),
                              message: t('feeConfig.confirmToggleMessage', { action: t(isActive ? 'feeConfig.deactivate' : 'feeConfig.activate'), label: fee.label }),
                              onConfirm: () => handleDamageToggle(fee),
                            })}
                            loading={toggleDamageTypeStatus.isPending}
                          />
                          <button onClick={() => openEdit(fee)} title={t('common.edit')} className="text-accent-primary hover:text-accent-primary/80 transition-colors">
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Otras tarifas */}
      <section className="space-y-3">
        <h3 className="text-sm font-extrabold text-fg-main uppercase tracking-wider">
          {t('feeConfig.otherFeesTitle')}
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-border-surface/30 bg-bg-card/45 backdrop-blur-md">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-surface bg-bg-inset/40">
                <th className="text-left p-4 text-sm font-bold uppercase tracking-wider text-fg-secondary">{t('feeConfig.fee')}</th>
                <th className="text-left p-4 text-sm font-bold uppercase tracking-wider text-fg-secondary">{t('feeConfig.key')}</th>
                <th className="text-right p-4 text-sm font-bold uppercase tracking-wider text-fg-secondary">{t('feeConfig.amount')}</th>
                <th className="text-left p-4 text-sm font-bold uppercase tracking-wider text-fg-secondary">{t('feeConfig.description')}</th>
                <th className="text-center p-4 text-sm font-bold uppercase tracking-wider text-fg-secondary">{t('common.status')}</th>
                <th className="text-center p-4 text-sm font-bold uppercase tracking-wider text-fg-secondary w-20">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {otherFees.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-fg-tertiary">{t('feeConfig.noOtherFees')}</td></tr>
              ) : (
                otherFees.map((fee: any) => {
                  const isActive = fee.isActive ?? true;
                  return (
                    <tr key={fee.id} className={`border-b border-border-surface/10 last:border-0 ${!isActive ? 'opacity-50' : ''}`}>
                      <td className="p-4 font-bold text-fg-main">{fee.label}</td>
                      <td className="p-4"><code className="text-xs font-mono bg-bg-inset px-2 py-0.5 rounded text-fg-tertiary">{fee.key}</code></td>
                      <td className="p-4 text-right font-mono font-bold text-fg-main">{formatCurrency(fee.amount)}</td>
                      <td className="p-4 text-fg-secondary">{fee.description || '—'}</td>
                      <td className="p-4 text-center">
                        <StatusBadge status={isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <ToggleSwitch
                            checked={isActive}
                            onChange={() => setConfirmState({
                              title: t('common.confirm'),
                              message: t('feeConfig.confirmToggleMessage', { action: t(isActive ? 'feeConfig.deactivate' : 'feeConfig.activate'), label: fee.label }),
                              onConfirm: () => handleOtherToggle(fee),
                            })}
                            loading={updateFeeConfig.isPending}
                          />
                          <button onClick={() => openEdit(fee)} title={t('common.edit')} className="text-accent-primary hover:text-accent-primary/80 transition-colors">
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit Modal */}
      <FormModal isOpen={!!editFee} onClose={closeEdit} title={t('feeConfig.editFeeTitle')}>
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-fg-secondary mb-1.5">{t('feeConfig.fee')}</label>
            <p className="text-sm font-bold text-fg-main">{editFee?.label}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-fg-secondary mb-1.5">{t('feeConfig.amountLabel')}</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={closeEdit}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={updateFeeConfig.isPending}>
              {updateFeeConfig.isPending ? t('feeConfig.saving') : t('common.save')}
            </Button>
          </div>
        </div>
      </FormModal>

      <FormModal isOpen={showCreate} onClose={resetCreate} title={t('feeConfig.createTitle')}>
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-fg-secondary mb-1.5">{t('feeConfig.damageName')}</label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('feeConfig.damageNamePlaceholder')} />
          </div>
          <div>
            <label className="block text-xs font-bold text-fg-secondary mb-1.5">{t('feeConfig.description')}</label>
            <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder={t('feeConfig.descriptionPlaceholder')} />
          </div>
          <div>
            <label className="block text-xs font-bold text-fg-secondary mb-1.5">{t('feeConfig.amountLabel')}</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder={t('feeConfig.amountPlaceholder')}
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={resetCreate}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} disabled={createDamageType.isPending}>
              {createDamageType.isPending ? t('feeConfig.creating') : t('common.create')}
            </Button>
          </div>
        </div>
      </FormModal>

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 rounded-full border-2 border-accent-primary/20 border-t-accent-primary animate-spin" />
        </div>
      )}

      {confirmState && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setConfirmState(null)}
          onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }}
          title={confirmState.title}
          message={confirmState.message}
          isLoading={updateFeeConfig.isPending || toggleDamageTypeStatus.isPending}
        />
      )}

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

export default FeeConfigPage;
