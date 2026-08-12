"""
Builds Module_3_Documentation.pdf — the technical write-up for Module 3.

    pip install reportlab
    python docs/make_documentation.py

Everything in the document is taken from the code as it actually stands. If the
code changes, re-run this so the two do not drift apart.
"""

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (BaseDocTemplate, Frame, KeepTogether, ListFlowable,
                                ListItem, PageBreak, PageTemplate, Paragraph,
                                Spacer, Table, TableStyle)

# --- Brand -------------------------------------------------------------------
NAVY = colors.HexColor("#0A2947")
NAVY_MID = colors.HexColor("#1F4B73")
CLAY = colors.HexColor("#8B5E3C")
CREAM = colors.HexColor("#F3E4C9")
SAGE = colors.HexColor("#D3D4C0")
INK = colors.HexColor("#40566B")
MUTED = colors.HexColor("#6B7C8C")
LINE = colors.HexColor("#E4E0D6")
SUNKEN = colors.HexColor("#FAF8F3")
CRITICAL = colors.HexColor("#B3402F")
OK = colors.HexColor("#2E7D6F")

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm

styles = getSampleStyleSheet()


def style(name, **kw):
    return ParagraphStyle(name, parent=styles["Normal"], **kw)


TITLE = style("t", fontName="Helvetica-Bold", fontSize=26, leading=31, textColor=NAVY, spaceAfter=6)
SUBTITLE = style("st", fontName="Helvetica", fontSize=12.5, leading=17, textColor=MUTED, spaceAfter=18)
H1 = style("h1", fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=NAVY, spaceBefore=16, spaceAfter=8)
H2 = style("h2", fontName="Helvetica-Bold", fontSize=12, leading=16, textColor=NAVY_MID, spaceBefore=12, spaceAfter=5)
H3 = style("h3", fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=CLAY, spaceBefore=9, spaceAfter=3)
BODY = style("b", fontSize=9.8, leading=14.5, textColor=INK, spaceAfter=7, alignment=TA_LEFT)
SMALL = style("sm", fontSize=8.8, leading=12.5, textColor=MUTED, spaceAfter=6)
CODE = style("c", fontName="Courier", fontSize=8.3, leading=11.5, textColor=NAVY,
             backColor=SUNKEN, borderPadding=6, spaceBefore=4, spaceAfter=8)
CELL = style("cell", fontSize=8.4, leading=11.5, textColor=INK)
CELL_B = style("cellb", fontName="Helvetica-Bold", fontSize=8.4, leading=11.5, textColor=NAVY)
CELL_C = style("cellc", fontName="Courier", fontSize=8, leading=11, textColor=NAVY_MID)


def para(text, s=BODY):
    return Paragraph(text, s)


def bullets(items, s=BODY):
    return ListFlowable(
        [ListItem(Paragraph(t, s), leftIndent=10) for t in items],
        bulletType="bullet", bulletFontSize=6, bulletColor=CLAY,
        leftIndent=12, spaceAfter=7,
    )


def numbered(items, s=BODY):
    return ListFlowable(
        [ListItem(Paragraph(t, s), leftIndent=10) for t in items],
        bulletType="1", bulletFontSize=9, bulletColor=CLAY,
        leftIndent=14, spaceAfter=7,
    )


def table(rows, widths, header=True, code_cols=()):
    data = []
    for r_i, row in enumerate(rows):
        cells = []
        for c_i, cell in enumerate(row):
            if r_i == 0 and header:
                st = CELL_B
            elif c_i in code_cols:
                st = CELL_C
            else:
                st = CELL
            cells.append(Paragraph(str(cell), st))
        data.append(cells)

    t = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    cmds = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [colors.white, SUNKEN]),
    ]
    if header:
        cmds += [("BACKGROUND", (0, 0), (-1, 0), CREAM),
                 ("LINEBELOW", (0, 0), (-1, 0), 0.9, CLAY)]
    t.setStyle(TableStyle(cmds))
    return t


def callout(title, text, tone=CLAY):
    inner = [Paragraph(f"<b>{title}</b>", style("ct", fontName="Helvetica-Bold",
                                                fontSize=9.3, leading=12.5, textColor=tone)),
             Paragraph(text, style("cb", fontSize=9.2, leading=13, textColor=INK))]
    t = Table([[inner]], colWidths=[PAGE_W - 2 * MARGIN])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SUNKEN),
        ("LINEBEFORE", (0, 0), (0, -1), 2.5, tone),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def qa(question, answer):
    return KeepTogether([
        Paragraph(question, style("q", fontName="Helvetica-Bold", fontSize=9.6,
                                  leading=13, textColor=NAVY, spaceBefore=9, spaceAfter=3)),
        Paragraph(answer, style("a", fontSize=9.5, leading=13.5, textColor=INK, spaceAfter=4)),
    ])


# --- Page furniture ----------------------------------------------------------

def decorate(canvas, doc):
    canvas.saveState()
    if doc.page > 1:
        canvas.setFillColor(NAVY)
        canvas.rect(0, PAGE_H - 12 * mm, PAGE_W, 12 * mm, stroke=0, fill=1)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.setFillColor(CREAM)
        canvas.drawString(MARGIN, PAGE_H - 8 * mm, "Company Booster")
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(SAGE)
        canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 8 * mm,
                               "Module 3 - Task & Objective Management")
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN, 13 * mm, PAGE_W - MARGIN, 13 * mm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(MARGIN, 9 * mm, "Technical documentation")
        canvas.drawRightString(PAGE_W - MARGIN, 9 * mm, str(doc.page))
    canvas.restoreState()


def build(path, story):
    doc = BaseDocTemplate(path, pagesize=A4,
                          leftMargin=MARGIN, rightMargin=MARGIN,
                          topMargin=20 * mm, bottomMargin=18 * mm,
                          title="Company Booster - Module 3 Documentation",
                          author="Module 3")
    frame = Frame(MARGIN, 18 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 38 * mm, id="body")
    doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=decorate)])
    doc.build(story)


# =============================================================================
S = []

# --- Cover -------------------------------------------------------------------
S += [
    Spacer(1, 34 * mm),
    para("Company Booster", TITLE),
    para("Module 3 &mdash; Task &amp; Objective Management<br/>Technical documentation", SUBTITLE),
]

cover = table([
    ["Module", "3 &mdash; Task &amp; Objective Management"],
    ["Feature built", "Task &amp; Objective Management (feature 9 of the specification)"],
    ["Stack", "React 19, Node.js, Express 5, MongoDB Atlas, Mongoose 9"],
    ["External API", "Google Gemini (document analysis)"],
    ["Database", "MongoDB Atlas, database <font face='Courier'>empployee_management</font>"],
    ["Pages", "3 &mdash; Task orbit, Task detail, Add work"],
    ["Source size", "About 5,400 lines across backend and frontend"],
], [34 * mm, PAGE_W - 2 * MARGIN - 34 * mm], header=False)
S += [cover, Spacer(1, 8 * mm)]

S += [callout(
    "How to read this",
    "Sections 1&ndash;4 explain what was built and why. Sections 5&ndash;8 are the technical detail: "
    "database, backend, external API and frontend. Section 9 covers running it, section 10 how to make "
    "common changes on the spot, and section 11 is an honest list of what it does not do. "
    "Section 12 answers the questions most likely to be asked.")]

S += [PageBreak()]

# --- 1. Scope ----------------------------------------------------------------
S += [para("1. Scope and responsibility", H1)]
S += [para(
    "The wider product is an employee management system split into four modules. This document covers "
    "<b>Module 3, Task &amp; Objective Management</b>, and specifically the Task &amp; Objective feature. "
    "The other three modules (Human Resources, Project &amp; Collaboration, Administration &amp; Productivity) "
    "are the responsibility of other team members and are not described here.")]

S += [para("What this module does", H2)]
S += [bullets([
    "Reads an uploaded project document and drafts a set of tasks from it, with a suggested department, "
    "owner, priority and hour estimate for each.",
    "Assigns tasks to employees.",
    "Tracks progress as a percentage, calculated rather than typed in.",
    "Supports subtasks (a checklist) on every task.",
    "Accepts file uploads against a task.",
    "Lets people ask questions on a task, which stay marked open until answered.",
    "Shows all of a department's work as a priority diagram.",
])]

S += [para("What was deliberately left out", H2)]
S += [bullets([
    "<b>Login and registration.</b> Another team member is building authentication, so this module has no "
    "user accounts or sessions. Nothing here depends on that work, and it can be added without changing "
    "the data model.",
    "<b>Project rooms.</b> The specification allows assigning work to a room as well as a person. Rooms "
    "belong to Module 2 and do not exist yet, so tasks are assigned to individuals only. The task schema "
    "would need one extra field to support rooms later.",
    "<b>The other Module 3 features.</b> Employee Performance, Feedback &amp; Evaluation and the Project "
    "Budget Tracker are part of Module 3 but were not in scope for this stage.",
])]

# --- 2. Stack ----------------------------------------------------------------
S += [para("2. Technology used", H1)]
S += [para(
    "The stack was fixed by the team: JavaScript throughout, React on the front, Node and Express on the "
    "back, MongoDB with Mongoose, deployed to Vercel. Every choice below sits inside that.")]

S += [table([
    ["Layer", "Choice", "Version", "Why"],
    ["Frontend", "React", "19.2", "Team standard. Component model suits three related screens."],
    ["Routing", "react-router-dom", "7.18", "Client-side routing between the three pages."],
    ["Build", "Vite", "8.1", "Fast dev server; proxies /api to Express so there is no CORS setup in development."],
    ["Styling", "Plain CSS", "&mdash;", "Competition rules allow CSS libraries but forbid page builders. Hand-written CSS with custom properties keeps the bundle small and every rule explainable."],
    ["Backend", "Express", "5.2", "Team standard. Small, well understood routing layer."],
    ["Database", "MongoDB Atlas", "cloud", "Team standard. Free tier; no local install needed by teammates."],
    ["ORM", "Mongoose", "9.8", "Schema validation and population, which plain the driver does not give."],
    ["Uploads", "multer", "2.2", "Multipart parsing, configured to keep files in memory."],
    ["PDF reading", "pdf-parse", "2.4", "Extracts text from PDF uploads."],
    ["Word reading", "mammoth", "1.12", "Extracts text from .docx uploads."],
    ["External API", "Google Gemini", "2.5-flash", "Free tier, allowed by the competition rules, and the API named in our own specification."],
], [26 * mm, 32 * mm, 20 * mm, PAGE_W - 2 * MARGIN - 78 * mm])]

S += [callout(
    "Rules compliance",
    "The competition forbids CMS platforms, core PHP, Firebase, Supabase and Django. None are used. "
    "It requires each member to integrate one external API: this module integrates <b>Google Gemini</b>. "
    "It requires SQL, NoSQL or local storage: MongoDB Atlas is used, with real Mongoose schemas.", OK)]

S += [PageBreak()]

# --- 3. Architecture ---------------------------------------------------------
S += [para("3. How the pieces fit together", H1)]
S += [para(
    "The system is in two halves that talk over HTTP and JSON. The browser never touches the database; "
    "everything goes through the Express API.")]

S += [para(
    "BROWSER (React, port 5173)<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;pages  -&gt;  src/lib/api.js  -&gt;  fetch('/api/...')<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;|<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;| Vite dev server proxies /api to port 4000<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;v<br/>"
    "SERVER (Express, port 4000)<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;routes/  -&gt;  controller/  -&gt;  service/  -&gt;  model/  (Mongoose)<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;|                                    |<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;|                                    v<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;|                          MongoDB Atlas (cloud)<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;v<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;service/gemini.js  -&gt;  Google Gemini REST API", CODE)]

S += [para("Why the backend has four layers", H2)]
S += [table([
    ["Layer", "Folder", "Responsibility", "Lines"],
    ["Routes", "backend/routes", "Maps a URL and method to a controller function. No logic.", "40"],
    ["Controllers", "backend/controller", "Validates input, chooses status codes, shapes the response. Knows about HTTP, not about the database.", "268"],
    ["Services", "backend/service", "All database queries and all business rules. Knows nothing about HTTP.", "614"],
    ["Models", "backend/model", "Mongoose schemas: field types, defaults, validation.", "128"],
], [24 * mm, 34 * mm, PAGE_W - 2 * MARGIN - 76 * mm, 18 * mm])]

S += [para(
    "The separation matters for one practical reason: the whole module first ran on an in-memory array "
    "before the database was connected. Because only the service layer knew where data lived, moving to "
    "MongoDB changed that one layer. Controllers and routes were untouched.", BODY)]

# --- 4. Data flow ------------------------------------------------------------
S += [para("4. What happens when a document is imported", H1)]
S += [para("This is the most involved path in the module, so it is worth following end to end.")]

S += [numbered([
    "The user opens <b>Add work</b> and switches to <b>From a document</b>, then drops in a PDF, Word file, "
    "Markdown, CSV or plain text.",
    "The browser sends it as multipart form data to <font face='Courier'>POST /api/ai/analyse</font>.",
    "<b>multer</b> parses the upload and holds the file in memory as a Buffer. Nothing is written to disk.",
    "<font face='Courier'>document_parser.js</font> picks a reader by file extension: pdf-parse for PDF, "
    "mammoth for .docx, plain UTF-8 decoding for text formats. The result is trimmed to 20,000 characters.",
    "The service loads the department list and the employee list, including each employee's skills.",
    "If a Gemini key is configured, the text, the departments and the team roster go to Gemini with a "
    "response schema that forces valid JSON back. If no key is set, or the call fails, a built-in reader "
    "parses the document's own structure instead.",
    "The draft is normalised: department names checked against the real list, priorities checked against "
    "the four allowed values, hours clamped between 1 and 80, and suggested emails resolved to real "
    "employee records.",
    "The draft is returned to the browser. <b>Nothing has been saved.</b>",
    "The user reviews the list, edits titles, changes departments, owners, priorities and hours, and "
    "unticks anything they do not want.",
    "Pressing create sends the kept tasks to <font face='Courier'>POST /api/ai/create-tasks</font>, which "
    "inserts them in one operation with <font face='Courier'>source: 'ai'</font> recorded against each.",
])]

S += [callout(
    "Design decision: nothing is created automatically",
    "The system proposes; a person approves. A tool that silently created a dozen tasks from a "
    "half-understood document would be worse than no tool, because somebody would have to find and undo "
    "them. The review step is the feature, not an obstacle in front of it.")]

S += [PageBreak()]

# --- 5. Database -------------------------------------------------------------
S += [para("5. Database design", H1)]
S += [para(
    "MongoDB Atlas, accessed through Mongoose. Six collections. The connection is cached in "
    "<font face='Courier'>config/db.js</font> so a serverless platform reusing a container does not open "
    "a new connection on every request.")]

S += [para("Collections", H2)]
S += [table([
    ["Collection", "Holds", "Documents now"],
    ["tasks", "The work itself, with subtasks embedded", "27"],
    ["employees", "People who can be assigned work", "12"],
    ["departments", "Engineering, Design, Marketing, Human Resources", "4"],
    ["objectives", "Goals that tasks can belong to", "5"],
    ["comments", "Questions and comments on tasks", "3"],
    ["attachments", "Uploaded files, stored as binary", "0 until a file is uploaded"],
], [30 * mm, PAGE_W - 2 * MARGIN - 68 * mm, 38 * mm])]

S += [para("The task schema in full", H2)]
S += [table([
    ["Field", "Type", "Notes"],
    ["title", "String", "Required."],
    ["description", "String", "Free text."],
    ["department", "String, indexed", "Which team owns it."],
    ["assignee", "ObjectId &rarr; Employee", "Null when unassigned."],
    ["objective", "ObjectId &rarr; Objective", "Null when the task stands alone."],
    ["priority", "Enum, indexed", "critical, high, medium, low."],
    ["status", "Enum, indexed", "todo, in_progress, review, done."],
    ["estimateHours", "Number", "Used for planet size and hour totals."],
    ["spentHours", "Number", "Reserved for time logging."],
    ["dueDate", "Date", "Drives the overdue calculation."],
    ["subtasks", "Embedded array", "Each has title, done, completedAt."],
    ["attachments", "Array of ObjectId", "References to the attachments collection."],
    ["source", "Enum", "manual or ai &mdash; records where the task came from."],
    ["aiReason", "String", "The sentence explaining why the AI proposed it."],
    ["createdAt / updatedAt", "Date", "Added automatically by Mongoose timestamps."],
], [32 * mm, 40 * mm, PAGE_W - 2 * MARGIN - 72 * mm])]

S += [callout(
    "Design decision: progress is never stored",
    "There is no progress field. It is calculated on every read by "
    "<font face='Courier'>progressPercent()</font> on the schema: 100 if the task is done, otherwise the "
    "share of ticked subtasks, and if there are no subtasks a value implied by the status. Storing a "
    "percentage would let it drift out of step with the checklist underneath it the moment somebody "
    "ticked a box. The same applies to <i>overdue</i> and <i>remainingHours</i>.")]

S += [para("Relationships", H2)]
S += [para(
    "Task &mdash;&gt; Employee&nbsp;&nbsp;&nbsp;&nbsp;many-to-one (assignee)<br/>"
    "Task &mdash;&gt; Objective&nbsp;&nbsp;&nbsp;many-to-one (optional)<br/>"
    "Task &mdash;&gt; Attachment&nbsp;&nbsp;one-to-many<br/>"
    "Task &lt;&mdash; Comment&nbsp;&nbsp;&nbsp;&nbsp;one-to-many (comment holds the task id)<br/>"
    "Subtasks are embedded inside the task document, not a collection.", CODE)]

S += [para(
    "Subtasks are embedded because they are never queried on their own and never shared between tasks; "
    "they are always read and written with their parent. Comments and attachments are separate "
    "collections because a task with many comments would otherwise grow without limit, and MongoDB "
    "caps a document at 16 MB.", BODY)]

S += [para("Where uploaded files live", H2)]
S += [para(
    "File bytes are stored in the attachments collection as a Buffer, not on the server's disk. This is "
    "deliberate: Vercel's filesystem is read-only, so writing uploads to a folder would work on a laptop "
    "and fail in production. Uploads are capped at 5 MB, well under MongoDB's document limit. The "
    "<font face='Courier'>data</font> field is marked <font face='Courier'>select: false</font>, so "
    "listing a task's files never drags the binary along with it.", BODY)]

S += [PageBreak()]

# --- 6. Backend / API --------------------------------------------------------
S += [para("6. The API", H1)]
S += [para("Fifteen endpoints, all returning JSON. Base URL <font face='Courier'>/api</font>.")]

S += [para("Task endpoints", H2)]
S += [table([
    ["Method", "Path", "Purpose"],
    ["GET", "/api/tasks/board", "Departments with counts, plus tasks for one department. Powers page 1."],
    ["GET", "/api/tasks/options", "Departments, employees, objectives and the allowed enum values, for the form dropdowns."],
    ["GET", "/api/tasks/:id", "One task with its employees list and comment thread. Powers page 2."],
    ["POST", "/api/tasks", "Create one task."],
    ["PATCH", "/api/tasks/:id", "Update any editable field."],
    ["DELETE", "/api/tasks/:id", "Delete a task, and its comments and attachments with it."],
    ["POST", "/api/tasks/:id/subtasks", "Add a checklist item."],
    ["PATCH", "/api/tasks/:id/subtasks/:subtaskId", "Tick or untick a checklist item."],
    ["POST", "/api/tasks/:id/comments", "Post a comment or a question."],
    ["POST", "/api/tasks/:id/attachments", "Upload a file (multipart)."],
    ["GET", "/api/tasks/:id/attachments/:fileId", "Download a file."],
    ["DELETE", "/api/tasks/:id/attachments/:fileId", "Remove a file."],
], [16 * mm, 58 * mm, PAGE_W - 2 * MARGIN - 74 * mm], code_cols=(1,))]

S += [para("AI endpoints", H2)]
S += [table([
    ["Method", "Path", "Purpose"],
    ["GET", "/api/ai/status", "Reports whether a Gemini key is configured and which file types are accepted."],
    ["POST", "/api/ai/analyse", "Reads a document and returns a draft. Saves nothing."],
    ["POST", "/api/ai/create-tasks", "Creates the tasks the user approved from that draft."],
], [16 * mm, 44 * mm, PAGE_W - 2 * MARGIN - 60 * mm], code_cols=(1,))]

S += [para("Rules the server enforces", H2)]
S += [bullets([
    "A task must have a title and a department.",
    "Priority and status must be one of the allowed values; anything else is rejected with 400.",
    "An estimate must be between 1 and 200 hours.",
    "Uploads are capped at 5 MB for attachments and 8 MB for documents; over that returns 413.",
    "Unsupported file types are rejected by name before any parsing is attempted.",
])]

S += [para(
    "Validation is on the server, not only in the form. A form can be bypassed; the endpoint cannot.", BODY)]

S += [para("Two automatic status rules", H2)]
S += [para(
    "These live in the service layer so every route that changes a subtask gets them:", BODY)]
S += [bullets([
    "Ticking the first checklist item on a task that is still <i>to do</i> moves it to <i>in progress</i>. "
    "Without this the board and the task page would disagree about whether work had started.",
    "Ticking the last remaining item moves the task to <i>in review</i> rather than straight to done, "
    "because finishing the checklist is not the same as someone having checked the work.",
])]

S += [PageBreak()]

# --- 7. External API ---------------------------------------------------------
S += [para("7. The external API integration", H1)]
S += [para(
    "The competition requires one external API integration per member. This module integrates "
    "<b>Google Gemini</b>, called directly over its REST endpoint with <font face='Courier'>fetch</font> "
    "rather than through an SDK, which keeps one dependency out of the project.")]

S += [para("How the call is made", H2)]
S += [para(
    "POST https://generativelanguage.googleapis.com/v1beta/models/<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;gemini-2.5-flash:generateContent?key=API_KEY<br/><br/>"
    "body:<br/>"
    "&nbsp;&nbsp;systemInstruction  the rules the model must follow<br/>"
    "&nbsp;&nbsp;contents&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;the document text, department list, team roster<br/>"
    "&nbsp;&nbsp;generationConfig<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;temperature&nbsp;&nbsp;&nbsp;&nbsp;0.3&nbsp;&nbsp;(low, so results are repeatable)<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;responseMimeType&nbsp;&nbsp;application/json<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;responseSchema&nbsp;&nbsp;&nbsp;&nbsp;the exact shape required back", CODE)]

S += [para(
    "The response schema is the important part. Gemini is told the precise JSON structure it must "
    "produce, so the reply is parsed directly instead of having prose pulled apart with string matching. "
    "A 45-second timeout is enforced with an AbortController.", BODY)]

S += [para("The fallback, and why it exists", H2)]
S += [para(
    "If no API key is set, or the call fails for any reason, a built-in reader in "
    "<font face='Courier'>fallback_planner.js</font> produces the same shape of result. It works on the "
    "document's own structure: headings, bullet lists, numbered lists, and prose sentences that begin "
    "with an action verb. It infers a skill set from keywords, matches that to the department whose "
    "people hold those skills, and estimates hours from the length and wording of each line.", BODY)]

S += [callout(
    "Why build a fallback at all",
    "A live demonstration should not depend on a network connection or an unexpired key. If Gemini is "
    "unreachable the feature still works, and the interface says plainly which engine produced the "
    "result rather than pretending an AI was involved. This is also an honest answer to the question "
    "\"what happens when the API is down?\"")]

S += [para("A real defect this uncovered", H2)]
S += [para(
    "Testing with a generated PDF showed the import producing nonsense: titles with line breaks through "
    "them and text that was clearly not a task. The cause was that a bullet character, U+2022, came back "
    "from PDF text extraction as a plain quote mark, U+0022, so the bullet pattern never matched and the "
    "parser fell back to splitting prose into sentences.", BODY)]
S += [para(
    "Two fixes followed. The bullet pattern now recognises the characters that PDF extraction actually "
    "produces, including U+F0B7 which Word emits when exporting bulleted lists, and every title has its "
    "whitespace collapsed so a line break can never appear inside one. Six bullet variants were then "
    "tested and all parse correctly. The same brief now gives identical results as PDF, Word and "
    "Markdown.", BODY)]

S += [PageBreak()]

# --- 8. Frontend -------------------------------------------------------------
S += [para("8. The frontend", H1)]
S += [para(
    "Three pages, deliberately. An earlier version of this module had eight, and it was harder to use, "
    "not easier &mdash; the same task could be reached four different ways and no screen was clearly the "
    "place to start.")]

S += [table([
    ["Page", "Route", "What it is for"],
    ["Task orbit", "/", "One department's open work drawn by priority, with a breakdown and a full task table under it."],
    ["Task detail", "/tasks/:id", "Everything about one task: description, checklist, files, questions, and the controls to change it."],
    ["Add work", "/tasks/new", "Two modes: create one task by hand, or import a document. Both live here so there is one place to add work."],
], [26 * mm, 26 * mm, PAGE_W - 2 * MARGIN - 60 * mm], code_cols=(1,))]

S += [para("The orbit diagram", H2)]
S += [para(
    "The first page draws each department's tasks as a solar system. The rules are deliberately few, so "
    "the picture can be explained in one sentence: <b>distance from the centre and colour both mean "
    "priority, and nothing else.</b>", BODY)]

S += [table([
    ["What you see", "What it means"],
    ["Ring position", "Priority. Critical is the innermost ring, then high, medium, low."],
    ["Colour", "The same priority. Colour and position never disagree."],
    ["Planet size", "Estimated hours, clamped so one large task cannot swamp the picture."],
    ["White arc", "Progress on that task."],
    ["Red halo", "The task is past its due date."],
    ["Rotation speed", "Critical rings turn faster than low ones. Motion is off by default."],
], [34 * mm, PAGE_W - 2 * MARGIN - 34 * mm])]

S += [para(
    "An earlier version coloured planets by priority while positioning them by time remaining. Those are "
    "two different things, so a green planet and a yellow planet could share a ring and the diagram "
    "contradicted itself. Tying both to one dimension fixed it.", BODY)]

S += [callout(
    "Design decision: the diagram is never the only view",
    "A picture cannot tell you which three tasks are late or how the hours split. Underneath the orbit "
    "sits a breakdown &mdash; late, due within three days, open, unowned, a stage-by-stage count, and "
    "hours left split by priority &mdash; and a full sortable table of every task. The orbit is for the "
    "first glance; the table is what the work is actually done from.")]

S += [para("How the frontend is organised", H2)]
S += [table([
    ["Path", "Contents"],
    ["src/lib/api.js", "Every call to the server. One place for the base URL and error handling."],
    ["src/lib/format.js", "Date, file size and label helpers, so dates read the same on every page."],
    ["src/styles/theme.css", "Design tokens as CSS custom properties: the four brand colours and everything derived from them."],
    ["src/components/", "solar_system (the diagram) and app_header (the top bar)."],
    ["src/pages/", "One folder per page, each with its .jsx and its .css beside it."],
], [42 * mm, PAGE_W - 2 * MARGIN - 42 * mm], code_cols=(0,))]

S += [para(
    "Colours are defined once in theme.css and referenced everywhere else, so the palette can be changed "
    "in one file. Motion is CSS keyframes and transitions only &mdash; no animation library &mdash; and "
    "the whole interface honours the operating system's reduce-motion setting.", BODY)]

S += [PageBreak()]

# --- 9. Running --------------------------------------------------------------
S += [para("9. Running the project", H1)]

S += [para("First time", H2)]
S += [para(
    "backend:<br/>"
    "&nbsp;&nbsp;cd backend<br/>"
    "&nbsp;&nbsp;npm install<br/>"
    "&nbsp;&nbsp;copy .env.example to .env and fill in MONGODB_URI<br/>"
    "&nbsp;&nbsp;npm run seed&nbsp;&nbsp;&nbsp;&nbsp;fills the database with starting data<br/>"
    "&nbsp;&nbsp;npm run dev&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;starts the API on port 4000<br/><br/>"
    "frontend (a second terminal):<br/>"
    "&nbsp;&nbsp;cd frontend<br/>"
    "&nbsp;&nbsp;npm install<br/>"
    "&nbsp;&nbsp;npm run dev&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;starts the site on port 5173<br/><br/>"
    "then open http://localhost:5173", CODE)]

S += [para("Environment variables", H2)]
S += [table([
    ["Variable", "Required", "Purpose"],
    ["MONGODB_URI", "Yes", "The Atlas connection string. The server exits if it is missing."],
    ["GEMINI_API_KEY", "No", "Enables Gemini. Without it the built-in reader is used instead."],
    ["GEMINI_MODEL", "No", "Defaults to gemini-2.5-flash."],
    ["PORT", "No", "Defaults to 4000."],
], [32 * mm, 20 * mm, PAGE_W - 2 * MARGIN - 52 * mm], code_cols=(0,))]

S += [callout(
    "The .env file is not committed",
    "It is listed in .gitignore, and .env.example is committed in its place with the values blanked. "
    "A connection string contains a password; putting one in version control hands the database to "
    "anyone who can read the repository.", CRITICAL)]

S += [para("The demo files", H2)]
S += [para(
    "The <font face='Courier'>demo/</font> folder holds a realistic client brief as Markdown, plus the "
    "same brief generated as a PDF and a Word document, so the import can be shown with the formats a "
    "client would really send. Running <font face='Courier'>node demo/make_demo_files.js</font> "
    "regenerates the PDF and Word versions after editing the Markdown.", BODY)]

# --- 10. Making changes ------------------------------------------------------
S += [para("10. Making common changes", H1)]
S += [para("Where to go if a change is asked for during the presentation.")]

S += [table([
    ["Change asked for", "Where to make it"],
    ["Add a department", "Add it to DEPARTMENTS in backend/data/dummy_data.js and re-seed. Every count, dropdown and tab picks it up automatically."],
    ["Add an employee", "Add to EMPLOYEES in the same file and re-seed. Skills are inferred from the job title."],
    ["Add a fifth priority", "PRIORITIES in backend/model/task.js, then ORBITS in solar_system.jsx for the new ring, then the colour variables in theme.css."],
    ["Change the colours", "theme.css only. Every component reads the custom properties."],
    ["Change a status name", "STATUSES in backend/model/task.js and STATUS_LABELS in frontend/src/lib/format.js."],
    ["Turn the orbit motion on by default", "One line in task_orbit.jsx: the initial value of the animate state."],
    ["Change the upload size limit", "backend/middleware/upload.js, the fileSize limits."],
    ["Change what the AI is told", "The SYSTEM constant in backend/service/gemini.js."],
    ["Add a field to a task", "The schema in model/task.js, then EDITABLE in service/task_service.js so it can be updated, then the form."],
], [46 * mm, PAGE_W - 2 * MARGIN - 46 * mm])]

S += [PageBreak()]

# --- 11. Limitations ---------------------------------------------------------
S += [para("11. Known limitations", H1)]
S += [para(
    "Stated plainly, because being asked about a weakness that has already been acknowledged is a much "
    "better position than being caught by it.")]

S += [table([
    ["Limitation", "Detail and what would fix it"],
    ["No authentication", "Anyone who can reach the API can change any task. Another member is building login; this module would then check a token on each request."],
    ["Comment authors are typed in, not verified", "A comment records a name as text because there are no user accounts yet. It becomes a real reference once login exists."],
    ["The fallback reader misses cross-references", "It reads each line separately, so a constraints paragraph saying \"the login work is critical\" does not raise the priority of a bullet further up the page. Gemini reads the whole document and does. With no key set, every task comes back medium."],
    ["The orbit does not scale past about 30 tasks", "Rings are capped and the surplus is reported as a count. Beyond that the table underneath is the usable view, which is why it is there."],
    ["Scanned PDFs produce nothing", "Text extraction needs real text. An image of a page would need OCR, which is not included."],
    ["No pagination", "Every task for a department is sent at once. Fine at this size; a few hundred tasks per department would need paging."],
    ["Attachments are limited to 5 MB", "They are stored inside MongoDB documents. Larger files would need object storage such as S3."],
    ["No automated test suite", "Testing was done by exercising the endpoints and the interface directly. Unit tests would be the next thing to add."],
], [46 * mm, PAGE_W - 2 * MARGIN - 46 * mm])]

# --- 12. Q&A -----------------------------------------------------------------
S += [para("12. Questions you are likely to be asked", H1)]

S += [qa("Why MongoDB rather than a relational database?",
         "It was the team's fixed choice, and it suits the shape of this data: a task with its checklist "
         "is one document, read and written together. Where relationships matter &mdash; a task's "
         "assignee, its objective &mdash; they are ObjectId references and Mongoose populates them, which "
         "is effectively a join. If the project needed heavy reporting across many joined tables, SQL "
         "would be the better answer.")]

S += [qa("Why are subtasks embedded but comments a separate collection?",
         "Subtasks are always read with their parent task, are never queried alone, and there are only a "
         "handful. Comments can grow without limit and a MongoDB document is capped at 16 MB, so letting "
         "them accumulate inside the task would eventually break it.")]

S += [qa("Is the AI part real, or is it hard-coded?",
         "It is a real HTTP call to Google Gemini with the document text and the team roster, using a "
         "response schema so the reply comes back as valid JSON. There is also a non-AI fallback that "
         "runs when no key is configured, and the interface states which of the two produced the result. "
         "It can be demonstrated either way.")]

S += [qa("What happens if the Gemini API is down or the key expires?",
         "The call is wrapped in a try/catch with a 45-second timeout. On any failure the built-in reader "
         "runs instead and the response carries a notice explaining what happened. The feature degrades "
         "rather than breaking.")]

S += [qa("How is the progress percentage calculated?",
         "It is not stored. On every read: 100 if the task is done, otherwise the proportion of ticked "
         "subtasks, and if there are no subtasks a value implied by the status. This means it can never "
         "contradict the checklist a user is looking at.")]

S += [qa("Where are uploaded files kept?",
         "As binary inside the attachments collection in MongoDB, not on the server's disk. The "
         "deployment target is Vercel, whose filesystem is read-only, so a disk-based approach would work "
         "locally and fail in production.")]

S += [qa("Why only three pages?",
         "An earlier version had eight and was harder to use. Related things were spread across separate "
         "screens, and the same task could be reached several ways with no obvious starting point. "
         "Document import was folded into the Add work page rather than given a page of its own.")]

S += [qa("Show me that the data is really in the database and not in memory.",
         "Stop the server, start it again, and reload the page. The tasks, including any just created, "
         "are still there. This was verified during development: 32 tasks before a restart, 32 after.")]

S += [qa("What is the data in the demo &mdash; is it real?",
         "It is written sample data, not an export from a real company. What makes it usable is that it "
         "is internally consistent: every figure on screen &mdash; progress, hours remaining, overdue "
         "counts, department totals &mdash; is calculated from those records at the moment of the "
         "request. No number is typed into the design.")]

S += [qa("Could this work with project rooms as the specification describes?",
         "Yes, and it was left out only because rooms belong to Module 2 and do not exist yet. The task "
         "schema would take one more optional reference field, and the assignee logic would accept either "
         "an employee or a room.")]

S += [qa("What was the hardest problem you hit?",
         "Reading PDFs reliably. Bullet characters do not survive text extraction intact &mdash; a "
         "bullet came back as a quote mark, which meant the parser could not see the list at all and "
         "produced nonsense. Fixing it required recognising the characters extraction actually emits, "
         "including the one Word uses, and normalising whitespace so line breaks from the printed page "
         "could not end up inside a task title.")]

S += [Spacer(1, 6 * mm)]
S += [callout(
    "One thing worth saying out loud",
    "This module was built to be defended, not just demonstrated. Progress is calculated rather than "
    "claimed, validation is enforced on the server rather than only in the form, the AI proposes rather "
    "than decides, and the limitations above are stated rather than hidden.", OK)]

build(r"C:\Users\USER\Downloads\employee_management-main (2)\employee_management-main (2)\docs\Module_3_Documentation.pdf", S)
print("Built Module_3_Documentation.pdf")
