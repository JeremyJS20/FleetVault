import React from 'react';
import { Button } from './Button.js';
import { FormModal } from './FormModal.js';
import { useTranslation } from 'react-i18next';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col gap-6">
        <p className="text-sm font-medium text-fg-secondary leading-relaxed">
          {message}
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText || t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={onConfirm} isLoading={isLoading}>
            {confirmText || t('common.confirm')}
          </Button>
        </div>
      </div>
    </FormModal>
  );
};
