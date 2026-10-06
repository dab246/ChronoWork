import React from 'react';
import { Clock, Trash2 } from 'lucide-react';
import type { TimeEntry, UserSettings } from '../types';
import { formatDateIso } from '../utils/dateUtils';
import { useI18n } from '../i18n';
import { Modal } from '../ui/Modal';
import { useFeedback } from '../ui/feedback';
import { TaskForm, type TaskDraft } from './TaskForm';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: TaskDraft, editingId?: string) => void;
  onDelete?: (id: string) => void;
  editingEntry?: TimeEntry | null;
  projects: string[];
  defaultDate?: string;
  settings: UserSettings;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingEntry,
  projects,
  defaultDate,
  settings,
}) => {
  const { t } = useI18n();
  const { confirm } = useFeedback();

  const handleDelete = async () => {
    if (!editingEntry || !onDelete) return;
    const ok = await confirm({
      title: t.dayLog.confirmDeleteTitle,
      message: t.dayLog.confirmDelete(editingEntry.taskName),
      confirmLabel: t.common.delete,
      danger: true,
    });
    if (ok) {
      onDelete(editingEntry.id);
      onClose();
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      icon={<Clock className="w-5 h-5" />}
      title={editingEntry ? t.entryModal.titleEdit : t.entryModal.titleNew}
    >
      <TaskForm
        settings={settings}
        projects={projects}
        date={defaultDate || formatDateIso(new Date())}
        editing={editingEntry}
        showDate
        submitLabel={editingEntry ? t.entryModal.submitUpdate : t.entryModal.submitNew}
        onSubmit={(draft) => {
          onSave(draft, editingEntry?.id);
          onClose();
        }}
        actions={
          editingEntry && onDelete ? (
            <button type="button" onClick={handleDelete} className="btn-text text-rose-600 hover:bg-rose-50">
              <Trash2 className="w-3.5 h-3.5" />
              {t.entryModal.deleteLog}
            </button>
          ) : null
        }
      />
    </Modal>
  );
};
