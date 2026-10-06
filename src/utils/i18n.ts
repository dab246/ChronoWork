export type Language = 'vi' | 'en' | 'fr';

export interface Translations {
  appName: string;
  tabs: {
    daily: string;
    report: string;
    calendar: string;
    performance: string;
  };
  actions: {
    addTask: string;
    exportCsv: string;
    exportExcel: string;
    exportOds: string;
    exportPdf: string;
    copyToSheet: string;
    uploadTemplate: string;
    print: string;
    settings: string;
    today: string;
    prevDay: string;
    nextDay: string;
    prevWeek: string;
    nextWeek: string;
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    close: string;
    resetDefaultDays: string;
    quickEditTasks: string;
    editObjectives: string;
    pasteGuide: string;
  };
  dayLog: {
    title: string;
    subtitle: string;
    dayStatus: string;
    statuses: {
      work: string;
      wfh: string;
      paid_leave: string;
      sick_leave: string;
      holiday: string;
      weekend: string;
    };
    totalHoursToday: string;
    targetHoursLabel: string;
    validLeaveBadge: string;
    hoursCompletedBadge: string;
    hoursRemainingBadge: string;
    leaveNoticeTitle: string;
    leaveNoticeDesc: string;
    leaveCardTitle: string;
    leaveCardDesc: string;
    formTitle: string;
    formEditTitle: string;
    searchGithubLabel: string;
    taskNameLabel: string;
    projectLabel: string;
    hoursLabel: string;
    githubUrlLabel: string;
    descriptionLabel: string;
    completionPctLabel: string;
    gapReasonLabel: string;
    gapSolutionLabel: string;
    remarkLabel: string;
    submitAdd: string;
    submitUpdate: string;
    loggedTasksTitle: string;
    noTasksToday: string;
  };
  report: {
    title: string;
    subtitle: string;
    brandText: string;
    reportTitle: string;
    weekFromTo: (weekNum: number, start: string, end: string) => string;
    employeeNameRole: (name: string, role: string) => string;
    daysOffLabel: string;
    daysOffText: (count: number, dates: string) => string;
    officeDaysLabel: string;
    officeDaysText: (count: number, dates: string) => string;
    completedWorkHeader: string;
    colNo: string;
    colProject: string;
    colDesc: string;
    colTime: string;
    colResult: string;
    colGap: string;
    colRemark: string;
    colCompletion: string;
    colGapPct: string;
    colReason: string;
    colSolution: string;
    reviewsFooter: string;
    objNo: string;
    objTitle: string;
    objNote: string;
    refWentWellTitle: string;
    refChallengingTitle: string;
    refProposalTitle: string;
    sigEmployee: string;
    sigManager: string;
    updateOfficeDaysTitle: string;
    updateOfficeDaysSubtitle: string;
    copySuccessToast: string;
    copyHintToast: string;
  };
  settingsModal: {
    title: string;
    nameLabel: string;
    roleLabel: string;
    companyLabel: string;
    languageLabel: string;
    defaultOfficeDaysLabel: string;
    defaultOfficeDaysDesc: string;
    days: string[];
    saveButton: string;
  };
}

export const TRANSLATIONS: Record<Language, Translations> = {
  vi: {
    appName: 'ChronoWork',
    tabs: {
      daily: 'Log cuối ngày',
      report: 'Báo cáo tuần',
      calendar: 'Lịch ngày công',
      performance: 'Hiệu suất',
    },
    actions: {
      addTask: 'Thêm task',
      exportCsv: 'Xuất CSV',
      exportExcel: 'Xuất Excel (.xlsx)',
      exportOds: 'Xuất ODS (.ods)',
      exportPdf: 'Xuất PDF (.pdf)',
      copyToSheet: 'Copy dán vào Sheet',
      uploadTemplate: 'Tải template mẫu lên',
      print: 'In (Print)',
      settings: 'Cài đặt',
      today: 'Hôm nay',
      prevDay: 'Ngày trước',
      nextDay: 'Ngày sau',
      prevWeek: 'Tuần trước',
      nextWeek: 'Tuần sau',
      save: 'Lưu thay đổi',
      cancel: 'Hủy bỏ',
      edit: 'Chỉnh sửa',
      delete: 'Xóa',
      close: 'Đóng',
      resetDefaultDays: 'Dùng ngày mặc định',
      quickEditTasks: 'Sửa nhanh task',
      editObjectives: 'Sửa mục tiêu & suy ngẫm',
      pasteGuide: 'Hướng dẫn dán',
    },
    dayLog: {
      title: 'Log Time Cuối Ngày Làm Việc',
      subtitle: 'Trước khi ra về, ghi nhận các task đã làm, gắn link GitHub, cập nhật tiến độ và lý do',
      dayStatus: 'Trạng thái ngày:',
      statuses: {
        work: 'Tại văn phòng',
        wfh: 'Làm từ xa (WFH)',
        paid_leave: 'Nghỉ phép',
        sick_leave: 'Nghỉ ốm',
        holiday: 'Nghỉ lễ',
        weekend: 'Cuối tuần',
      },
      totalHoursToday: 'Tổng giờ hôm nay',
      targetHoursLabel: 'Mục tiêu',
      validLeaveBadge: 'Ngày nghỉ hợp lệ (0h) ✓',
      hoursCompletedBadge: 'Đã đủ {h}h ✓',
      hoursRemainingBadge: 'Còn thiếu {h}h',
      leaveNoticeTitle: 'Hôm nay bạn đang trong trạng thái nghỉ',
      leaveNoticeDesc: 'Hôm nay là ngày nghỉ phép / nghỉ ốm của bạn. Bạn không cần log giờ làm việc. Ngày nghỉ này sẽ tự động được ghi nhận vào báo cáo tuần.',
      leaveCardTitle: 'Bạn đang trong trạng thái nghỉ phép / nghỉ ốm',
      leaveCardDesc: 'Hệ thống đã tự động ghi nhận ngày nghỉ này vào mục "Your days off this week". Bạn không cần nhập bất kỳ công việc nào hôm nay.',
      formTitle: 'Ghi nhận công việc đã hoàn thành hôm nay',
      formEditTitle: 'Chỉnh sửa task',
      searchGithubLabel: 'Tìm nhanh Issue / PR trên GitHub hoặc dán URL',
      taskNameLabel: 'Tên công việc / Task *',
      projectLabel: 'Dự án',
      hoursLabel: 'Thời gian hoàn thành (giờ) *',
      githubUrlLabel: 'Link GitHub Issue / PR (nếu có)',
      descriptionLabel: 'Mô tả hoạt động (Description of activities)',
      completionPctLabel: 'Tiến độ hoàn thành (%)',
      gapReasonLabel: 'Lý do chưa hoàn thành 100% (Gap reason)',
      gapSolutionLabel: 'Giải pháp & Hạn chót (Solution & Deadline)',
      remarkLabel: 'Nhận xét / Ghi chú (Remark)',
      submitAdd: 'Ghi nhận công việc',
      submitUpdate: 'Cập nhật thay đổi',
      loggedTasksTitle: 'Các công việc đã log hôm nay',
      noTasksToday: 'Chưa có công việc nào được ghi nhận cho ngày này.',
    },
    report: {
      title: 'Báo Cáo Tuần (LINAGORA Vietnam Template)',
      subtitle: 'Tự động cập nhật khoảng thời gian tuần, ngày làm tại văn phòng, ngày off và tổng hợp task',
      brandText: 'LINAGORA Vietnam',
      reportTitle: 'WEEKLY REPORT',
      weekFromTo: (weekNum, start, end) => `Week ${weekNum} from ${start} to ${end}`,
      employeeNameRole: (name, role) => `Employee’s name: ${name}   Title: ${role}`,
      daysOffLabel: 'Your days off this week:',
      daysOffText: (count, dates) => `Number: ${count} Date: ${dates || ''}`,
      officeDaysLabel: 'Your working days at the office this week:',
      officeDaysText: (count, dates) => `Number ${count} Date: ${dates || ''}`,
      completedWorkHeader: 'COMPLETED WORK',
      colNo: 'NO',
      colProject: 'PROJECT/TASK',
      colDesc: 'DESCRIPTION OF ACTIVITIES',
      colTime: 'TIME SPENT',
      colResult: 'RESULT VS PLAN',
      colGap: 'GAP (if any)',
      colRemark: 'REMARK',
      colCompletion: 'Completion (%)',
      colGapPct: 'Gap (%)',
      colReason: 'Reason',
      colSolution: 'Solution/Deadline',
      reviewsFooter: 'Reviews, meetings, support, community, …',
      objNo: 'No',
      objTitle: 'OBJECTIVE FOR  NEXT WEEK',
      objNote: 'Note',
      refWentWellTitle: '* The things that went particularly well this week (area of improvement, new task....)',
      refChallengingTitle: '* The things that were challenging this week (issue, problem, difficulty...)',
      refProposalTitle: '* Your proposal, suggestion, request…',
      sigEmployee: 'Employee',
      sigManager: 'Teamleader/Manager',
      updateOfficeDaysTitle: 'Cập nhật ngày lên văn phòng & ngày off trong tuần',
      updateOfficeDaysSubtitle: 'Chọn nhanh trạng thái cho từng ngày từ Thứ 2 đến Thứ 6. Tự động tính số ngày văn phòng và số ngày nghỉ vào tiêu đề báo cáo.',
      copySuccessToast: '✅ Đã copy toàn bộ báo cáo đúng format (màu tím, merge ô, viền bảng và hyperlink)!',
      copyHintToast: 'Mẹo: Mở Google Sheets / Excel / LibreOffice Calc, chọn ô A1 rồi bấm Ctrl+V.',
    },
    settingsModal: {
      title: 'Cài Đặt Người Dùng & Hệ Thống',
      nameLabel: 'Họ và tên nhân viên',
      roleLabel: 'Chức danh công việc (Title / Role)',
      companyLabel: 'Tên công ty / Chi nhánh',
      languageLabel: 'Ngôn ngữ giao diện & Báo cáo',
      defaultOfficeDaysLabel: 'Ngày làm việc tại văn phòng mặc định hàng tuần',
      defaultOfficeDaysDesc: 'Tự động áp dụng cho các tuần mới (có thể tinh chỉnh riêng từng tuần)',
      days: ['Thứ 2 (T2)', 'Thứ 3 (T3)', 'Thứ 4 (T4)', 'Thứ 5 (T5)', 'Thứ 6 (T6)'],
      saveButton: 'Lưu cài đặt',
    },
  },
  en: {
    appName: 'ChronoWork',
    tabs: {
      daily: 'Daily Log',
      report: 'Weekly Report',
      calendar: 'Attendance',
      performance: 'Performance',
    },
    actions: {
      addTask: 'Add Task',
      exportCsv: 'Export CSV',
      exportExcel: 'Export Excel (.xlsx)',
      exportOds: 'Export ODS (.ods)',
      exportPdf: 'Export PDF (.pdf)',
      copyToSheet: 'Copy to Sheet',
      uploadTemplate: 'Upload Template',
      print: 'Print',
      settings: 'Settings',
      today: 'Today',
      prevDay: 'Previous Day',
      nextDay: 'Next Day',
      prevWeek: 'Previous Week',
      nextWeek: 'Next Week',
      save: 'Save Changes',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      close: 'Close',
      resetDefaultDays: 'Use Default Days',
      quickEditTasks: 'Quick Edit Tasks',
      editObjectives: 'Edit Objectives & Reflections',
      pasteGuide: 'Paste Guide',
    },
    dayLog: {
      title: 'End of Day Work Log',
      subtitle: 'Log completed tasks, attach GitHub links, update completion progress and gap reasons before leaving',
      dayStatus: 'Day Status:',
      statuses: {
        work: 'At Office',
        wfh: 'Remote (WFH)',
        paid_leave: 'Paid Leave',
        sick_leave: 'Sick Leave',
        holiday: 'Holiday',
        weekend: 'Weekend',
      },
      totalHoursToday: 'Total Hours Today',
      targetHoursLabel: 'Target',
      validLeaveBadge: 'Approved Leave (0h) ✓',
      hoursCompletedBadge: 'Completed {h}h ✓',
      hoursRemainingBadge: '{h}h remaining',
      leaveNoticeTitle: 'You are currently on approved leave today',
      leaveNoticeDesc: 'Today is recorded as your paid leave / sick leave. No working hours logging is required. This day is automatically reflected in your weekly report.',
      leaveCardTitle: 'You are currently on Paid Leave / Sick Leave',
      leaveCardDesc: 'This day is automatically counted in "Your days off this week". You do not need to log any tasks for today.',
      formTitle: 'Log Tasks Completed Today',
      formEditTitle: 'Edit Task',
      searchGithubLabel: 'Search GitHub Issue / PR or paste URL',
      taskNameLabel: 'Task Name *',
      projectLabel: 'Project',
      hoursLabel: 'Time Spent (hours) *',
      githubUrlLabel: 'GitHub Issue / PR Link (optional)',
      descriptionLabel: 'Description of Activities',
      completionPctLabel: 'Completion Progress (%)',
      gapReasonLabel: 'Gap Reason (if not 100%)',
      gapSolutionLabel: 'Solution & Deadline',
      remarkLabel: 'Remark / Notes',
      submitAdd: 'Save Task',
      submitUpdate: 'Update Task',
      loggedTasksTitle: 'Tasks Logged Today',
      noTasksToday: 'No tasks logged for this day yet.',
    },
    report: {
      title: 'Weekly Report (LINAGORA Vietnam Template)',
      subtitle: 'Automatically updates week dates, office days, leave days, and aggregates all tasks',
      brandText: 'LINAGORA Vietnam',
      reportTitle: 'WEEKLY REPORT',
      weekFromTo: (weekNum, start, end) => `Week ${weekNum} from ${start} to ${end}`,
      employeeNameRole: (name, role) => `Employee’s name: ${name}   Title: ${role}`,
      daysOffLabel: 'Your days off this week:',
      daysOffText: (count, dates) => `Number: ${count} Date: ${dates || ''}`,
      officeDaysLabel: 'Your working days at the office this week:',
      officeDaysText: (count, dates) => `Number ${count} Date: ${dates || ''}`,
      completedWorkHeader: 'COMPLETED WORK',
      colNo: 'NO',
      colProject: 'PROJECT/TASK',
      colDesc: 'DESCRIPTION OF ACTIVITIES',
      colTime: 'TIME SPENT',
      colResult: 'RESULT VS PLAN',
      colGap: 'GAP (if any)',
      colRemark: 'REMARK',
      colCompletion: 'Completion (%)',
      colGapPct: 'Gap (%)',
      colReason: 'Reason',
      colSolution: 'Solution/Deadline',
      reviewsFooter: 'Reviews, meetings, support, community, …',
      objNo: 'No',
      objTitle: 'OBJECTIVE FOR  NEXT WEEK',
      objNote: 'Note',
      refWentWellTitle: '* The things that went particularly well this week (area of improvement, new task....)',
      refChallengingTitle: '* The things that were challenging this week (issue, problem, difficulty...)',
      refProposalTitle: '* Your proposal, suggestion, request…',
      sigEmployee: 'Employee',
      sigManager: 'Teamleader/Manager',
      updateOfficeDaysTitle: 'Update Office Days & Days Off This Week',
      updateOfficeDaysSubtitle: 'Quickly select status for Monday through Friday. Office count and leave count are automatically updated on the report header.',
      copySuccessToast: '✅ Copied full report with exact format (purple headers, merged cells, borders & links)!',
      copyHintToast: 'Tip: Open Google Sheets / Excel / LibreOffice Calc, select cell A1 and press Ctrl+V.',
    },
    settingsModal: {
      title: 'User & System Settings',
      nameLabel: 'Employee Name',
      roleLabel: 'Job Title / Role',
      companyLabel: 'Company / Branch Name',
      languageLabel: 'UI & Export Language',
      defaultOfficeDaysLabel: 'Default Weekly Office Working Days',
      defaultOfficeDaysDesc: 'Automatically applied to new weeks (can be customized per week)',
      days: ['Mon (M)', 'Tue (T)', 'Wed (W)', 'Thu (Th)', 'Fri (F)'],
      saveButton: 'Save Settings',
    },
  },
  fr: {
    appName: 'ChronoWork',
    tabs: {
      daily: 'Journal de bord',
      report: 'Rapport hebdomadaire',
      calendar: 'Présences',
      performance: 'Performance',
    },
    actions: {
      addTask: 'Ajouter tâche',
      exportCsv: 'Exporter CSV',
      exportExcel: 'Exporter Excel (.xlsx)',
      exportOds: 'Exporter ODS (.ods)',
      exportPdf: 'Exporter PDF (.pdf)',
      copyToSheet: 'Copier vers Feuille',
      uploadTemplate: 'Charger modèle',
      print: 'Imprimer',
      settings: 'Paramètres',
      today: "Aujourd'hui",
      prevDay: 'Jour précédent',
      nextDay: 'Jour suivant',
      prevWeek: 'Semaine précédente',
      nextWeek: 'Semaine suivante',
      save: 'Enregistrer',
      cancel: 'Annuler',
      edit: 'Modifier',
      delete: 'Supprimer',
      close: 'Fermer',
      resetDefaultDays: 'Jours par défaut',
      quickEditTasks: 'Édition rapide',
      editObjectives: 'Modifier objectifs & bilan',
      pasteGuide: 'Guide de collage',
    },
    dayLog: {
      title: 'Journal de Fin de Journée',
      subtitle: 'Enregistrez les tâches terminées, liens GitHub, avancement et explications avant de partir',
      dayStatus: 'Statut du jour :',
      statuses: {
        work: 'Au bureau',
        wfh: 'En télétravail',
        paid_leave: 'Congé payé',
        sick_leave: 'Congé maladie',
        holiday: 'Jour férié',
        weekend: 'Week-end',
      },
      totalHoursToday: "Heures aujourd'hui",
      targetHoursLabel: 'Objectif',
      validLeaveBadge: 'Congé validé (0h) ✓',
      hoursCompletedBadge: 'Atteint {h}h ✓',
      hoursRemainingBadge: 'Reste {h}h',
      leaveNoticeTitle: 'Vous êtes actuellement en congé validé',
      leaveNoticeDesc: "Aujourd'hui est enregistré comme congé payé ou maladie. Aucun enregistrement d'heures n'est requis. Ce jour est automatiquement comptabilisé dans le rapport hebdomadaire.",
      leaveCardTitle: 'Vous êtes en congé payé ou maladie',
      leaveCardDesc: 'Ce jour est automatiquement pris en compte dans "Vos jours de congé cette semaine". Aucune tâche à enregistrer aujourd\'hui.',
      formTitle: 'Enregistrer les tâches effectuées aujourd\'hui',
      formEditTitle: 'Modifier la tâche',
      searchGithubLabel: 'Rechercher Issue / PR GitHub ou coller l\'URL',
      taskNameLabel: 'Nom de la tâche *',
      projectLabel: 'Projet',
      hoursLabel: 'Temps passé (heures) *',
      githubUrlLabel: 'Lien GitHub Issue / PR (optionnel)',
      descriptionLabel: 'Description des activités',
      completionPctLabel: 'Taux d\'avancement (%)',
      gapReasonLabel: 'Raison de l\'écart (si < 100%)',
      gapSolutionLabel: 'Solution & Échéance',
      remarkLabel: 'Remarques / Notes',
      submitAdd: 'Enregistrer la tâche',
      submitUpdate: 'Mettre à jour',
      loggedTasksTitle: 'Tâches enregistrées aujourd\'hui',
      noTasksToday: 'Aucune tâche enregistrée pour cette journée.',
    },
    report: {
      title: 'Rapport Hebdomadaire (Modèle LINAGORA Vietnam)',
      subtitle: 'Mise à jour automatique des dates de la semaine, jours au bureau, congés et synthèse des tâches',
      brandText: 'LINAGORA Vietnam',
      reportTitle: 'RAPPORT HEBDOMADAIRE',
      weekFromTo: (weekNum, start, end) => `Semaine ${weekNum} du ${start} au ${end}`,
      employeeNameRole: (name, role) => `Nom de l'employé(e) : ${name}   Poste : ${role}`,
      daysOffLabel: 'Vos jours de congé cette semaine :',
      daysOffText: (count, dates) => `Nombre : ${count} Date : ${dates || ''}`,
      officeDaysLabel: 'Vos jours de présence au bureau cette semaine :',
      officeDaysText: (count, dates) => `Nombre : ${count} Date : ${dates || ''}`,
      completedWorkHeader: 'TRAVAIL EFFECTUÉ',
      colNo: 'N°',
      colProject: 'PROJET / TÂCHE',
      colDesc: 'DESCRIPTION DES ACTIVITÉS',
      colTime: 'TEMPS PASSÉ',
      colResult: 'RÉSULTAT VS PLAN',
      colGap: 'ÉCART (si existant)',
      colRemark: 'REMARQUE',
      colCompletion: 'Complétion (%)',
      colGapPct: 'Écart (%)',
      colReason: 'Raison',
      colSolution: 'Solution / Échéance',
      reviewsFooter: 'Revues, réunions, support, communauté, …',
      objNo: 'N°',
      objTitle: 'OBJECTIFS POUR LA SEMAINE PROCHAINE',
      objNote: 'Remarque',
      refWentWellTitle: '* Ce qui s\'est particulièrement bien passé cette semaine (axes d\'amélioration, nouvelle tâche...)',
      refChallengingTitle: '* Les difficultés rencontrées cette semaine (problème, défi...)',
      refProposalTitle: '* Vos propositions, suggestions, demandes…',
      sigEmployee: 'Employé(e)',
      sigManager: 'Responsable d\'équipe / Manager',
      updateOfficeDaysTitle: 'Mise à jour des jours au bureau & congés de la semaine',
      updateOfficeDaysSubtitle: 'Sélectionnez rapidement le statut du lundi au vendredi. Le décompte est reporté automatiquement sur le rapport.',
      copySuccessToast: '✅ Rapport complet copié avec format exact (en-têtes violets, cellules fusionnées, bordures et liens) !',
      copyHintToast: 'Astuce : Ouvrez Google Sheets / Excel / LibreOffice Calc, sélectionnez la cellule A1 et appuyez sur Ctrl+V.',
    },
    settingsModal: {
      title: 'Paramètres Utilisateur & Système',
      nameLabel: 'Nom de l\'employé(e)',
      roleLabel: 'Poste / Titre professionnel',
      companyLabel: 'Entreprise / Entité',
      languageLabel: 'Langue de l\'interface & des rapports',
      defaultOfficeDaysLabel: 'Jours hebdomadaires de présence au bureau par défaut',
      defaultOfficeDaysDesc: 'Appliqué automatiquement aux nouvelles semaines (ajustable chaque semaine)',
      days: ['Lundi (L)', 'Mardi (Ma)', 'Mercredi (Me)', 'Jeudi (J)', 'Vendredi (V)'],
      saveButton: 'Enregistrer les paramètres',
    },
  },
};

export function getTranslations(lang: Language = 'vi'): Translations {
  return TRANSLATIONS[lang] || TRANSLATIONS.vi;
}
