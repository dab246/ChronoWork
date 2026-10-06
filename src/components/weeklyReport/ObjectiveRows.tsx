import React, { useState } from 'react';
import { Check, Edit2, Plus, Trash2 } from 'lucide-react';
import type { WeeklyObjective, WeeklyReflections } from '../../types';
import { newId } from '../../utils/storage';
import { useI18n, type Translations } from '../../i18n';
import { C, banner, head, inputClass, light, serif } from './sheetStyles';

type ReportDoc = Translations['reportDoc'];
type SetObjectives = React.Dispatch<React.SetStateAction<WeeklyObjective[]>>;
type SetReflections = React.Dispatch<React.SetStateAction<WeeklyReflections>>;

interface ReflectionRow {
  text: string;
  head: boolean;
  key?: keyof WeeklyReflections;
}

const ReflectionCell: React.FC<{ row?: ReflectionRow; setReflections: SetReflections }> = ({ row, setReflections }) => {
  if (!row) return <td colSpan={4} />;
  const { key } = row;
  return (
    <td
      colSpan={4}
      className={`px-1.5 py-1 text-[13px] ${row.head ? 'italic' : ''}`}
      style={{ background: row.head ? C.header : C.cellLight, border: `1px solid ${C.borderDark}` }}
    >
      {key ? (
        <textarea
          rows={2}
          value={row.text}
          onChange={(e) => setReflections((prev) => ({ ...prev, [key]: e.target.value }))}
          className="w-full bg-transparent resize-y text-[13px] focus:outline-none focus:bg-white rounded px-1"
        />
      ) : (
        row.text
      )}
    </td>
  );
};

interface ObjectiveCellsProps {
  obj?: WeeklyObjective;
  editing: boolean;
  setObjectives: SetObjectives;
}

const ObjectiveCells: React.FC<ObjectiveCellsProps> = ({ obj, editing, setObjectives }) => {
  const { t } = useI18n();
  const update = (field: 'task' | 'note', value: string) =>
    setObjectives((prev) => prev.map((o) => (o.id === obj?.id ? { ...o, [field]: value } : o)));

  if (!editing || !obj) {
    return (
      <>
        <td colSpan={2} className="text-center px-1" style={{ ...light, ...serif }}>{obj?.task}</td>
        <td className="text-center px-1" style={{ ...light, ...serif }}>{obj?.note}</td>
      </>
    );
  }
  return (
    <>
      <td colSpan={2} className="text-center px-1" style={{ ...light, ...serif }}>
        <input type="text" value={obj.task} onChange={(e) => update('task', e.target.value)} className={inputClass} />
      </td>
      <td className="text-center px-1" style={{ ...light, ...serif }}>
        <div className="flex items-center gap-1">
          <input type="text" value={obj.note} onChange={(e) => update('note', e.target.value)} className={inputClass} />
          <button
            type="button"
            onClick={() => setObjectives((prev) => prev.filter((o) => o.id !== obj.id))}
            aria-label={t.common.delete}
            className="no-print icon-btn p-1 text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </>
  );
};

interface ObjectiveRowsProps {
  r: ReportDoc;
  objectives: WeeklyObjective[];
  setObjectives: SetObjectives;
  reflections: WeeklyReflections;
  setReflections: SetReflections;
}

/** Next week's objectives (editable) side by side with the weekly reflections. */
export const ObjectiveRows: React.FC<ObjectiveRowsProps> = ({ r, objectives, setObjectives, reflections, setReflections }) => {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const editLabel = editing ? t.common.done : t.common.edit;

  const reflectionRows: ReflectionRow[] = [
    { text: reflections.wentWell, head: false, key: 'wentWell' },
    { text: r.refChallengingTitle, head: true },
    { text: reflections.challenging, head: false, key: 'challenging' },
    { text: r.refProposalTitle, head: true },
    { text: reflections.proposal, head: false, key: 'proposal' },
  ];
  const rowCount = Math.max(5, objectives.length);

  return (
    <>
      <tr style={{ height: 36 }}>
        <td className="text-center font-bold text-[14px]" style={banner}>{r.objNo}</td>
        <td colSpan={2} className="relative text-center font-bold text-[14px]" style={banner}>
          {r.objTitle}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-label={editLabel}
            title={editLabel}
            className="no-print absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/15 hover:bg-white/25"
          >
            {editing ? <Check className="w-3 h-3" /> : <Edit2 className="w-3 h-3" />}
          </button>
        </td>
        <td className="text-center font-bold text-[14px]" style={banner}>{r.objNote}</td>
        <td />
        <td colSpan={4} className="italic text-[13px] px-1.5" style={{ ...head, borderColor: C.borderDark }}>{r.refWentWellTitle}</td>
      </tr>
      {Array.from({ length: rowCount }).map((_, i) => (
        <tr key={objectives[i]?.id ?? `obj-${i}`} style={{ height: 36 }}>
          <td className="text-center" style={light}>{i + 1}</td>
          <ObjectiveCells obj={objectives[i]} editing={editing} setObjectives={setObjectives} />
          <td />
          <ReflectionCell row={reflectionRows[i]} setReflections={setReflections} />
        </tr>
      ))}
      {editing && (
        <tr className="no-print">
          <td colSpan={9} className="pt-2">
            <button type="button" onClick={() => setObjectives((prev) => [...prev, { id: newId('obj'), task: '', note: '' }])} className="btn-text">
              <Plus className="w-3.5 h-3.5" />
              {t.report.addObjective}
            </button>
          </td>
        </tr>
      )}
    </>
  );
};
