# Google Stitch prompt: Zuratax Tasker

Ниже находится готовый основной промпт. Его следует отправлять вместе с последним удачным макетом Zuratax или ссылкой на существующий Stitch-проект, чтобы сохранить визуальный язык приложения. Исходный код фронтенда для первой генерации не нужен.

```text
Design a high-fidelity desktop-first Tasker workspace for Zuratax, a private multi-user company workspace application that is publicly available as open-source software. Keep the established Zuratax visual language from the attached/current project, but redesign the task-management experience to be significantly more compact, practical and information-dense.

PRODUCT IDENTITY
- The product name is Zuratax. Never call it Telefront or Teftele.
- This is an authenticated operational workspace, not a public marketing page.
- Light theme only. Do not create, suggest, preview or reserve controls for a dark theme.
- The personality is corporate-modern, clever and slightly playful, without looking childish.
- Use the existing blue Tasker module accent (#0f62c3), neutral off-white/slate surfaces, thin borders and subtle shadows.
- Use Inter for UI and JetBrains Mono for task keys, dates and technical data.
- Localization is mandatory: Russian, English and Simplified Chinese. Design flexible controls that tolerate longer Russian labels and compact Chinese text. Show this concept in Russian first.

DENSITY — CRITICAL
The current prototype feels like browser zoom is set to 150%. Correct that decisively.
- Base text: 13–14 px.
- Dense task rows: 32–36 px.
- Inputs and ordinary buttons: approximately 32 px high.
- Header: approximately 48 px.
- Use a strict 4 px spacing grid.
- Avoid giant typography, oversized buttons, huge padding, large empty cards, excessive rounded containers and dashboard-like decoration.
- Optimize for displaying many real tasks on a 1440×900 work screen while remaining calm and readable.

GLOBAL SHELL
- Preserve the compact Zuratax module rail/sidebar and top application header.
- Clearly show the active scope, for example “Работа”, using a small colored indicator and a compact scope-switcher trigger.
- Do not place all scopes as permanent buttons in the header.
- Scope switching may require a PIN, but the PIN dialog is not the main focus of this design.
- Include global search/command access, notifications, language switcher and current user avatar without making the header tall.

CREATE ONE COHERENT TASKER EXPERIENCE WITH THESE STATES
1. A dense Kanban board as the main screen.
2. A dense list view using the same tasks and filters.
3. A right-side task inspector open over the board, without navigating away.
4. A small quick-create interaction integrated into a column or toolbar.

MAIN TOOLBAR
- Title “Задачи”.
- View switcher: “Доска / Список”.
- Saved view selector, compact filters, assignee filter, project filter and sort.
- A prominent but compact “Новая задача” action.
- A “Мои задачи” shortcut.
- Search must recognize human task keys such as ADM-154 and SKD-83.

KANBAN BOARD
- Use compact columns: “К выполнению”, “В работе”, “На проверке”, “Готово”.
- Columns should display task counts and allow fast inline task creation.
- Cards are compact and draggable, with 8–12 px internal padding, thin borders and minimal decoration.
- Every card prioritizes: task key, concise title, priority, assignee, deadline and blockers.
- Human-readable keys are based on project literals: ADM-154, SKD-83. Render them in small JetBrains Mono text.
- Show separate compact progress indicators when relevant: “Шаги 4/6” and “Подзадачи 2/3”. Never combine them into a misleading single percentage.
- Indicate blocked tasks clearly but without large warning banners.
- Use subtle project, label and responsibility-area chips only when useful.
- Reveal secondary row/card actions on hover to reduce clutter.

LIST VIEW
- Show a high-density operational table/list with 32–36 px rows.
- Suggested columns: status, key, title, project, assignee, priority, due date, checklist progress, subtask progress and blocker state.
- Support grouping by project, status or assignee.
- Demonstrate inline status and assignee editing.
- Keep task titles readable and do not turn every field into a colorful pill.

TASK INSPECTOR
Open a 400–480 px right-side inspector for task ADM-154 titled “Подготовить регламент резервного копирования”. The board remains visible behind it.

Inspector header:
- task key ADM-154;
- editable title;
- compact status, priority and overflow actions;
- close button;
- action to copy a direct link.

Core properties should be arranged compactly, not as oversized form cards:
- project “Администрирование”;
- assignee with avatar;
- start date and due date;
- responsibility area;
- labels;
- watchers;
- created-by information.

Content sections:
- concise rich-text description;
- checklists;
- true subtasks;
- task relations/dependencies;
- attachments;
- comments and activity timeline, preferably with a compact tab or segmented control.

CHECKLIST MECHANICS
- A checklist item is a lightweight atomic step, not a full task.
- Show checkbox, title and optional assignee/due date.
- For completed items, make the completion audit discoverable: “выполнил Иван · сегодня, 14:32”. It may appear as quiet metadata or on hover, but the exact time is essential.
- Support drag-and-drop ordering, hide/show completed items and quick keyboard entry.
- Include an item overflow action “Преобразовать в подзадачу”.
- Show checklist progress such as 4/6.

TRUE SUBTASKS
- A subtask is a real task with its own key, status, assignee, deadline, comments, links and optional checklist.
- Show compact subtask rows inside the parent inspector.
- Limit the visible hierarchy to one real subtask level.
- Include actions “Сделать подзадачей…” and “Выделить в отдельную задачу”.
- When extracted, the task remains related to its former parent.
- If every subtask is complete, suggest completing the parent; do not silently auto-close it.
- If the parent is completed while subtasks remain open, show an explicit warning/choice.

RELATIONS AND DEPENDENCIES
- Support: blocks, blocked by, related and duplicate.
- Visualize these as compact readable rows with keys and titles, for example “Блокирует SKD-83 — Проверить выгрузку СКУД”.
- Avoid diagram-heavy presentation inside the task card.

COMPENSATION CONTEXT
- A task may belong to a responsibility area and may be eligible for compensation review.
- Checklist items never earn points.
- A subtask counts only when explicitly marked eligible and approved.
- Show this as quiet, trustworthy metadata rather than gamified points or a loud scoreboard.

ACTIVITY AND AUDIT
- Display a clean chronological activity feed for status changes, assignment, checklist check/uncheck events, task extraction, relations and comments.
- Activity should communicate who did what and at what exact time.
- Humans, AI agents and external integrations may all appear as actors, so actor type should be understandable but unobtrusive.

INTERACTIONS TO MAKE VISUALLY OBVIOUS
- Drag task between columns.
- Quick-create a task without opening a huge modal.
- Open inspector without losing board context.
- Convert checklist item to subtask.
- Extract subtask into a standalone related task.
- Add a blocking relationship by searching a human-readable task key.
- Switch between board and list while preserving filters.

MASCOT USE
A small playful 3D Blender-like clay mascot may appear in an empty state or a tiny helpful tip. It must never consume important task space or obstruct operational data. Do not place a large mascot hero banner on the authenticated Tasker screen.

DO NOT INCLUDE
- dark theme;
- timer redesign or prominent time tracking controls;
- deep nested subtask trees;
- giant marketing cards;
- large charts or KPI dashboards as the main content;
- excessive gradients, glassmorphism or decorative color;
- Trello branding or a literal Trello clone;
- the product names Telefront or Teftele;
- fake mobile-phone framing for the main desktop design.

The final result should feel as immediately understandable as Trello, as fast and dense as Linear, but unmistakably Zuratax: a compact multilingual operational tool with strong auditability and cross-module context.
```

## Рекомендуемая последовательность следующих промптов

После удачной основной генерации лучше уточнять дизайн отдельными короткими запросами:

1. сохранить композицию и показать русскую версию с открытой карточкой;
2. сохранить композицию и показать китайскую локализацию;
3. сохранить композицию и показать плотный список;
4. отдельно проработать состояния преобразования чек-листа в подзадачу и выделения подзадачи;
5. отдельно попросить responsive tablet/mobile adaptation, не меняя desktop-плотность.
