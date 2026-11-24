# Samayam – User Guide

**School timetables and substitutions – for blind, low-vision and sighted users alike**

This guide is written mainly for people who use a screen reader (NVDA, JAWS or Windows Narrator). Every task is explained **using only the keyboard**. Press **F1** anywhere in the app to open this guide.

മലയാളം പതിപ്പ്: [USER_GUIDE.md](USER_GUIDE.md)

---

## Contents

1. [About this app](#1-about-this-app)
2. [Installing](#2-installing)
3. [How the app is laid out, and keyboard basics](#3-how-the-app-is-laid-out-and-keyboard-basics)
4. [First steps: try the demo school](#4-first-steps-try-the-demo-school)
5. [Setting up your own school – step by step](#5-setting-up-your-own-school--step-by-step)
6. [School Profile (Alt+7)](#6-school-profile-alt7)
7. [Teachers (Alt+6)](#7-teachers-alt6)
8. [Classes & Subjects (Alt+5)](#8-classes--subjects-alt5)
9. [Timetable (Alt+4)](#9-timetable-alt4)
10. [Leave & Substitution (Alt+3)](#10-leave--substitution-alt3)
11. [Now (Alt+2)](#11-now-alt2)
12. [Today dashboard (Alt+1)](#12-today-dashboard-alt1)
13. [Reports (Alt+8)](#13-reports-alt8)
14. [Import / Export / Backup (Alt+9)](#14-import--export--backup-alt9)
15. [Settings (Alt+0)](#15-settings-alt0)
16. [A typical day](#16-a-typical-day)
17. [Screen reader tips](#17-screen-reader-tips)
18. [All keyboard shortcuts](#18-all-keyboard-shortcuts)
19. [Common questions and troubleshooting](#19-common-questions-and-troubleshooting)

---

## 1. About this app

### Why this app?

When a teacher is on leave, someone has to take that teacher's classes. Often nobody finds the time to arrange substitutions, and the children sit idle through those periods. There have been days when a single class lost five periods this way.

Open-source timetable generators exist, but most of them cannot be used by blind people. They depend on grids and a mouse.

**Samayam** (സമയം, "time" in Malayalam) grew out of a long-held wish: that a blind teacher should be able to build the school timetable and arrange the daily substitutions on their own, without anyone's help. At the same time it is an attractive app for sighted users too, with colours, a visual grid and drag-and-drop.

### What does it do?

- **School profile:** LP, UP, High School and Higher Secondary in any combination.
  - Periods per day and the time of each period.
  - Weekly holidays: Saturday & Sunday, Friday & Sunday, or Sunday only.
  - Different timings on some days, for example Friday.
- **Classes:** say "Standard 5 has 3 divisions" and you get 5A, 5B and 5C. Higher Secondary batches become +1 S1, +1 C1, +2 H1 and so on. Each class gets the usual subjects automatically.
- **Teachers:**
  - For each teacher you can set their subjects, the most periods per week and per day, the fewest free periods per day, and the days they come to the school. The last one helps with part-time teachers for subjects like Music or Drawing.
  - The whole teacher list can be imported at once from an **Excel / Google Sheets** file.
- **Timetable generation:** one button creates the timetable. In it:
  - No teacher is in two classes at the same time.
  - No subject appears too often in one day.
  - Subjects are spread across the week.
  - Every teacher keeps free periods each day.
- **Language groups:** the app handles the case where 6A, 6B and 6C meet together for the Language period and split into Malayalam, Arabic and Urdu groups.
- **Editing the timetable:** move around with the arrow keys and change any period, swap two periods, or lock a period. Ctrl+Z undoes a change.
- **Substitutions:** type the names of teachers on leave, and the app shares the free teachers out **fairly**.
  - Teachers who teach that class or that subject get priority.
  - Share the list on **WhatsApp** or save it as a **PDF**.
- **Now:** see in real time who is in which class and which teachers are free.
- **Reports:** who took how many substitutions, who took how much leave, how many periods each class lost.
- **Special days:** after rain holidays, a Saturday can follow "Monday's timetable".
- **Other:** Malayalam / English interface; light, dark and high-contrast themes; adjustable text size.

### Privacy

All information stays on your own computer. No internet connection is needed, and nothing is sent anywhere. A message only leaves your computer when you share it on WhatsApp with the person you choose.

### Free and open source

This is free software under the MIT licence. Anyone may use, share and improve it at no cost. Source code: <https://github.com/hamsajaisal/samayam>

---

## 2. Installing

1. Open <https://github.com/hamsajaisal/samayam/releases> in your browser.
2. Press **H** to move to the heading of the latest version, for example "Samayam 1.3.0".
3. Under it, in the "Assets" section, there are two files:
   - **Samayam-Setup-…exe**: a normal installer that creates Start menu and desktop shortcuts. Best for most people.
   - **Samayam-Portable-…exe**: runs without installing, so you can carry it on a pen drive.
4. Press Enter on the link you want to download it.
5. Open the downloaded file. The first time, Windows may show **"Windows protected your PC"**. This is because the file is not digitally signed.
   - Press Tab to reach the **"More info"** link and press Enter.
   - Press Tab again to reach the **"Run anyway"** button and press Enter.
6. In the installer, use Tab and Enter to press **Next**, **Install** and **Finish**. If "Run Samayam" is ticked, the app opens when installation finishes.
7. To open the app later: press the **Windows key**, type "Samayam" and press Enter.

> **When a new version comes out:** download the new Setup file and install it. Your data is kept. Still, it is wise to take a backup first ([section 14](#14-import--export--backup-alt9)).

---

## 3. How the app is laid out, and keyboard basics

### Screen layout

The app window has two parts:

1. **The main menu on the left:**
   - Screen readers announce it as a "navigation landmark".
   - It has ten buttons: Today, Now, Leave & Substitution, Timetable, Classes & Subjects, Teachers, School Profile, Reports, Import / Export, Settings.
   - The button for the page you are on is announced as "current page".
2. **The main area on the right:**
   - This shows the content of the chosen page.
   - Every page starts with a **Heading 1**. Each part of a page has a **Heading 2**.

### The most important keys

| Key | What it does |
|---|---|
| **Alt+1** to **Alt+9**, **Alt+0** | Jump straight to one of the ten pages (see the table below) |
| **Tab** / **Shift+Tab** | Next / previous button, box or list |
| **Enter** | Press a button; in a form, save the form |
| **Space** | Tick or untick a checkbox; press a button |
| **Up and Down arrows** | Change the choice in a list (combo box); change radio buttons; increase or decrease the number in a number box |
| **Escape** | Close an open dialog without saving |
| **F1** | Open this guide |

Page shortcuts:

| Shortcut | Page |
|---|---|
| Alt+1 | Today (dashboard) |
| Alt+2 | Now |
| Alt+3 | Leave & Substitution |
| Alt+4 | Timetable |
| Alt+5 | Classes & Subjects |
| Alt+6 | Teachers |
| Alt+7 | School Profile |
| Alt+8 | Reports |
| Alt+9 | Import / Export |
| Alt+0 | Settings |

### How the app talks to you

- **Opening a page:** when you press Alt+number or a menu button, focus goes straight to that page's **heading** (Heading 1), and the screen reader reads the page name. From there, read downwards, or press Tab to reach the first control.
- **After every action:** the screen reader announces what happened on its own (through a live region), for example "Saved.", "Sreeja K added." or "Timetable generated. All periods placed without clashes." So you don't need to check the screen each time. Sighted users see the same message in a small box at the bottom right.
- **Saving data:** **you don't need to press "Save".** Make a change and press Tab to leave the field, and it is saved. The only exceptions are the School Profile form and dialogs, where you press the "Save" button.
- **Lists (combo box / select):** in lists such as teacher, substitute, leave type or language, moving through the options with the arrow keys only reads them out; nothing is saved. When you reach the option you want, press **Enter** or press **Tab** to leave the list, and then the change is saved.

### Dialogs

Some actions open a small dialog window. Examples: editing a teacher, changing a period, or confirming before something is deleted.

- When a dialog opens, focus goes to its first box. While it is open, Tab moves only inside the dialog.
- At the end of the dialog there are two buttons: first **Save** (or Yes / Delete / Restore and so on), then **Cancel**.
- Pressing **Enter** in a text box inside a dialog also saves.
- Pressing **Escape** closes the dialog without changing anything.
- When the dialog closes, focus returns to the button that opened it.

### Boxes where you can type or choose (editable combo box)

The boxes for choosing a class or a teacher work in two ways. Examples: the box for adding a teacher on leave, the "Class" box on the Timetable page, and the "Class / Teacher" box on the Now page.

- **Type:** when the box gets focus, the current name is selected, so you can type straight away, for example `8b`, `8 B` or `+1 s1`. For a teacher you can type the first letters of the name or the short name (`SK`). Then press **Enter**.
- **Choose:** clear the text in the box (Ctrl+A, then Delete) and press the **Down arrow** to open the list. Move with the arrow keys and press Enter.
- **More than one match:** for example, typing only `8` matches 8A, 8B and others. The app then says "2 matches. Type more…" and nothing changes. Type more, or choose from the list.
- **Correct choice:** the app says, for example, "6B selected."

---

## 4. First steps: try the demo school

Before entering your own school, it is a good idea to get to know the app with a demo school. You can also use it for a B.Ed presentation.

1. The first time you open the app, the "Welcome! Set up your school" page appears.
2. Press Tab to reach the **"Try with demo school"** button and press Enter. (To load it later: Alt+9 → "Load demo school".)
3. The app says "Demo school loaded with 12 classes…" and opens the Timetable page.
   - The demo school has classes 5 to 10, two divisions each, and about 26 teachers.
   - Each standard also has a combined Language group.
4. Press Tab to reach the **"Generate timetable"** button and press Enter.
   - A dialog with some warnings may appear. Press **"Generate"**.
   - Within a few seconds the app says "Timetable generated. All periods placed without clashes."
5. Now explore the timetable grid ([section 9](#9-timetable-alt4)).
6. Press Alt+3, put a teacher on leave and create substitutions ([section 10](#10-leave--substitution-alt3)).

> **Note:** loading the demo replaces all existing data. If you need to load the demo after entering your own school, take a backup first. When you have finished with the demo and want to start your own school: Alt+9 → **"Delete all data"**.

---

## 5. Setting up your own school – step by step

Do it in this order the first time. Each step is explained in detail in the later sections.

| Step | Where | What to do |
|---|---|---|
| 1 | School Profile (Alt+7) | School name, sections, weekly holidays, periods per day, period timings. Then "Save school profile". |
| 2 | School Profile → Classes and divisions | Enter how many divisions each standard has and press "Create classes". |
| 3 | Classes & Subjects (Alt+5) → Periods per week by standard | Check and correct how many periods per week each subject has. Each standard's Total must equal the number of periods in a week. |
| 4 | Classes & Subjects → Combined periods | If divisions meet together for the Language period, set that up. |
| 5 | Teachers (Alt+6) | Add the teachers: one by one, or all at once from Excel. |
| 6 | Classes & Subjects (Alt+5) | "Auto-assign teachers" gives every subject in every class a teacher. Then change any by hand as needed. |
| 7 | School Profile → Classes and divisions | Choose a class teacher for each class (optional, but it helps with substitutions). |
| 8 | Timetable (Alt+4) | "Generate timetable". Then make any changes you need. |
| 9 | Timetable | Save "PDF: all classes" and "PDF: all teachers", and print them. |
| 10 | Import / Export (Alt+9) | "Save backup" and keep the file on a pen drive or in Google Drive. |

The **"Setup checklist"** on the **Today** page (Alt+1) shows what is still left. Each unfinished step has a **"Go"** button next to it.

---

## 6. School Profile (Alt+7)

At the top of this page there is a small **"On this page"** menu with four buttons:

1. Basic details
2. Periods and timings
3. Classes and divisions
4. Special days

Pressing Enter on one moves focus to the heading of that part. The page is long, so use this menu. When you set up for the first time, only the first two parts are there. Classes and Special days appear after the profile has been saved.

### 6.1 Basic details

Press Tab to move to each one:

1. **School name** – required.
2. **Place**.
3. **Sections in this school** – four checkboxes. Tick the ones you have with **Space**:
   - Lower Primary (LP): 1–4
   - Upper Primary (UP): 5–7
   - High School (HS): 8–10
   - Higher Secondary (HSS): +1, +2
4. **Weekly holidays** – radio buttons. Change them with the arrow keys:
   - **Saturday and Sunday** – most schools (Monday–Friday are working days)
   - **Friday and Sunday** – Monday–Thursday and Saturday are working days
   - **Sunday only** – Monday–Saturday are working days
   - **Other** – tick the days yourself below

   When you choose one, the app says "Working days: Monday, Tuesday, …".
5. **Working days** – checkboxes for Monday to Saturday. These change automatically with the choice above.
6. **Periods per day** – 1 to 12. Changing it also changes the number of rows in the timings table below.
7. **Lunch break after period** – for example 4. Half-day leave ("Forenoon" / "Afternoon") is split at this point.
8. **Max substitutions per teacher per day** – the most substitutions one teacher gets in a day. Usually 2.
9. **Minimum free periods per teacher per day** – the fewest free (leisure) periods each teacher keeps per day. Usually 1. Both timetable generation and substitutions respect this.
10. **Fairness window (days)** – how many days back the app looks to share substitutions fairly. Usually 30. Teachers who took more substitutions in the last 30 days get fewer new ones.
11. **Default max periods per week (teacher)** – usually 25.
12. **Max periods per week (senior / HM)** – for senior teachers / HM. 0 means the normal teacher limit is used.
13. **"What are the workload rules?"** – press Enter to open an explanation:
    - UP / HS: one post per 25 periods a week.
    - HSS: 15 or more periods a week in a subject is HSST; fewer is HSST (Junior).

> The rules shown here come from the Kerala Education Rules (KER) and High Court judgments. Orders can change, so confirm the latest order with your HM.

### 6.2 Periods and timings

Enter when each period starts and ends. The **Now** page (which period is on now) works from these times. They also appear in substitution messages and PDFs.

**The easy way – fill timings automatically:**

1. Press Enter on **"Fill timings automatically"** to open it.
2. Enter:
   - **First period starts at**
   - **Period length (minutes)**
   - **Short break after period** – which period the short break comes after
   - **Short break (minutes)**
   - **Lunch break (minutes)**
3. Press the **"Fill timings automatically"** button. The times of all periods appear in the table.

**Typing in time boxes:** these have three parts: hour, minute and AM/PM. For example, typing `0930` moves focus to the minutes by itself. Then type `A` (AM) or `P` (PM). You can also change each part with the Up and Down arrows, and move between parts with the Left and Right arrows.

**The timings table:** each period has two boxes, **Starts** and **Ends**. The screen reader reads each box as, for example, "Period 3 Starts".

**When one day, such as Friday, has different timings:** for example, the other days start at 10:00 and Friday starts at 9:30, or Friday has a longer lunch break.

1. First choose **"Normal days"** in the **"Timings for"** list and enter the normal timings.
2. Now in the same **"Timings for"** list, choose **Friday** with the arrow keys.
3. Press Tab to reach the **"Friday has different timings"** checkbox, and tick it with **Space**. A copy of the normal timings appears.
4. Change Friday's timings. You can also use "Fill timings automatically" for Friday alone.
5. Days with their own timings show as "Friday – own timings" in the "Timings for" list.
6. To make that day use the normal timings again, untick the checkbox.

**Finally:** press the **"Save school profile"** button. Pressing Enter in any text box of the form also saves. The app says "Saved."

### 6.3 Classes and divisions

When you save the profile for the first time, focus comes straight to this part.

**To create all divisions at once:**

1. Each standard has a number box, read as, for example, "Standard 5 – divisions". Type the number of divisions. For example, 3 gives 5A, 5B and 5C.
2. Higher Secondary has boxes such as "+1 Science – batches", "+1 Commerce – batches" and "+1 Humanities – batches". These give names like `+1 S1`, `+1 C1` and `+1 H1`.
3. Press **"Create classes"**. The app says, for example, "15 classes created with standard subjects."
4. Each class gets the usual subjects of its section, filling the periods of a week. These are only editable **starting values**. Correct them in [section 8](#8-classes--subjects-alt5).
5. If you need another division later, increase the number and press "Create classes" again. Only the new ones are added; existing classes don't change.

**To add a single class ("Add one class"):**

- **Class name**
- **Section** – LP / UP / HS / HSS
- **Stream (HSS only)**
- **Add standard subjects** – checkbox
- Then the **Add** button.

**The classes table:** each row has:

- The class name. You can edit it; change it and press Tab to save.
- The section.
- **Class teacher** – a list for choosing the class teacher. The class teacher gets a small priority in substitutions.
- A **Delete** button. The app asks for confirmation before deleting.

Use your screen reader's table keys in this table (in NVDA, Ctrl+Alt+arrow keys).

### 6.4 Special days

**When you need it:**

- After two or three days of rain holidays, the Collector directs that classes be held on a Saturday following **Monday's timetable**.
- A working day is declared a special holiday.

**To add one:**

1. **Date** – it has three parts: day, month and year. Their order follows the date format set in Windows. Type a number in each part, and focus moves to the next part by itself. The Up and Down arrows also work.
2. **What happens** – two options: "Classes, following the timetable of…" or "Holiday – no classes".
3. **Timetable of** – which day's timetable to follow (for example Monday).
4. **Note** – for example "Collector's order".
5. The **Add** button.

The table below lists the days you added. Remove any of them with its **Remove** button.

On that day, the Now page, the Today dashboard and substitutions all use that day's timetable. You can also do this straight from the Leave page ([section 10.1](#101-choosing-the-date)).

---

## 7. Teachers (Alt+6)

You can add teachers in two ways: **all at once from an Excel / Google Sheets file** (the easiest), or **one by one**.

### 7.1 Importing from Excel / Google Sheets

This is the easiest way. Just ask the HM or the office staff to fill in a sheet.

**Download the template:**

1. On the Teachers page, press the **"Download teachers template"** button.
2. The Windows "Save" dialog opens with the file name `Teachers_template.xlsx`. Press Enter to save. It usually goes into the Documents folder.
3. The file has three sheets:
   - **Teachers** – the sheet to fill in with the teachers' details.
   - **Subjects list** – the exact subject names in your school. Copy names from here when filling in.
   - **Classes list** – the class names.

**Columns in the Teachers sheet:**

| Column | What to write | Required? |
|---|---|---|
| Name | Full name, or initials such as "J.K.P" | Yes |
| Short name | The short name shown in the timetable (e.g. JKP). If left empty, the app makes one. | No |
| Senior/Junior | Senior or Junior | No |
| Subjects | Subjects taught, separated by commas (e.g. English, Hindi, Basic Science). It is fine for a UP teacher to teach several subjects. | Yes |
| Classes | Classes to give this teacher (e.g. 5A, 6B). For a whole standard, just write 8. | No |
| Max periods per week | Most periods per week | No |
| Available days | Days a part-time / specialist teacher comes (e.g. Monday, Wednesday). Empty means every day. | No |
| Phone | Phone number | No |

**If you use Google Sheets:**

1. Upload the template to Google Drive and open it in Google Sheets.
2. Share it with the HM and ask them to fill it in.
3. When it is filled in, download it with **File → Download → Microsoft Excel (.xlsx)**.

**Import it:**

1. On the Teachers page, press the **"Import teachers from Excel"** button.
2. The Windows "Open" dialog appears. Type the file name, or find the file with Tab and the arrow keys, and press Enter. `.xlsx` and `.csv` files are accepted.
3. **When the app does not recognise some subjects in the file:** a "Match the subjects in the file" dialog appears.
   - The app recognises common short forms such as "Maths", "Social" and "Eng" on its own.
   - But if the file just says "Malayalam", the app cannot tell whether that is Malayalam I or II.
   - For each such name there is a list that starts with "In the file: "Malayalam"". Choose one of three options with the arrow keys:
     - **Create a new subject** – make a new subject with this name. For example, a subject the school does not have yet, such as Music.
     - **Ignore** – leave this subject out.
     - A subject in the **Same as** group – this name means that existing subject.
   - Finally press **"Continue import"**.
4. A "Teachers imported" dialog appears. It says how many teachers were added, how many were updated and how many classes were given out. It also lists any classes that could not be found.
5. Pressing **"Assign and generate timetable"** in this dialog does two things at once: gives the remaining subjects to teachers automatically, and creates the timetable. To do it later, press **"Not now"**.

**Importing the same file again:** teachers with the same name or short name are not added twice. Only their details are updated.

### 7.2 Adding a teacher by hand

In the "Add teacher" part:

1. **Name** – required.
2. **Short name** – if left empty, the app uses the initials of the name.
3. **Phone**.
4. **Max periods/week**.
5. **Max periods/day**.
6. **Senior teacher / HM** – checkbox.
7. **Subjects** – a checkbox for every subject in the school. Tick the ones this teacher teaches with **Space**.
8. Press the **"Add teacher"** button. Pressing Enter in the Name box also works.

After adding, focus returns to the Name box, so you can type the next teacher's name straight away.

### 7.3 The teachers table

Each row starts with the teacher's name (the row header). Then:

- Short name
- Subjects
- **Workload** – for example "24 / 25": periods given now / limit. Shows "Over limit" if the limit is exceeded.
- The class they are class teacher of
- Three buttons: **Edit**, **Timetable** (opens that teacher's timetable) and **Delete**

### 7.4 Editing a teacher

Pressing **Edit** opens a dialog with:

- Name, Short name, Phone, Max periods/week, Max periods/day.
- **Minimum free periods per day** – for this teacher only. Empty means the school's normal value.
- **Senior teacher / HM** – checkbox.
- **"Comes to this school on"** – a checkbox for each working day.
  - This is for teachers who come only on some days of the week, for subjects such as Music, Drawing or PE. Some work in two schools.
  - Untick the days they don't come. They get no periods and no substitutions on those days.
- **Subjects** – checkboxes.
- **"Not available at these times"** – a table with a checkbox for every period of every day.
  - Each checkbox is named like "Monday Period 3 not available".
  - Tick periods with other regular duties, for example the HM's office work.
  - With this many checkboxes, your screen reader's table navigation (in NVDA, Ctrl+Alt+arrow keys) is the easiest way.

Finally press **Save**, or press Escape to cancel.

---

## 8. Classes & Subjects (Alt+5)

This page decides which subjects each class has, how many periods per week, and who teaches them. Periods in a week = working days × periods per day, for example 5 × 7 = 35. The subjects of each class must add up to **exactly** this number.

The parts of the page, in order. Move between them by their Heading 2 (the **H** key in your screen reader):

### 8.1 Auto-assign teachers button

This button is at the top of the page. For every subject without a teacher, the app chooses the qualified teacher with the lowest workload. If that class's class teacher can teach the subject, they get priority.

It does not change subjects that already have a teacher. If nobody can teach a subject, the app says so. Then go to the Teachers page and tick that subject for someone.

### 8.2 All classes (summary)

One row per class:

- A button with the class name – press it to open that class's subjects below.
- **Periods planned** – for example "35/35". ok if the total is right, a warning if it is short, an error if it is over.
- **Teachers** – "All assigned", or for example "2 without teacher".

### 8.3 Subjects for (one class)

1. Type the class name in the **Class** box (for example `7b`) and press Enter. This is an editable combo box.
2. Below it there is a message: "35 of 35 periods planned ✓", or how many are short / over.
3. The table has one row per subject:
   - **Teacher** list – choose the teacher with the arrow keys.
     - The list shows first a "Teaches this subject" group, then "Other teachers".
     - Each name shows the workload, for example "Sreeja K (SK) – 22/25".
   - **＋** button – "Add parallel teacher for …". For when two teachers teach the same class at the same time.
   - **Periods/week**.
   - **Max/day** – the most periods of this subject in one day. 2 allows a double period.
   - **Remove** – remove the subject from this class.
   - All changes are saved when you press Tab to leave the field.
4. **Add subject** – to add another subject to this class: Subject list, Periods/week, Add.
5. **"Copy this plan to other divisions"** – copies this class's subjects and period counts to the other divisions of the same standard. For example, from 7A to 7B and 7C. Teachers already chosen there don't change.

### 8.4 Periods per week by standard

The same subject can have different periods in different standards. For example, Social Science may have 4 periods a week in Std 8 and 5 in Std 9. This table is the best way to set this for all classes at once.

- How the table is laid out:
  - Each **row** is a subject.
  - Each **column** is a standard. The column heading also lists that standard's divisions.
  - Each cell holds a number box, read as, for example, "Social Science, Std 8, periods per week".
- **How to use it:** type a number and press Tab.
  - It changes in **every division** of that standard, for example 8A, 8B and 8C.
  - The app says "Social Science, Std 8: 4. Total 35 / 35."
  - **0** removes that subject from that standard.
  - Entering a number for a subject a standard doesn't have yet adds it there.
- **"divisions differ" / "≠":** shown when the divisions of one standard have different periods for a subject. Entering a new number makes them all the same.
- **The Total row:** at the end of the table. Shows each standard's total, for example "35/35". Make it equal the periods in a week for every standard.

> Take the official number of periods per week for each subject from the school's current timetable or from the order the HM has, and enter it here once.

### 8.5 Combined periods (language groups)

**When you need it:** 6A, 6B and 6C have the Language period at the same time. The children then split into three groups: those taking Malayalam go with one teacher, Arabic with another, Urdu with a third.

**To create one:** open "Create a combined period". If nothing has been created yet, it is already open.

1. **Subject** – choose from the list (for example "Malayalam II / Arabic / Sanskrit"). If you want a subject named "Language", create it first in the "All subjects" part.
2. **Periods/week**, **Max/day** – numbers.
3. **"Classes that join together"** – tick the classes that sit together with Space, for example 6A, 6B and 6C.
4. **"Teachers (one for each group…)"** – tick each group's teacher. Teachers of that subject come first in the list.
5. **"Remove the separate period of this subject from these classes"** – normally leave it ticked. It removes any separate period of this subject from those classes.
6. Press **"Create combined period"**.

**What this does:**

- When the timetable is generated, the period comes **at the same time** in all three classes, and all three teachers are busy then.
- In a class's subject table it shows as "Combined: 6A + 6B + 6C. Groups taught by: …".
- If one group's teacher is on leave, there is **one** substitution, just for that group.
- To change it later: the **Edit** button in the list. To remove it completely: the **Delete** button.

### 8.6 All subjects

- **New subject:** enter "New subject name" and "Short name" and press "Add subject". For example: Music, MUS.
- **The subjects table:** each row has
  - Name and short name – editable.
  - **Colour** – the colour sighted users see in the grid. Change it with the Left and Right arrows. Screen-reader users can ignore it.
  - How many classes use this subject.
  - A **Delete** button.

---

## 9. Timetable (Alt+4)

### 9.1 How the page is laid out

From top to bottom:

1. **A row of buttons:**
   - **Generate timetable**
   - **Undo** – undo the last change
   - **Clear unlocked periods** – empty every period that is not locked
   - **PDF: this** – the timetable of the class / teacher you are looking at
   - **PDF: all classes** – every class, one page each
   - **PDF: all teachers** – every teacher
   - **PDF: master** – one page per day with all classes
   - **Excel** – the complete timetable as an Excel file
2. **Messages:** the result of generating, a list of clashes, and so on.
3. **View by:** **Class** / **Teacher** radio buttons. Change them with the arrow keys.
4. **Class** (or **Teacher**) box: an editable combo box. For example, type `9a` and press Enter.
5. **List view** – checkbox ([section 9.5](#95-list-view)).
6. **Help:** a short note on how to use the grid.
7. **The timetable grid.**
8. **Saved versions** ([section 9.7](#97-saved-versions)).

### 9.2 Generating the timetable

1. Press the **"Generate timetable"** button.
2. First the app checks your information:
   - **If there is a serious problem**, a "Please fix these first" dialog appears. For example, a class has more periods than there are in a week, or a teacher has more periods than is possible. It lists the problems. Read them, press Close and fix them.
   - **If there are only small warnings**, a "Check before generating" dialog appears. For example, a subject has no teacher, or a class will have some empty periods. To generate anyway, press **"Generate"**.
3. The app says "Generating timetable, please wait…". It usually takes a few seconds.
4. **The result:**
   - "Timetable generated. All periods placed without clashes." – all done.
   - Or "… periods could not be placed". A list on the page shows which subject of which class could not be placed, and how many periods. You can then:
     - Generate again. Each attempt is a fresh try.
     - Reduce that teacher's workload.
     - Increase that subject's "Max/day".
     - Place them by hand in empty periods.

**Rules the app follows:**

- One subject per period for a class.
- A teacher is in only one place in a period.
- Times when a teacher is unavailable and days they don't come are avoided.
- Each teacher's maximum periods per day and minimum free periods are respected.
- Each subject's "Max/day" is respected.
- Locked periods are not moved.
- A subject is spread across the week as much as possible. If it comes twice in one day, it is placed side by side (as a double period) when possible.

### 9.3 Moving around the grid

The grid is a table:

- Each **row** is a day (Monday, Tuesday, …).
- Each **column** is a period. The heading has "Period 3" and that period's time.
- Each cell contains:
  - In class view: the full subject name and the teacher's name, for example "Mathematics, Anil Kumar P".
  - In teacher view: the class and the subject.
  - It also reads "Locked" if the period is locked, "Clash" if there is a clash, and "Combined with 6B + 6C" for a combined period.
  - If a day has its own timings (for example Friday), the cells of that day also read the time.

**Getting into the grid:** keep pressing Tab and you reach the grid. The whole grid is a single Tab stop. When you arrive, focus is on the cell you were last on. Press Tab to leave the grid.

**Keys inside the grid:**

| Key | Action |
|---|---|
| Right / Left arrow | Next / previous period |
| Down / Up arrow | Next / previous day |
| Home / End | First / last period of the day |
| Ctrl+Home / Ctrl+End | First / last period of the week |
| **Enter** or **F2** | Change this period (opens a dialog) |
| **Space** | "Pick" this period. Move to another period and press Space again to swap the two |
| **Escape** | Cancel a pick |
| **Delete** or **Backspace** | Empty this period |
| **L** | Lock / unlock this period |
| **Ctrl+Z** | Undo the last change |

> **For NVDA users:** NVDA should switch to "focus mode" by itself when you reach the grid. If the arrow keys read lines of the page instead of moving between periods, press **NVDA+Space** to turn focus mode on. In JAWS, press Enter to turn on Forms mode.

### 9.4 Changing, swapping and locking periods

**Changing the subject of a period (Enter):**

1. Move to the period in the grid and press **Enter**.
2. A dialog opens with a title such as "7B: Tuesday, Period 4 (12:00–12:45)".
3. The dialog has a list of radio buttons:
   - The first is **Empty**.
   - Then each subject of that class with its teacher, for example "Hindi – Deepa Nair. 3/3 placed".
   - If the teacher has another class at that time, that is read too, for example "⚠ Deepa Nair is in 8A".
4. Choose a subject with the **Up and Down arrows**.
5. Press Tab to reach the **"Lock this period"** checkbox. Tick it with Space if needed.
6. Press **Save**.
7. If the chosen teacher has another class at that time, the app asks "Place it anyway?". Pressing "Place anyway" places it, but it shows as a clash.

**Swapping two periods (Space):**

1. On the first period, press **Space**. The app says "Picked Monday Period 2. Move to another period and press Space to swap."
2. Move to the second period with the arrow keys and press **Space** again.
3. The app says "Swapped Monday Period 2 and Thursday Period 5."
4. If the swap would cause a clash for a teacher, the app asks first.
5. To cancel: press Escape, or press Space again on the same period.

Sighted users can also **drag** one period onto another with the mouse to swap them. Double-clicking opens the dialog, like pressing Enter.

**Locking (L):** a locked period stays in place even the next time you press "Generate".

- For example: the last period on Friday must be PT, or a guest teacher comes only on Wednesday morning.
- Place such periods by hand first and lock them. Then Generate, and the app arranges the rest around them.
- A locked period cannot be changed or cleared. Unlock it first with L.

**Combined periods:** these move together in all their classes.

- You cannot swap them with Space. Instead, press Enter on the empty period where they should go and choose that subject. It appears in all the classes at once.
- Pressing Delete removes it from all the classes at once.

### 9.5 List view

To read the timetable as a plain list instead of a grid, tick the **"List view"** checkbox.

- Each day gets a Heading 3, with each period below it as a line: "Period 1 (09:30–10:15): Malayalam I, Sreeja K".
- In class view, each line has a **Change** button. Pressing it opens the same dialog as Enter.
- This is the easiest way to read a whole day at once. Move between days with the **H** key.

### 9.6 Teacher view

Choose **Teacher** under **View by** and type the teacher's name.

- The grid shows which class the teacher is in for each period. Free periods read as "Free".
- You cannot make changes in this view. Pressing Enter on a period opens that class's timetable, with focus on the same period.

The "Timetable" button on the Teachers page also opens this view.

### 9.7 Saved versions

You can keep several versions of a timetable, for example "Term 1" and "Exam week".

1. At the end of the page, press Enter on **"Saved versions"** to open it.
2. Enter a name in the **Version name** box and press **"Save as version"**.
3. The table below lists the saved versions. Each has:
   - **Restore** – bring that version back. The current timetable is replaced, but you can undo this.
   - **Delete** – delete the version.

### 9.8 PDF and Excel

- **PDF buttons:**
  1. Any PDF button opens the Windows "Save" dialog with a file name already filled in, for example `Timetable_All_Classes.pdf`.
  2. Press Enter to save.
  3. A "PDF saved" message box appears. **"Open PDF"** opens the PDF; **"Close"** closes the box.
  4. The PDFs are A4 landscape and ready to print.
- **Excel:**
  - One sheet per class.
  - One sheet per teacher, named "T - name".
  - One sheet per day, named "Master - Monday" and so on.
  - This file can be imported again later.

---

## 10. Leave & Substitution (Alt+3)

This is the most important part of the app. You can use it every morning.

### 10.1 Choosing the date

- The **Date** box already has today's date. To change it, type the day, month and year parts, or use the arrow keys. The order of the parts follows the date format set in Windows.
- **Today** and **Tomorrow** buttons – today's or tomorrow's date in one press. You can prepare tomorrow's substitutions the evening before.
- The chosen date is read out in full, for example "Tuesday 24 November, 2026".
- **If the chosen day is normally a holiday** (for example Saturday), the message "There are no classes on this day…" appears.
  - If there are classes that day: in the **"Classes on this day? Follow the timetable of"** list, choose which day's timetable to follow. Then press **"Make it a working day"**.
- **If the chosen day is a normal working day**, there is a **"Mark this day as a holiday"** button. Use it for a special holiday.
- **If it is a special day**, that is read out. The **"Undo special day"** button makes it a normal day again.

### 10.2 Adding teachers on leave

1. Press Tab to reach the **"Type or choose a teacher"** box.
2. Type the first letters of the teacher's name, for example `sree`, or the short name, for example `SK`. You can also choose from the list with the Down arrow.
3. To change the leave type, **before pressing Enter** press Tab, choose an option in the **"Leave type"** list, and come back with Shift+Tab. The options are:
   - **Full day**
   - **Forenoon** – the periods before lunch only
   - **Afternoon** – after lunch only
   - **Specific periods** – only some periods
4. Press **Enter**, or press the **Add** button. The app says "Sreeja K added (Full day). 1 absent."
5. Focus returns to the name box, so you can type the next teacher's name straight away. Add as many as you need.
6. If the name matches more than one teacher, the app says "No single teacher matches. Type more of the name."

**Each teacher you add gets a row below:**

- The teacher's name.
- **Leave type** – you can change the leave type here later.
- **"Work for the class (optional)"** – what the children should do in those classes, for example "Revise chapter 2" or "Page 45 exercise". This goes into the substitution message, so the substitute teacher knows.
- If you choose **Specific periods**, checkboxes with the period numbers (1, 2, 3, …) appear. Tick the periods of leave.
- **Remove** – take the teacher off the list.

### 10.3 Creating substitutions

1. Press the **"Create substitutions"** button.
2. Focus goes straight to the heading of the result, for example "Substitutions for Tue, 24 Nov 2026: 9 periods, 9 covered". The app also says this aloud.
3. Each row of the result table has:
   - **Period** – the period and its time
   - **Class**
   - **Subject**
   - **Absent** – the teacher on leave
   - **Substitute** – the teacher going instead. This is a list you can change.

**How the app chooses a substitute:**

- Only teachers who are **free in that period** are considered.
- **Priority goes to:** teachers who teach that class, teachers of the same subject, and the class teacher of that class.
- **Fairness:** teachers with fewer periods today and fewer substitutions in the last 30 days come first. So the same people don't always get the substitutions.
- **Left out:**
  - Teachers who have reached the daily substitution limit (usually 2).
  - Teachers who would lose their last free period of the day.
  - A period sandwiched between two classes gets lower priority.
- **Only if nobody else is free** does the app use someone past the limit. That row then shows "over daily limit".

**Changing a substitute by hand:**

1. Press Tab to reach that row's **Substitute** list. The screen reader reads it as, for example, "Substitute: Period 3, 7B".
2. Change it with the Up and Down arrows. The list is laid out like this:
   - **First:** "⚠ No substitute" – nobody.
   - **"Free" group:** teachers free in that period, best first. Each comes with the reasons, for example "Divya Mohan – teaches this class · 1 periods today".
   - **"Busy at this time" group:** teachers with a class then, and which class. Don't choose these.
3. Moving through the list with the arrow keys changes nothing; the app only reads the names. When you reach the person you want, press **Enter** or press **Tab** to leave the list, and then the change is saved. The app says "Anil Kumar P will take 7B, Period 3."

**"Re-assign automatically"** throws away the changes you made by hand and lets the app decide everything again.

**Everything is saved automatically.** If you open the same date later, the leave list and substitutions are still there.

**If you change the leave list later:** for example, one more teacher goes on leave. The message "The absent list changed. Press Create substitutions again…" appears. Press "Create substitutions" again. Rows you changed by hand are kept as far as possible.

### 10.4 Sharing on WhatsApp, and PDF

There are four buttons below the result:

- **Share on WhatsApp:**
  1. The WhatsApp Desktop app opens with the message ready.
  2. Choose whom to send it to (for example the staff group) and send it.
  3. The message is also copied to the clipboard. If the message doesn't appear in WhatsApp, open the group and press **Ctrl+V** to paste it.
  4. If WhatsApp Desktop is not installed, WhatsApp Web opens in your browser.
- **Copy text** – copies the message. Paste it anywhere with Ctrl+V: Telegram, SMS, email.
- **Save PDF** – saves a PDF named `Substitution_2026-11-24.pdf`. It has the school name, the date, the teachers on leave and the table. Each row has a signature column, and at the end there is space for "Prepared by" and "Headmaster" to sign. Print it for the notice board.
- **Re-assign automatically** – see [section 10.3](#103-creating-substitutions).

**"Message preview":** you can read the message before sending it. Press Enter on this part to open it. The message is in a read-only text box; read it line by line with the arrow keys.

The message looks like this:

```
*Substitution – Tuesday 24 November, 2026*
Govt. Model School

Absent: Sreeja K (Full day), Rajesh M (Afternoon)

*Period 1 (09:30–10:15)*
• 9A – Malayalam I → Vinod K (for Sreeja K)
   Work: Revise chapter 2
...
*Duty list*
Vinod K: P1 9A, P5 8B
```

The **"Duty list"** at the end gives each teacher, on one line, which periods and where they have to go that day.

---

## 11. Now (Alt+2)

This page answers questions like "Which period is on in 8B now, and who is in the class?" and "Where is this teacher now?".

1. The **Show** list has three options:
   - **Whole school** – what is happening in every class now, and who is free.
   - **One class**
   - **One teacher**
2. **Class / Teacher** box: appears only for One class or One teacher. Type the name and press Enter.
3. **Day** and **Period** lists: normally "Today (live)" and "Current (live)", meaning the time right now. Choose another day and period to look up, for example, "What is 7A doing in the third period on Thursday?".
4. **"Read aloud summary"** – the app reads out the main answer.

**What each option gives:**

- **One class:**
  - The current period and its time.
  - The subject and teacher. Today's substitutions are included, for example "Anil Kumar P (substitute for Sreeja K)".
  - The next period too.
- **One teacher:**
  - Where they are now: in which class, on substitution duty, free, or on leave.
  - A list of all their periods for the day.
- **Whole school:**
  - A table of all classes.
  - "Free teachers now" – useful when you urgently need someone.

During a break it says "Break now. Next: Period 3", before school "Before school", and after school "School is over for today.". In live mode, the result refreshes every 30 seconds. If the refresh interrupts your reading in browse mode, choose a fixed day and period in the Day and Period lists; then the result stops refreshing.

---

## 12. Today dashboard (Alt+1)

This is the page you see first when the app opens. It has:

- **Today's date and the school name.** If today is a special day, that is shown too.
- **Four summaries:**
  - The current period
  - How many teachers are on leave today
  - Substitutions: how many periods are covered, out of how many
  - The number of classes and teachers
- **Three buttons:** "Mark leave & create substitutions", "What is happening now" and "Timetable".
- **Absent today:** the list of teachers on leave today. If some periods have nobody, the warning "… periods are not covered yet." appears.
- **Setup checklist:** shows what is left when setting up for the first time.
  - Each line starts with "Done" or "Not done".
  - Unfinished ones have a **Go** button that opens the right page.

---

## 13. Reports (Alt+8)

1. Enter the **From** and **To** dates. They start as the first of this month to today.
2. There are four tables. Each has a Heading 2, so you can reach them with the H key:
   - **Substitutions taken** – how many substitutions each teacher took, most first. This shows whether substitutions are shared fairly.
   - **Leave taken** – each teacher's full days, half days and single-period leave.
   - **Periods lost per class** – for each class, the periods without its teacher, how many were covered, and how many were lost.
   - **Teacher workload** – periods given to each teacher, periods in the timetable, the limit, and the status.
3. Save the report with the **Excel** or **PDF** button, for a staff meeting or for the HM.

---

## 14. Import / Export / Backup (Alt+9)

### Excel

- **Export timetable to Excel** – save the complete timetable as an Excel file.
- **Download teachers template** – the template for teachers' details ([section 7.1](#71-importing-from-excel--google-sheets)).
- **Download timetable template** – an empty sheet for each class.
- **Import teachers from Excel** – import the teacher list.
- **Import timetable from Excel** – import a timetable the school already uses.

**To import an existing timetable, the Excel file must look like this:**

- One sheet per class, named with the class name, for example `5A` or `+1 S1`.
- First row: `Day`, `P1`, `P2`, `P3`, …
- Then one row per day: `Monday`, `Tuesday`, …
- Each cell: "subject / teacher's short name", for example `Mathematics / SK`.
- For two teachers: `Arabic / AK + SN`.

When importing, the app:

- Creates missing subjects and teachers by itself.
- Recognises periods that occur in several classes at the same time with the same teachers as a "combined period".
- Exported Excel files from this app use the same layout. Sheets whose names start with "T - " or "Master" are skipped when importing.

Open the "Excel format help" part to read this inside the app too.

### Backup

- **Save backup:** saves everything as a single file: school, teachers, timetable, leave and substitution history. The file is named `Samayam-backup-date.json`.
  - Keep this file on a pen drive or in Google Drive.
  - **Take a backup at least once a week.** Then you won't lose data even if the computer breaks down.
- **Restore from backup:** choose a backup file, and all current data is replaced with it. The app asks first. This is also how to move to another computer.

### Demo and reset

- **Load demo school** – load the demo school. Current data is replaced.
- **Delete all data** – delete everything. **This cannot be undone.** Take a backup first.

---

## 15. Settings (Alt+0)

- **Language:** English or Malayalam (മലയാളം). The interface language changes at once. The main headings and buttons become Malayalam; some explanations are still in English.
- **Theme:** System (Windows' setting), Light, Dark, **High contrast**. High contrast helps people with low vision: black background, white text and yellow buttons.
- **Text size:** 90% to 150%.
- **Keyboard shortcuts:** a table of all shortcuts.
- **About:** the app version and where the data file is kept. There are two buttons here:
  - **User guide (F1)** – opens this guide.
  - **Open data folder** – opens the folder with the data file.

Data is kept in the file `%APPDATA%\Samayam\samayam-data.json`. Each time it saves, the previous version is kept as a `.bak` file.

---

## 16. A typical day

**In the morning, about 5 minutes:**

1. Open the app. The Today page appears.
2. Press **Alt+3**. The date is already today.
3. Press Tab to reach the "Type or choose a teacher" box.
4. Type the name of each teacher on leave and press Enter. For half-day leave, change the leave type.
5. If needed, write an activity for the children under "Work for the class".
6. Press **"Create substitutions"**. The app says how many periods there are and how many are covered.
7. Check the table. Change a substitute if you want to.
8. Press **"Share on WhatsApp"** and send it to the staff group. Or press **"Save PDF"**, print it and put it on the notice board.

**During the day:** to find out who is free right now, press **Alt+2** and read the "Free teachers now" list in the Whole school result.

**Once a week:** **Alt+9** → **"Save backup"**.

**Once a month:** **Alt+8** → look at the reports to check that substitutions are shared fairly.

---

## 17. Screen reader tips

### NVDA

- **Browse mode / focus mode:**
  - When reading a page, NVDA is in "browse mode", and the arrow keys read line by line.
  - When you reach a box, list or the grid, NVDA switches to "focus mode" by itself.
  - If it doesn't switch, press **NVDA+Space**.
- **Useful keys in browse mode:**
  - **H** / **Shift+H** – next / previous heading
  - **1**, **2**, **3** – straight to Heading 1, 2 or 3
  - **B** – next button
  - **E** – next text box
  - **C** – next list (combo box)
  - **X** – next checkbox
  - **T** – next table
  - **D** – next landmark: the menu, the main area
- **NVDA+F7:** the Elements list. Gives lists of headings, buttons and form controls. Use it to jump to something on the page quickly.
- **In tables:**
  - Move between cells with **Ctrl+Alt+arrow keys**.
  - As you move, NVDA reads the cell's column heading (for example "Period 3") and row heading (for example "Monday").
- **Announcements:** NVDA reads the app's announcements on its own as you work. If you missed one, **NVDA+Up arrow** (on a laptop, NVDA+L) reads the current line again.

### JAWS

- **Forms:** press Enter in a form box to turn on Forms mode. You need Forms mode to use the arrow keys in the grid.
- **Lists:**
  - **Insert+F6** – list of headings
  - **Insert+F7** – list of links
  - **Insert+Ctrl+B** – list of buttons
- **In tables:** **Ctrl+Alt+arrow keys**.

### Windows Narrator

- **Caps Lock+Space:** turns scan mode on / off.
- **In scan mode:** H (headings), B (buttons) and T (tables) work as in NVDA.

### For people with low vision

- **Settings (Alt+0):** Text size 130% or 150%; Theme "High contrast" or "Dark".
- **Windows Magnifier:** press **Windows+Plus** to turn it on and enlarge parts of the screen.
- The focused button or box has a thick yellow outline around it.

---

## 18. All keyboard shortcuts

### Anywhere

| Key | Action |
|---|---|
| Alt+1 | Today |
| Alt+2 | Now |
| Alt+3 | Leave & Substitution |
| Alt+4 | Timetable |
| Alt+5 | Classes & Subjects |
| Alt+6 | Teachers |
| Alt+7 | School Profile |
| Alt+8 | Reports |
| Alt+9 | Import / Export |
| Alt+0 | Settings |
| F1 | Open this guide |
| Tab / Shift+Tab | Next / previous control |
| Escape | Close a dialog |

### In the timetable grid

| Key | Action |
|---|---|
| Arrow keys | Move between periods and days |
| Home / End | First / last period of the day |
| Ctrl+Home / Ctrl+End | First / last period of the week |
| Enter / F2 | Change the period (in teacher view: open that class) |
| Space | Pick, then swap |
| Escape | Cancel a pick |
| Delete / Backspace | Empty the period |
| L | Lock / unlock |
| Ctrl+Z | Undo (on the Timetable page, when not inside a box) |

### In boxes and lists

| Key | Action |
|---|---|
| Enter (in the leave teacher box) | Add the teacher to the leave list |
| Enter (in a class / teacher combo box) | Choose the typed name |
| Down arrow (in a combo box) | Open the list of options |
| Enter (in a list) | Save the chosen option |
| Enter (in a form) | Save the form (School Profile, Add teacher, dialogs) |
| Space | Tick / untick a checkbox |

---

## 19. Common questions and troubleshooting

**In the timetable grid, the arrow keys read the page instead of moving between periods.**
NVDA is in browse mode. Press **NVDA+Space** to turn focus mode on. In JAWS, press Enter to turn on Forms mode.

**"… periods could not be placed" appears.**
Check these one by one:

1. In the "All classes" table on the Classes & Subjects page, does every class have the right total, such as 35/35?
2. On the Teachers page, does anyone show "Over limit"?
3. Does a teacher have too many "Not available" times?
4. Is a subject's "Max/day" too low?

Then Generate again.

**One teacher gets too many substitutions.**
Lower "Max substitutions per teacher per day" in the School Profile. Check the "Substitutions taken" table in Reports to see whether they are shared fairly.

**A teacher has classes all day with no free period.**
Make sure "Minimum free periods per teacher per day" in the School Profile is at least 1. Then Generate again.

**WhatsApp opened, but the message didn't appear.**
The message is on the clipboard. Open the group in WhatsApp, press **Ctrl+V** and then Enter.

**Windows shows the "More info / Run anyway" warning.**
This is because the file is not digitally signed. It is not a security problem. See [section 2](#2-installing).

**I need to move the data to another computer.**

1. On the old computer: Alt+9 → "Save backup".
2. Install the app on the new computer.
3. Alt+9 → "Restore from backup" → choose that file.

**I made a change to the timetable by mistake.**
On the Timetable page, press **Ctrl+Z** or the "Undo" button. You can undo up to the last 40 changes. This works only while the app is open, so save an important timetable with "Save as version".

**I found a problem, or I have a new idea.**
Write it as an "Issue" at <https://github.com/hamsajaisal/samayam/issues>, in Malayalam or English.

---

*Samayam – may every class have a teacher.* 🙏
