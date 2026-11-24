# Samayam (സമയം)

**An accessible school timetable generator and substitution manager for Kerala schools: LP, UP, HS and Higher Secondary.**

Samayam is a free, open-source Windows app for schools. It works with screen readers (NVDA, JAWS, Narrator) and is also built for sighted users.

📖 **User guide (keyboard-first, for screen-reader users):** [English](docs/USER_GUIDE_EN.md) · [മലയാളം](docs/USER_GUIDE.md) – built into the app: press **F1** (works without internet). Switch the app language with **Alt+L**.

> ടീച്ചർമാർ ലീവ് ആകുന്ന ദിവസം ഒരു ക്ലാസും ആളില്ലാതെ പോകരുത്. അതിനാണ് ഈ ആപ്പ്. ടൈം ടേബിൾ ഉണ്ടാക്കാനും, ലീവ് ആയ ടീച്ചർമാരുടെ പിരീഡുകൾക്ക് ഫ്രീ ആയ ടീച്ചർമാരെ തുല്യമായി വീതിച്ചു കൊടുക്കാനും, ആ ലിസ്റ്റ് WhatsApp-ലോ PDF ആയോ ഷെയർ ചെയ്യാനും ഇത് സഹായിക്കും.

## Features

- **School profile**: name, sections (LP / UP / HS / HSS), working days, periods per day, period timings, lunch break and workload limits.
- **Classes and divisions in one step**: for example, Standard 5 with 3 divisions becomes 5A, 5B and 5C. HSS batches get names like `+1 S1`, `+1 C1` and `+2 H1` (Science, Commerce, Humanities).
- **Standard subject plans per section**. Every subject's periods per week can be edited.
- **Teachers**: subjects they teach, weekly and daily limits, senior/HM, phone, and times when they are not available.
- **Teachers from Excel or Google Sheets**: the HM fills one row per teacher and the app reads it.
  - Columns: Name (a full name or initials like "J.K.P"), Short name, Senior/Junior, Subjects, Classes, Max periods per week, Available days, Phone.
  - Subject names the app does not recognise are shown for you to match or create.
  - After import, one button assigns the remaining subjects and generates the timetable.
- **Periods per week by standard**: a grid of subjects × standards. For example, Social Science can be 4 in Std 8 and 5 in Std 9.
- **Minimum free (leisure) periods per teacher per day**: default 1, can be changed per teacher. The generator and the substitution planner both respect it.
- **Part-time / specialist teachers** (Music, Drawing, PE): tick the days they come to the school.
- **Different timings on some days**: for example, Friday can start at 9:30 while other days start at 10:00, or have a longer lunch break. Set it in School Profile → Periods and timings.
- **Type-or-choose boxes** for picking a class or teacher: type "8b" or "Sree", or pick from the list.
- **Weekly holidays**: Saturday & Sunday (most schools), Friday & Sunday, Sunday only, or any days you tick.
- **Special days**:
  - A Saturday with classes can follow another day's timetable, for example after rain holidays.
  - A working day can be marked as a holiday.
- **Auto-assign teachers** to subjects, giving each subject the qualified teacher with the lowest workload.
- **Parallel teachers**, for subjects such as Arabic / Sanskrit / Malayalam II that are taught at the same time.
- **Combined periods (language groups)**: several divisions, for example 6A, 6B and 6C, have Language at the same time and are regrouped into Malayalam, Arabic and Urdu groups, each with its own teacher.
  - The period is placed at the same time in every joined class.
  - All the group teachers are busy then.
  - If one of those teachers is absent, one substitution covers that group.
  - Excel import detects combined periods automatically.
- **Automatic timetable generation**:
  - No clashes.
  - Daily limits are respected.
  - Subjects are spread across the week.
  - Locked periods stay in place.
- **Timetable editing**:
  - Keyboard: arrow keys, Enter to change a period, Space to swap two periods, L to lock, Delete to clear, Ctrl+Z to undo.
  - Mouse: drag and drop.
  - Clash warnings.
  - Saved versions (for example Term 1 or Exam week).
- **Leave & Substitution**:
  - Type or pick absent teachers. Leave can be a full day, forenoon, afternoon or specific periods.
  - Substitutions are created automatically.
  - Fairness: daily limit per teacher and recent substitution counts.
  - Preference for teachers who teach the class or the subject.
  - Each substitute can be changed by hand.
  - An optional "work for the class" note goes with the message.
- **Share** the substitution list on WhatsApp, copy it as text, or save it as `Substitution_YYYY-MM-DD.pdf`.
- **Now view**: what is happening now in a class, for a teacher, or in the whole school, including today's substitutions and which teachers are free.
- **Today dashboard** and a setup checklist.
- **Reports**: substitutions per teacher, leave taken, periods lost per class, and teacher workload. Reports export to Excel or PDF.
- **Excel import and export**:
  - Teachers list and timetables.
  - Templates included.
  - Exported files can be imported again.
- **Backup and restore** of everything in one file.
- **Interface**: English and Malayalam; light, dark and high-contrast themes; adjustable text size.

## Accessibility

- Every control has a label.
- Each page opens with its heading focused.
- Status messages are announced through a live region.
- The timetable is an ARIA grid: screen readers read the day and period headers with each cell.
- A list view is also available for the timetable.
- Native dialogs keep focus inside them while open.
- Alt+1 … Alt+0 jumps between sections.

## Install

Download either file from the Releases page:

- `Samayam-Setup-x.y.z.exe`: a normal installer that creates Start menu and desktop shortcuts.
- `Samayam-Portable-x.y.z.exe`: runs without installing.

The files are not code-signed, so Windows SmartScreen may warn the first time. Choose **More info → Run anyway**.

## Run from source

```powershell
npm install
npm start
```

Tests:

```powershell
npm test
```

This checks the generator and the substitution engine.

```powershell
npm run smoke
```

This opens every page with demo data and reports errors.

Build a Windows installer and a portable .exe into `dist/`:

```powershell
npm run dist
```

If the build fails with "Cannot create symbolic link", extract electron-builder's `winCodeSign` archive once by hand, skipping its `darwin` folder, or turn on Windows Developer Mode.

## Excel formats

- **Teachers**: one sheet. Columns: `Name, Short, Subjects, Max per week, Max per day, Phone, Senior`. Separate subjects with commas.
- **Timetable**: one sheet per class, named after the class (for example `5A` or `+1 S1`).
  - First row: `Day, P1, P2, …`. Then one row per day.
  - Each cell: `Subject / TEACHER-SHORT`, for example `Mathematics / SK`. Write two teachers as `AK + SN`.

## Note on government norms

What we found (summarised in the app under School Profile → "What are the workload rules?"):

- **UP / HS**: one full-time post is sanctioned for every 25 periods of work per week (KER Chapter XXIII, with UP and HS counted separately). The app's default limit is therefore 25 periods a week.
- **HSS**: 15 or more periods a week in a subject is an HSST post; fewer is HSST (Junior). Court cases mention 25 periods as the HSST maximum.
- There is no daily maximum in the rules.

The subject periods per week and the teacher workload limits are **editable defaults**. Please check them against the current Kerala government orders (KER / SCERT / DGE / DHSE) and adjust them in the app.

## Licence

MIT
