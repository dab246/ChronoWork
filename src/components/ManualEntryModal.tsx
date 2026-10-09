import React from 'react';
import { Clock, Repeat, Trash2 } from 'lucide-react';
import type { TimeEntry, UserSettings } from '../types';
import { formatDateIso, formatLongDate } from '../utils/dateUtils';
import { useI18n, type Translations } from '../i18n';
import { Modal } from '../ui/Modal';
import { useFeedback } from '../ui/feedback';
import { TaskForm, type TaskDraft, type TaskTemplate } from './TaskForm';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: TaskDraft, editingId?: string) => void;
  onDelete?: (id: string) => void;
  editingEntry?: TimeEntry | null;
  /** Task continued on `defaultDate` (drag & drop or "+" in the timesheet) */
  template?: TaskTemplate | null;
  projects: string[];
  entries: TimeEntry[];
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

type DialogMode = 'edit' | 'continue' | 'new';

const modeOf = (editing?: TimeEntry | null, template?: TaskTemplate | null): DialogMode => {
  if (editing) return 'edit';
  return template ? 'continue' : 'new';
};

/** Title, submit label and icon of each dialog mode. */
function dialogLabels(m: Translations['entryModal'], mode: DialogMode) {
  const labels = {
    edit: { title: m.titleEdit, submit: m.submitUpdate, icon: <Clock className="w-5 h-5" /> },
    continue: { title: m.titleContinue, submit: m.submitNew, icon: <Repeat className="w-5 h-5" /> },
    new: { title: m.titleNew, submit: m.submitNew, icon: <Clock className="w-5 h-5" /> },
  };
  return labels[mode];
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingEntry,
  template,
  projects,
  entries,
  defaultDate,
  settings,
}) => {
  const { t, lang } = useI18n();
  const m = t.entryModal;
  const date = defaultDate || formatDateIso(new Date());
  const mode = modeOf(editingEntry, template);
  const labels = dialogLabels(m, mode);
  const deleteAction = editingEntry && onDelete && <DeleteEntryButton entry={editingEntry} onDelete={onDelete} onDone={onClose} />;

  const handleSubmit = (draft: TaskDraft) => {
    onSave(draft, editingEntry?.id);
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      icon={labels.icon}
      title={labels.title}
      subtitle={mode === 'continue' ? m.continueHint(formatLongDate(date, lang)) : undefined}
    >
      <TaskForm
        settings={settings}
        projects={projects}
        entries={entries}
        date={date}
        editing={editingEntry}
        template={mode === 'continue' ? template : null}
        showDate
        submitLabel={labels.submit}
        onSubmit={handleSubmit}
        actions={deleteAction || null}
      />
    </Modal>
  );
};
