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

/** Delete action shown while editing; asks for confirmation first. */
const DeleteEntryButton: React.FC<{ entry: TimeEntry; onDelete: (id: string) => void; onDone: () => void }> = ({
  entry,
  onDelete,
  onDone,
}) => {
  const { t } = useI18n();
  const { confirm } = useFeedback();

  const handleDelete = async () => {
    const ok = await confirm({
      title: t.dayLog.confirmDeleteTitle,
      message: t.dayLog.confirmDelete(entry.taskName),
      confirmLabel: t.common.delete,
      danger: true,
    });
    if (ok) {
      onDelete(entry.id);
      onDone();
    }
  };

  return (
    <button type="button" onClick={handleDelete} className="btn-text text-rose-600 hover:bg-rose-50">
      <Trash2 className="w-3.5 h-3.5" />
      {t.entryModal.deleteLog}
    </button>
  );
};

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
  const m = t.entryModal;
  const labels = editingEntry ? { title: m.titleEdit, submit: m.submitUpdate } : { title: m.titleNew, submit: m.submitNew };

  const handleSubmit = (draft: TaskDraft) => {
    onSave(draft, editingEntry?.id);
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={onClose} size="lg" icon={<Clock className="w-5 h-5" />} title={labels.title}>
      <TaskForm
        settings={settings}
        projects={projects}
        date={defaultDate || formatDateIso(new Date())}
        editing={editingEntry}
        showDate
        submitLabel={labels.submit}
        onSubmit={handleSubmit}
        actions={editingEntry && onDelete ? <DeleteEntryButton entry={editingEntry} onDelete={onDelete} onDone={onClose} /> : null}
      />
    </Modal>
  );
};
