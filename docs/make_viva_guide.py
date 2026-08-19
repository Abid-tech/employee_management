"""
Builds Budget_and_Feedback_Code_Guide.pdf — a viva revision guide for the two
features it covers: the Project Budget Tracker and Employee Feedback & Evaluation.

    pip install reportlab
    python docs/make_viva_guide.py

Everything here is read off the code as it actually stands. If the code changes,
re-run this so the guide and the source cannot drift apart.
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
# The four project colours, used exactly as everywhere else in the app.
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
MARGIN = 16 * mm

styles = getSampleStyleSheet()


def style(name, **kw):
    return ParagraphStyle(name, parent=styles["Normal"], **kw)


TITLE = style("t", fontName="Helvetica-Bold", fontSize=25, leading=30, textColor=NAVY, spaceAfter=6)
SUBTITLE = style("st", fontName="Helvetica", fontSize=12, leading=16.5, textColor=MUTED, spaceAfter=16)
PART = style("pt", fontName="Helvetica-Bold", fontSize=20, leading=25, textColor=CLAY, spaceBefore=4, spaceAfter=10)
H1 = style("h1", fontName="Helvetica-Bold", fontSize=15, leading=19, textColor=NAVY, spaceBefore=15, spaceAfter=7)
H2 = style("h2", fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=NAVY_MID, spaceBefore=11, spaceAfter=4)
H3 = style("h3", fontName="Helvetica-Bold", fontSize=10, leading=13.5, textColor=CLAY, spaceBefore=8, spaceAfter=3)
BODY = style("b", fontSize=9.6, leading=14, textColor=INK, spaceAfter=6, alignment=TA_LEFT)
SMALL = style("sm", fontSize=8.6, leading=12, textColor=MUTED, spaceAfter=5)
CODE = style("c", fontName="Courier", fontSize=8.1, leading=11.2, textColor=NAVY,
             backColor=SUNKEN, borderPadding=6, spaceBefore=4, spaceAfter=8)
CELL = style("cell", fontSize=8.1, leading=11, textColor=INK)
CELL_B = style("cellb", fontName="Helvetica-Bold", fontSize=8.1, leading=11, textColor=NAVY)
CELL_C = style("cellc", fontName="Courier", fontSize=7.7, leading=10.5, textColor=NAVY_MID)


def para(text, s=BODY):
    return Paragraph(text, s)


def bullets(items, s=BODY):
    return ListFlowable(
        [ListItem(Paragraph(t, s), leftIndent=10) for t in items],
        bulletType="bullet", bulletFontSize=6, bulletColor=CLAY,
        leftIndent=12, spaceAfter=6,
    )


def numbered(items, s=BODY):
    return ListFlowable(
        [ListItem(Paragraph(t, s), leftIndent=10) for t in items],
        bulletType="1", bulletFontSize=9, bulletColor=CLAY,
        leftIndent=14, spaceAfter=6,
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
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [colors.white, SUNKEN]),
    ]
    if header:
        cmds += [("BACKGROUND", (0, 0), (-1, 0), CREAM),
                 ("LINEBELOW", (0, 0), (-1, 0), 0.9, CLAY)]
    t.setStyle(TableStyle(cmds))
    return t


def callout(title, text, tone=CLAY):
    inner = [Paragraph(f"<b>{title}</b>", style("ct", fontName="Helvetica-Bold",
                                                fontSize=9.2, leading=12.5, textColor=tone)),
             Paragraph(text, style("cb", fontSize=9.1, leading=13, textColor=INK))]
    t = Table([[inner]], colWidths=[PAGE_W - 2 * MARGIN])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SUNKEN),
        ("LINEBEFORE", (0, 0), (0, -1), 2.5, tone),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t


def qa(question, answer):
    return KeepTogether([
        Paragraph(question, style("q", fontName="Helvetica-Bold", fontSize=9.4,
                                  leading=12.5, textColor=NAVY, spaceBefore=8, spaceAfter=3)),
        Paragraph(answer, style("a", fontSize=9.3, leading=13, textColor=INK, spaceAfter=4)),
    ])


# --- Page furniture ----------------------------------------------------------

CURRENT_PART = {"name": "Budget & Feedback"}


def decorate(canvas, doc):
    canvas.saveState()
    if doc.page > 1:
        canvas.setFillColor(NAVY)
        canvas.rect(0, PAGE_H - 11 * mm, PAGE_W, 11 * mm, stroke=0, fill=1)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.setFillColor(CREAM)
        canvas.drawString(MARGIN, PAGE_H - 7.5 * mm, "Company Booster")
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(SAGE)
        canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 7.5 * mm,
                               "Project Budget Tracker  -  Feedback & Evaluation")
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN, 12 * mm, PAGE_W - MARGIN, 12 * mm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(MARGIN, 8 * mm, "Code guide and viva revision notes")
        canvas.drawRightString(PAGE_W - MARGIN, 8 * mm, str(doc.page))
    canvas.restoreState()


def build(path, story):
    doc = BaseDocTemplate(path, pagesize=A4,
                          leftMargin=MARGIN, rightMargin=MARGIN,
                          topMargin=18 * mm, bottomMargin=16 * mm,
                          title="Company Booster - Budget and Feedback Code Guide",
                          author="Company Booster")
    frame = Frame(MARGIN, 16 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 34 * mm, id="body")
    doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=decorate)])
    doc.build(story)


FULL = PAGE_W - 2 * MARGIN

# =============================================================================
S = []

# --- Cover -------------------------------------------------------------------
S += [
    Spacer(1, 26 * mm),
    para("Company Booster", TITLE),
    para("Project Budget Tracker &amp; Employee Feedback and Evaluation<br/>"
         "Code guide and viva revision notes", SUBTITLE),
]

S += [table([
    ["Covers", "Two features only: <b>Project Budget Tracker</b> and <b>Employee Feedback &amp; Evaluation</b>"],
    ["Stack", "React 19 + Vite, Node.js, Express 5, MongoDB Atlas, Mongoose 9"],
    ["Database", "MongoDB Atlas, database <font face='Courier'>empployee_management</font>"],
    ["Budget code", "3 models, 4 services, 1 controller, 1 route file, 11 frontend files"],
    ["Feedback code", "3 models, 5 services, 1 controller, 1 route file, 12 frontend files"],
    ["External API", "Google Gemini &mdash; optional, and only ever asked to phrase, never to calculate"],
], [30 * mm, FULL - 30 * mm], header=False), Spacer(1, 7 * mm)]

S += [callout(
    "How to use this in a viva",
    "<b>Part A</b> is the Budget feature and <b>Part B</b> is the Feedback feature. Each part opens with "
    "the backend logic written in plain English &mdash; read those two sections first, because that is what "
    "you will be asked to explain. Then comes the database design, the API list and a table of every "
    "function with a one-line description. <b>Part C</b> lists every piece of syntax and every method used "
    "in these two features with a short explanation of each. <b>Part D</b> is a set of likely questions "
    "with answers.")]

S += [PageBreak()]

# =============================================================================
# PART A - BUDGET
# =============================================================================
S += [para("Part A", PART)]
S += [para("Project Budget Tracker", H1)]

S += [para(
    "The feature tracks what a project is spending, predicts what it will finish at, and explains the "
    "difference. A team logs time against tasks; each hour is priced using the rate that was in force on "
    "the day the work happened; the totals roll up into a forecast with a confidence range.")]

S += [para("A1. What makes it different from an ordinary budget screen", H2)]
S += [bullets([
    "<b>The forecast leads, not the percentage.</b> A normal screen shows \"55% used\". That is a fact about "
    "the past. It cannot tell apart a project coasting to a comfortable finish from one that has doubled "
    "its burn this fortnight and is already guaranteed to overrun. This screen leads with what the project "
    "is <i>trending to finish at</i>, and shows the percentage underneath as supporting evidence.",

    "<b>The window is rolling, not lifetime.</b> Everything is computed from the last 14 days of logged "
    "time. A lifetime average is dragged towards whatever the team was doing months ago, which is exactly "
    "how a project looks calm right up to the moment it does not.",

    "<b>The prediction carries a range.</b> A single predicted number is a confidence nobody has earned. "
    "The range is built from how variable the daily burn has actually been, so a steady project gets a "
    "narrow band and a lumpy one gets a wide band and deserves it.",

    "<b>Rates are effective-dated.</b> A pay rise adds a new row with its own start date; it never edits "
    "the old one. Tools that store a single rate on the employee record quietly rewrite last quarter's "
    "margin the moment somebody is promoted.",

    "<b>It explains itself without being asked.</b> Short written notes appear on the page saying what "
    "changed and why, rather than sitting inside a report nobody opens.",
])]

S += [para("A2. The backend logic, in plain English", H2)]

S += [para("Step 1 &mdash; What does one hour cost?", H3)]
S += [para(
    "Every time entry has to be turned into money. The rule is a three-level fallback, checked in this "
    "order and stopping at the first one that exists:")]
S += [numbered([
    "<b>A rate written on the entry itself.</b> Sometimes a specific piece of work was agreed at a "
    "special rate. That always wins.",
    "<b>The project's own flat rate.</b> A fixed-fee engagement may price every hour the same regardless "
    "of who works it.",
    "<b>The person's own rate, as it stood on the day the work was done.</b> This is the normal case.",
])]
S += [para(
    "That last point is the important one. The function <font face='Courier'>rateOn(employee, date)</font> "
    "walks the person's rate history newest-first and returns the first rate whose start date is on or "
    "before the day the work happened. So work done three weeks ago is still costed at the old rate even "
    "though the person has since had a rise. <b>Nothing is ever recalculated backwards.</b>")]
S += [callout("Say this in the viva",
              "\"Cost is resolved per entry, not per person. Entry override beats project rate beats the "
              "person's dated rate. And because the person's rate is looked up by the date the work was "
              "done, a pay rise never rewrites what past hours cost.\"", NAVY_MID)]

S += [para("Step 2 &mdash; How is the forecast built?", H3)]
S += [para("This happens in <font face='Courier'>buildForecast()</font>. Five things happen in order:")]
S += [numbered([
    "<b>Add up what has been spent.</b> Every priced entry, summed.",
    "<b>Look at only the last 14 days.</b> Filter the entries to that window.",
    "<b>Work out the daily burn.</b> Every calendar day in the window gets a bucket, <i>including the days "
    "with nothing logged</i>. A team that worked flat out for three days and rested for eleven is not "
    "burning at three days' pace. The average of those 14 buckets is the burn per day.",
    "<b>Price the work still outstanding.</b> The remaining hours come from the task board (unfinished "
    "tasks, reduced by how much of each is already done). Those hours are multiplied by the "
    "<i>recent blended rate</i> &mdash; the actual average rate the project has been running at lately.",
    "<b>Central estimate = spent + remaining cost.</b> That is the headline number.",
])]
S += [para(
    "The range is then built from the <b>coefficient of variation</b> of the daily burn &mdash; the "
    "standard deviation divided by the mean. A steady project has a low coefficient and earns a narrow "
    "band; an erratic one earns a wide one. The spread is clamped between 8% and 42%, because a project "
    "with two data points has not earned a 3% band, and one chaotic week should not produce a range so "
    "wide it says nothing.")]
S += [para(
    "<b>Confidence</b> is reported as good, fair or thin, and it is about evidence rather than about the "
    "answer being comfortable: good needs at least 6 active days in the window and a coefficient under "
    "0.9; fair needs 3 active days; below that it is thin.")]

S += [para("Step 3 &mdash; How do alerts work?", H3)]
S += [para(
    "A project has thresholds, by default 50, 75, 90 and 100 percent. Each is meant to fire <b>once</b>, "
    "not every day. The budget document therefore stores two lists: <font face='Courier'>thresholds</font> "
    "(the levels being watched) and <font face='Courier'>firedThresholds</font> (the ones already "
    "announced). After time is logged, <font face='Courier'>fireThresholds()</font> compares the current "
    "percentage against the two lists, and anything newly crossed is recorded and then emailed to the "
    "people who have been logging time on that project.")]
S += [bullets([
    "If several levels are crossed at once &mdash; one entry can take a project from 45% straight past 50, "
    "75, 90 and 100 &mdash; only <b>one</b> email is sent, for the highest level. All four are still "
    "recorded as fired so none can fire again later.",
    "The crossing is saved to the database <i>before</i> the email is attempted, so a dead mail server "
    "costs a notification, never the record of what happened.",
    "Raising a budget re-arms any threshold the project has dropped back under, so a topped-up project "
    "starts warning again on the way up.",
])]

S += [para("Step 4 &mdash; The hard stop", H3)]
S += [para(
    "A project can be set to refuse new time once it reaches its cap. This is <b>off by default and "
    "deliberately so</b>: refusing to record work somebody genuinely did makes the ledger a lie, which is "
    "usually worse than an overrun. It exists for contracts where the cap is a hard limit, and when it "
    "refuses it says exactly why.")]

S += [para("Step 5 &mdash; The advisor: attributing overspend to a cause", H3)]
S += [para(
    "A forecast says where a project is heading. It cannot say <i>why our budgets keep being wrong</i>, "
    "and that is the question that changes the next one. The advisor looks backwards across every project "
    "and produces five kinds of finding:")]
S += [table([
    ["Finding", "What it measures", "How"],
    ["Estimate calibration",
     "How wrong each department's estimates are",
     "For every finished task, spent hours &divide; estimated hours. The <b>median</b> of those ratios per "
     "department is the correction factor. Median rather than mean, so one catastrophic task cannot "
     "redefine how a whole department estimates."],
    ["Worst estimates",
     "Which individual tasks caused the overrun",
     "Tasks that ran more than 25% past their estimate, with the extra hours priced at that task's own "
     "blended rate."],
    ["Rate efficiency",
     "Expensive people on work that did not need them",
     "Entries at a top-quartile rate on low-priority or sub-four-hour tasks. The saving is measured "
     "against the <b>median</b> rate of people who actually worked on the project, not the cheapest "
     "possible person, because the cheapest person is rarely a realistic alternative."],
    ["Shape of spend",
     "Whether the plan held",
     "The project's life is split into four quarters. An even project spends 25% in each. More than 40% "
     "in the final quarter is a crunch &mdash; which is a different fault from simply being "
     "under-budgeted, and needs a different fix."],
    ["Billable leakage",
     "Work that was done but never charged",
     "Entries with a cost but no billed amount, as a share of total cost."],
], [30 * mm, 42 * mm, FULL - 72 * mm])]
S += [para(
    "Nothing is reported on fewer than <b>8</b> finished tasks. That number is printed on the screen "
    "rather than buried, because \"how much evidence is enough\" is exactly the thing a reader should be "
    "allowed to disagree with. Below that a pattern is an anecdote.")]

S += [para("Step 6 &mdash; Where Gemini fits, and where it does not", H3)]
S += [para(
    "The advisor can ask Gemini to write the summary paragraph. It is sent <b>only the findings the code "
    "has already computed</b> &mdash; never the raw ledger &mdash; so it has nothing to invent a figure "
    "from. If there is no API key, or the call fails or times out, a rules-based writer produces the same "
    "summary and the page says which one wrote it. <b>The model phrases; it never calculates.</b> A model "
    "inventing a financial claim is a far worse failure than a plainly worded paragraph.")]

S += [para("Step 7 &mdash; The what-if simulator", H3)]
S += [para("Three decisions, each needing the schedule and the money at the same time:")]
S += [bullets([
    "<b>Promise a date.</b> Works out the margin at that delivery date. Compressing beyond 1.15&times; the "
    "team's sustainable pace is charged a stated 25% overtime premium, taken straight out of margin.",
    "<b>Add someone.</b> Brooks's Law as arithmetic: a new person ramps up 15/50/85/100% across four "
    "weeks, and the existing team loses 20% of its time mentoring for the first two. Reports net hours "
    "gained, days saved and cost per day saved.",
    "<b>Approve leave.</b> Hours lost per project, how far each finish date slips, which deadlines would "
    "be missed, and who else is already off in that window.",
])]

S += [PageBreak()]

# --- A3 data model -----------------------------------------------------------
S += [para("A3. The database design", H2)]
S += [para(
    "Three collections. The design point is that the <b>ledger is authoritative</b>: totals are computed "
    "from time entries rather than stored, because a stored total and the work underneath it will "
    "disagree the moment anybody touches either one.")]

S += [para("ProjectBudget &mdash; one per project", H3)]
S += [table([
    ["Field", "Type", "What it is for"],
    ["objective", "ObjectId ref", "Which project this budget belongs to"],
    ["totalBudget", "Number", "The money committed"],
    ["currency", "String", "USD by default"],
    ["thresholds", "[Number]", "Alert levels being watched, e.g. 50, 75, 90, 100"],
    ["firedThresholds", "[Number]", "Levels already announced, so each fires only once"],
    ["hardStop", "Boolean", "Refuse new time at the cap. Off by default"],
    ["projectCostRate / projectBillRate", "Number", "Optional flat rates that override each person's own"],
    ["note", "String", "Why the budget is what it is"],
], [42 * mm, 22 * mm, FULL - 64 * mm], code_cols=(0,))]

S += [para("Rate &mdash; effective-dated, never edited", H3)]
S += [table([
    ["Field", "Type", "What it is for"],
    ["employee", "ObjectId ref", "Whose rate this is"],
    ["costRate", "Number", "What the hour costs the company"],
    ["billRate", "Number", "What a client is charged. Zero for internal roles"],
    ["effectiveFrom", "Date", "The day this rate starts applying. <b>The key field</b>"],
    ["reason", "String", "Why it changed, e.g. \"Annual review - promotion\""],
    ["createdByName", "String", "Who set it"],
], [42 * mm, 22 * mm, FULL - 64 * mm], code_cols=(0,))]

S += [para("TimeEntry &mdash; the ledger", H3)]
S += [table([
    ["Field", "Type", "What it is for"],
    ["employee / task / objective", "ObjectId ref", "Who did it, on what, for which project"],
    ["hours", "Number", "How long it took"],
    ["workedOn", "Date", "The day the work happened. <b>Rates resolve against this</b>, not against today"],
    ["clockIn / clockOut", "Date", "An open shift is simply an entry with a clockIn and no clockOut"],
    ["source", "String", "'clock' if timed live, 'manual' if logged afterwards"],
    ["billable", "Boolean", "Whether a client can be charged for it"],
    ["costRateOverride / billRateOverride", "Number", "A rate agreed for this entry specifically"],
    ["note", "String", "What was being done"],
], [42 * mm, 22 * mm, FULL - 64 * mm], code_cols=(0,))]

S += [callout(
    "A bug worth being able to describe",
    "<font face='Courier'>task.spentHours</font> originally had <b>two writers</b> &mdash; the clock-out "
    "handler incremented it, and the seed script also wrote it. They had drifted apart on 95 of 120 tasks, "
    "and because the performance feature reads that field to score estimate accuracy, the drift was "
    "silently lowering people's scores. The fix was to make the ledger the single source of truth: "
    "<font face='Courier'>recomputeSpentHours()</font> recalculates the total by summing the time entries "
    "instead of incrementing. Recomputing is also <b>idempotent</b>, so a retried request can no longer "
    "inflate the number.", CRITICAL)]

S += [PageBreak()]

# --- A4 endpoints ------------------------------------------------------------
S += [para("A4. The API", H2)]
S += [para(
    "All under <font face='Courier'>/api/budget</font>. Static paths are declared before "
    "<font face='Courier'>/project/:id</font>, so that words like \"portfolio\" and \"rates\" can never be "
    "read as a project id.")]
S += [table([
    ["Method and path", "What it does"],
    ["GET /meta", "Employees and projects, for the dropdowns"],
    ["GET /portfolio", "Every project with a budget, forecast and totals &mdash; the main screen"],
    ["GET /project/:id", "One project in full: forecast, narration, spend by person, burn series, ledger"],
    ["GET /advisor", "The post-mortem and the guidance. Accepts an optional plan to estimate"],
    ["GET /shift", "The open shift for a person, if any"],
    ["POST /clock-in", "Start a shift"],
    ["POST /clock-out", "End a shift and price it"],
    ["POST /log", "Log hours after the fact, dated to when the work happened"],
    ["GET /entries", "The time ledger, filterable"],
    ["GET /rates", "Rate history per person, with the one in force marked"],
    ["POST /rates", "Add a new dated rate. Never edits an old one"],
    ["POST /budget", "Set or update a project's budget and thresholds"],
    ["GET /simulate/:id/quote", "What a promised delivery date is worth"],
    ["GET /simulate/:id/add-person", "What adding a person would actually do"],
    ["GET /simulate/leave", "What a leave request costs the projects"],
], [46 * mm, FULL - 46 * mm], code_cols=(0,))]

# --- A5 function reference ---------------------------------------------------
S += [para("A5. Every function, and what it does", H2)]

S += [para("budget_service.js &mdash; the read model (668 lines)", H3)]
S += [para("Pure calculation over whatever was written. It never writes.", SMALL)]
S += [table([
    ["Function", "What it does"],
    ["rateOn(employeeId, date, rates)", "Finds the rate in force for a person on a given day. Walks history newest-first, returns the first one starting on or before that date"],
    ["resolveRates(entry, budget, rates)", "The three-level fallback: entry override, then project rate, then the person's dated rate. Also reports which one was used"],
    ["priceEntry(entry, budget, rates)", "Turns one time entry into cost and billed amount"],
    ["buildForecast({...})", "The core calculation: spend, 14-day burn, remaining cost, central estimate, confidence range, days to finish"],
    ["narrate({...})", "Writes the short plain-English notes that appear on the page &mdash; what changed, and why"],
    ["evaluateAlerts(budget, percent)", "Which thresholds are crossed, and which of those are newly crossed"],
    ["loadRates()", "Loads the whole rate table once, grouped per person, sorted newest-first"],
    ["loadContext()", "Loads employees and rates once for a whole page, so the portfolio does not re-fetch per project"],
    ["projectFinancials(id, opts)", "Everything about one project: forecast, spend by person, daily series, ledger, alerts, narration"],
    ["portfolio()", "Every budgeted project plus company totals. Runs the projects in parallel"],
    ["deadlineImpact(task, newDate)", "What moving a deadline costs, in money &mdash; the join between the task board and the budget"],
    ["fmt(value, budget)", "Formats money with the right currency symbol"],
], [46 * mm, FULL - 46 * mm], code_cols=(0,))]

S += [para("time_service.js &mdash; the write side (379 lines)", H3)]
S += [table([
    ["Function", "What it does"],
    ["clockIn({...})", "Starts a shift. Refuses if one is already open, or if the project has hit a hard stop"],
    ["clockOut({...})", "Ends the shift, converts elapsed time to hours, recomputes the task total, checks thresholds"],
    ["logManual({...})", "Records hours worked earlier. Dated to when the work happened, so it is costed at that day's rate"],
    ["openShift(employeeId)", "Finds an entry with a clockIn and no clockOut &mdash; that is what an open shift is"],
    ["recomputeSpentHours(taskIds)", "Recalculates a task's total hours from the ledger with an aggregate. Idempotent"],
    ["reconcileAll()", "Repair pass for data written before the ledger became authoritative"],
    ["checkHardStop(objectiveId)", "Returns a refusal message if the project is capped and at 100%"],
    ["fireThresholds(objectiveId)", "Records newly crossed levels and emails the people logging time. One email for the highest level"],
    ["setRate({...})", "Adds a new dated rate row. Never edits an existing one"],
    ["listRates()", "Rate history grouped per person, with the rate in force today marked and future ones flagged as scheduled"],
    ["setBudget({...})", "Creates or updates a project budget. Raising it re-arms thresholds the project has dropped under"],
], [46 * mm, FULL - 46 * mm], code_cols=(0,))]

S += [para("budget_advisor.js &mdash; the analysis (706 lines)", H3)]
S += [table([
    ["Function", "What it does"],
    ["calibration(doneTasks)", "Median and 90th-percentile ratio of spent to estimated hours, per department, plus example tasks"],
    ["worstEstimates(tasks, cost)", "The tasks that ran furthest past their estimate, with the overrun priced"],
    ["rateEfficiency(entries, tasks)", "Senior people on small or low-priority work, and what routing it to the median rate would have saved"],
    ["shapeOfSpend(entries)", "Share of spend in each quarter of the project's life. Over 40% in the last quarter is a crunch"],
    ["billableLeak(entries)", "Work with a cost but nothing billed, as a share of total cost"],
    ["reviewProject(id, ctx)", "Runs all five checks over one project"],
    ["buildFindings(...)", "Turns the raw checks into ranked, severity-tagged findings with a headline figure"],
    ["budgetFor(plan, rows, rates)", "Applies the correction factors to a proposed plan and recommends what to commit"],
    ["askModel(evidence)", "Asks Gemini to phrase the summary, sending only computed findings. Falls back on failure"],
    ["summariseByRules(...)", "Writes the same summary without a model"],
    ["advise({plan})", "The public entry point that assembles all of the above"],
], [46 * mm, FULL - 46 * mm], code_cols=(0,))]

S += [para("simulator_service.js &mdash; the what-ifs (403 lines)", H3)]
S += [table([
    ["Function", "What it does"],
    ["quoteDate(id, date)", "Margin, cost and feasibility of promising a delivery date"],
    ["addPerson(id, person, days)", "Brooks's Law as arithmetic: ramp-up, mentoring cost, net hours, days saved"],
    ["leaveImpact(person, from, to)", "Hours lost per project, finish-date slip, deadlines at risk, who else is off"],
    ["workingDaysBetween(a, b)", "Counts weekdays only &mdash; weekends are excluded from every day count"],
    ["addWorkingDays(date, n)", "Moves a date forward by n working days"],
], [46 * mm, FULL - 46 * mm], code_cols=(0,))]

S += [para("The frontend (11 files)", H3)]
S += [table([
    ["File", "What it renders"],
    ["budget_layout.jsx", "The shell: tabs, the \"working as\" person selector, and the <font face='Courier'>.bud</font> style scope"],
    ["budget_context.js", "The shared context object and its hook, kept apart from the component that provides them"],
    ["budget.jsx", "The portfolio. Each headline figure opens into the projects it is a sum of"],
    ["budget_project.jsx", "One project: forecast, what changed, burn chart, spend by person, the ledger. Rows expand"],
    ["budget_clock.jsx", "Clock on and off, or log hours after the fact"],
    ["budget_rates.jsx", "Rate history per person, with the one in force marked"],
    ["budget_simulate.jsx", "The three what-if panels"],
    ["budget_advisor.jsx", "Post-mortem, guidance, the calibration chart and the estimator"],
    ["budget_ui.jsx", "Shared components: Icon, Avatar, ForecastBar, BurnChart, Note"],
    ["budget_format.js", "money(), formatDate(), shortDate()"],
    ["budget.css", "Every rule scoped under <font face='Courier'>.bud</font> so it cannot leak into other pages"],
], [42 * mm, FULL - 42 * mm], code_cols=(0,))]

S += [PageBreak()]

# =============================================================================
# PART B - FEEDBACK
# =============================================================================
S += [para("Part B", PART)]
S += [para("Employee Feedback &amp; Evaluation", H1)]

S += [para(
    "The feature collects manager, peer, self and client feedback, checks the reviewers as well as the "
    "reviewed, proposes development objectives from recurring themes, and keeps an append-only record of "
    "everything an automated agent touched.")]

S += [para("B1. The four design decisions worth defending", H2)]
S += [bullets([
    "<b>One collection for all four sources.</b> Manager, peer, self and client reviews are the same shape "
    "in one collection with a <font face='Courier'>source</font> field, rather than four tables or four "
    "tabs. That is what makes them comparable on one set of axes &mdash; and the disagreement between "
    "them is the finding, not a nuisance.",

    "<b>The self-assessment gap is the point.</b> Where somebody's own polygon sits outside everyone "
    "else's, that is a blind spot. Where a client rates delivery well above the internal view, the team is "
    "being harder on itself than the people paying for the work are.",

    "<b>The agent proposes; a human decides.</b> Nothing the agent drafts is written into the task feature "
    "until a named person approves it, and both the proposal and the approval go into an append-only "
    "trust log. The gate is built as a gate, not promised in a comment.",

    "<b>Calibration checks the reviewers.</b> Most systems only measure the people being reviewed. This "
    "one also asks whether a reviewer is systematically generous, systematically harsh, gives everyone the "
    "same score, or writes in vague language.",
])]

S += [para("B2. The backend logic, in plain English", H2)]

S += [para("Step 1 &mdash; What a review is", H3)]
S += [para(
    "A review has a reviewer, a subject, a source (manager, peer, self or client), a cycle, up to six "
    "competency ratings out of 5, and free-text strengths and improvements. The six competencies are "
    "Delivery, Quality, Communication, Collaboration, Ownership and Initiative. The overall score is the "
    "mean of whichever competencies were actually rated &mdash; not of all six &mdash; so leaving one "
    "blank does not silently count as a zero.")]

S += [para("Step 2 &mdash; The feedback graph", H3)]
S += [para(
    "<font face='Courier'>buildGraph()</font> turns one person's reviews into three views:")]
S += [numbered([
    "<b>A radar</b>, with one polygon per source over the six competencies. Four opinions on one set of "
    "axes.",
    "<b>A timeline</b>, so a rating can be read as a trend rather than a snapshot.",
    "<b>A self-gap</b>: the difference between what the person said about themselves and what everybody "
    "else said, per competency. A positive gap is over-confidence, a negative one is under-selling.",
])]

S += [para("Step 3 &mdash; Calibration: checking the reviewers", H3)]
S += [para("Four checks, each producing an explainable finding:")]
S += [table([
    ["Check", "What it looks for"],
    ["Drift", "A reviewer whose scores sit consistently above or below what <b>other reviewers gave the "
              "same people</b>"],
    ["Clustering", "A reviewer who gives everyone almost the same score, so the ratings carry no "
                   "information (measured by standard deviation)"],
    ["Vague language", "Comments that describe the person rather than the work, with no example, date or "
                       "number to anchor them"],
    ["Distribution", "The overall shape of scores across the company, so a lenient culture is visible as a "
                     "culture rather than blamed on individuals"],
], [30 * mm, FULL - 30 * mm])]

S += [callout(
    "Two calibration bugs worth being able to describe",
    "Both produced confident-but-wrong output. <b>First</b>, drift was originally measured against the "
    "<i>company mean</i> &mdash; which flags anybody who happens to review a weak team as harsh. It is now "
    "measured against what <i>other reviewers gave the same people</i>, which is the only fair comparison. "
    "<b>Second</b>, a reviewer's own earlier reviews had to be excluded from that baseline, or they are "
    "partly being compared against themselves, which drags every drift figure towards zero and hides real "
    "bias.", CRITICAL)]

S += [para("Step 4 &mdash; The agent", H3)]
S += [para(
    "<font face='Courier'>scan()</font> reads every submitted review and looks for a theme raised "
    "independently by <b>three or more separate reviewers</b> about the same person. It proposes only the "
    "<b>strongest theme per person</b> &mdash; one objective at a time, because a development plan with "
    "six items is not a plan. Each proposal is drafted as an objective with a title, a rationale and the "
    "evidence it was built from, and is stored as a <font face='Courier'>FeedbackSignal</font> with status "
    "<font face='Courier'>proposed</font>.")]
S += [para(
    "A named human then approves or dismisses it. Only on approval is anything written into the task "
    "feature. Every step &mdash; proposed, edited, approved, dismissed &mdash; is appended to the audit "
    "log with who did it and when. A <b>fingerprint</b> of the theme prevents the same proposal being "
    "raised twice.")]

S += [para("Step 5 &mdash; Record against reviewers", H3)]
S += [para(
    "This is the cross-feature comparison, and the part with the most interesting reasoning behind it. The "
    "system holds two completely independent opinions of every person: a <b>score derived from finished "
    "work</b> that nobody typed in, and a <b>rating written by colleagues</b> that nobody computed.")]
S += [para(
    "The obvious way to compare them &mdash; multiply the rating out of 5 by 20 and put it beside the "
    "score out of 100 &mdash; is <b>wrong</b>, and knowing why is the point. Ratings cluster: almost "
    "nobody is given a 1 or a 5, so an average of 3.6 is not \"72% of anything\", it is the middle of the "
    "range people actually use. Rescaling would manufacture disagreement out of nothing but the shape of "
    "the two distributions.")]
S += [para(
    "So both readings are converted to a <b>percentile within this company</b>: where does this person sit "
    "relative to their own colleagues on each instrument. That is unit-free, it survives a lenient or a "
    "harsh review culture, and it turns the comparison into one of ranks rather than of numbers that were "
    "never on the same scale. A gap of more than <b>20 percentile points</b> is treated as a disagreement "
    "worth reading.")]
S += [para(
    "The overall agreement figure is <b>Spearman's rank correlation</b>, chosen over Pearson deliberately: "
    "nothing here claims the two scales are linearly related, only that two instruments measuring anything "
    "alike should put people in a similar order. Ties share the average of the positions they occupy, "
    "otherwise two identical scores would be ranked differently by list order alone.")]
S += [para(
    "Each disagreement then names <b>what the recorded data can and cannot see</b> &mdash; for example, "
    "that collaboration is only 20% of the derived score while completed tasks are 40%, so somebody who "
    "spends their time unblocking others reads as a gap in their own output. Every line is a check that "
    "either holds or does not, so a manager can agree or disagree with each one. Where nothing in the data "
    "explains the gap, it says so rather than inventing a plausible sentence.")]

S += [PageBreak()]

# --- B3 data model -----------------------------------------------------------
S += [para("B3. The database design", H2)]

S += [para("Review &mdash; all four sources in one collection", H3)]
S += [table([
    ["Field", "Type", "What it is for"],
    ["employee", "ObjectId ref", "Who the feedback is about"],
    ["reviewer", "ObjectId ref", "Who wrote it. Null for client feedback"],
    ["reviewerName / clientName", "String", "Kept as text so external client feedback needs no user account"],
    ["source", "String enum", "manager | peer | self | client &mdash; <b>the field that makes one collection work</b>"],
    ["cycle", "String", "The review period, e.g. \"2026-Q3\""],
    ["ratings", "[{competency, score, note}]", "Up to six competencies, each 1&ndash;5, each with optional evidence"],
    ["overall", "Number", "Mean of the competencies actually rated"],
    ["strengths / improvements", "String", "The free text"],
    ["status", "String enum", "draft | submitted | acknowledged"],
    ["acknowledgedAt", "Date", "When the subject read it &mdash; drives the \"not yet read\" count"],
], [40 * mm, 26 * mm, FULL - 66 * mm], code_cols=(0,))]

S += [para("FeedbackSignal &mdash; an agent proposal", H3)]
S += [table([
    ["Field", "Type", "What it is for"],
    ["employee", "ObjectId ref", "Who the theme is about"],
    ["theme / competency", "String", "What the reviewers kept raising"],
    ["evidence", "[Object]", "The reviews it was drawn from, so the proposal can be checked"],
    ["draft", "Object", "The objective the agent would create"],
    ["status", "String enum", "proposed | approved | dismissed"],
    ["approvedBy / approvedByName", "ref / String", "The named human who decided"],
    ["fingerprint", "String", "Stops the same theme being proposed twice"],
    ["engine", "String", "Whether the wording came from Gemini or from the rules"],
], [40 * mm, 26 * mm, FULL - 66 * mm], code_cols=(0,))]

S += [para("AuditEvent &mdash; append-only", H3)]
S += [table([
    ["Field", "Type", "What it is for"],
    ["actorType", "String", "'agent' or 'human' &mdash; so the two can be separated in the log"],
    ["actorName", "String", "Who did it"],
    ["action", "String", "What happened: proposed, approved, dismissed, created"],
    ["subject / subjectId", "String / ref", "What it happened to"],
    ["detail", "Object", "Enough context to reconstruct the decision"],
    ["createdAt", "Date", "When. Records are never updated or deleted"],
], [40 * mm, 26 * mm, FULL - 66 * mm], code_cols=(0,))]

# --- B4 endpoints ------------------------------------------------------------
S += [para("B4. The API", H2)]
S += [para("All under <font face='Courier'>/api/feedback</font>.")]
S += [table([
    ["Method and path", "What it does"],
    ["GET /meta", "Employees, competencies and the current cycle, for the forms"],
    ["GET /overview", "Company summary, per-source averages, roster, people awaiting feedback, open proposals"],
    ["GET /employee/:id", "One person's full dossier: radar, timeline, self-gap, every review"],
    ["GET /reviews", "List reviews, filterable by person, source, cycle or status"],
    ["POST /reviews", "Write a review"],
    ["PATCH /reviews/:id", "Edit one"],
    ["POST /reviews/:id/acknowledge", "The subject marks it read"],
    ["DELETE /reviews/:id", "Remove one"],
    ["GET /calibration", "The reviewer findings: drift, clustering, vague language, distribution"],
    ["GET /reconciliation", "The record against the reviewers &mdash; percentiles, Spearman, and each gap explained"],
    ["POST /agent/scan", "Run the agent over every review and produce proposals"],
    ["GET /signals", "The agent's proposals"],
    ["POST /signals/:id/approve", "A named human approves; only now is an objective created"],
    ["POST /signals/:id/dismiss", "A named human rejects it, with a reason"],
    ["GET /audit", "The append-only trust log"],
], [50 * mm, FULL - 50 * mm], code_cols=(0,))]

S += [PageBreak()]

# --- B5 function reference ---------------------------------------------------
S += [para("B5. Every function, and what it does", H2)]

S += [para("review_service.js &mdash; reviews and the graph (308 lines)", H3)]
S += [table([
    ["Function", "What it does"],
    ["listReviews(filters)", "Reviews matching a person, source, project, cycle or status"],
    ["getReview(id)", "One review in full"],
    ["buildGraph(reviews)", "The radar, the timeline and the self-gap for one person"],
    ["employeeDossier(id)", "Everything about one person: their graph plus every review on record"],
    ["createReview(body, actor)", "Writes a review. Computes the overall from whichever competencies were rated"],
    ["updateReview(id, body)", "Edits one, recomputing the overall"],
    ["acknowledgeReview(id)", "Marks it read by the subject and stamps the time"],
    ["deleteReview(id)", "Removes one"],
    ["pendingAfterDelivery()", "People who finished work on a project and have had nothing said about it"],
    ["defaultCycle()", "The current review period, derived from the date"],
    ["shape(review)", "Turns a database document into the exact shape the frontend expects"],
], [46 * mm, FULL - 46 * mm], code_cols=(0,))]

S += [para("calibration_service.js &mdash; checking the reviewers (293 lines)", H3)]
S += [table([
    ["Function", "What it does"],
    ["driftAgainstPeers(...)", "Compares a reviewer to what <b>other</b> reviewers gave the <b>same</b> people, excluding their own earlier reviews"],
    ["analyseReviewers(reviews)", "Per reviewer: drift, spread, and how specific their language is"],
    ["analyseDepartments(reviews)", "Whether one department rates differently from the rest"],
    ["analyseCompetencies(reviews)", "Which competencies are rated highest and lowest company-wide"],
    ["assessLanguage(text)", "Flags comments that describe the person rather than the work"],
    ["buildDistribution(reviews)", "The shape of scores across the company"],
    ["calibration({cycle})", "Assembles all the findings for the page"],
], [46 * mm, FULL - 46 * mm], code_cols=(0,))]

S += [para("feedback_agent.js &mdash; propose, never decide (461 lines)", H3)]
S += [table([
    ["Function", "What it does"],
    ["scan({employee})", "Reads every submitted review, finds themes raised by 3+ reviewers, drafts one objective per person"],
    ["concernsIn(reviews)", "Groups the recurring concerns by competency"],
    ["draftByRules(theme)", "Writes the objective without a model"],
    ["draftByModel(theme)", "Asks Gemini to phrase the same objective. Falls back to the rules on any failure"],
    ["fingerprintOf(theme)", "A stable key so the same proposal cannot be raised twice"],
    ["listSignals(filters)", "The proposals, by status"],
    ["approveSignal(id, actor)", "The gate. Creates the objective, records who approved it, writes to the audit log"],
    ["dismissSignal(id, actor)", "Rejects it with a reason, also audited"],
], [46 * mm, FULL - 46 * mm], code_cols=(0,))]

S += [para("reconciliation_service.js &mdash; record against reviewers (395 lines)", H3)]
S += [table([
    ["Function", "What it does"],
    ["percentileOf(value, population)", "Where one value sits within the company, 0&ndash;100. Half-credits ties"],
    ["spearman(pairs)", "Rank correlation between the two orderings. Ties share the average rank"],
    ["explain({...})", "Names what the recorded data can and cannot see for one disagreement. Says so when nothing explains it"],
    ["reconcile(options)", "The public entry point: reads the performance overview and the reviews once each, converts both to percentiles, ranks the gaps"],
], [46 * mm, FULL - 46 * mm], code_cols=(0,))]

S += [para("audit_service.js &mdash; the trust log (46 lines)", H3)]
S += [table([
    ["Function", "What it does"],
    ["record(event)", "Appends one event. Nothing in this file updates or deletes"],
    ["byAgent() / byHuman()", "The log split by who acted"],
    ["list(filters)", "The whole trail, newest first"],
], [46 * mm, FULL - 46 * mm], code_cols=(0,))]

S += [para("The frontend (12 files)", H3)]
S += [table([
    ["File", "What it renders"],
    ["feedback_layout.jsx", "The shell: tabs, the \"acting as\" selector, and the <font face='Courier'>.fb</font> style scope"],
    ["feedback_context.js", "The actor context and its hook"],
    ["feedback.jsx", "Company overview: averages per source, who is owed feedback, open proposals, the roster"],
    ["feedback_profile.jsx", "One person: the radar, the timeline, the self-gap, every review"],
    ["feedback_write.jsx", "The review form, with live language checking as you type"],
    ["feedback_calibration.jsx", "The reviewer findings, each showing the comparison that produced it"],
    ["feedback_reconciliation.jsx", "The slope graph, the gap cards and the full table"],
    ["feedback_agent.jsx", "The proposals, and the approve / dismiss gate"],
    ["feedback_trust.jsx", "The append-only audit trail"],
    ["feedback_ui.jsx", "Shared components: Icon, Avatar, SourceTag, Radar, Timeline, Stars, Score, Bar"],
    ["feedback_format.js", "SOURCE colours, sourceColour(), formatDate(), relative()"],
    ["feedback.css", "Every rule scoped under <font face='Courier'>.fb</font>"],
], [44 * mm, FULL - 44 * mm], code_cols=(0,))]

S += [callout(
    "Why a slope graph for the reconciliation page",
    "The question is \"do these two instruments put the same people in the same order\". A slope graph "
    "answers exactly that at a glance: a line runs from where the record places somebody to where the "
    "reviewers place them, so <b>flat lines are agreement and steep lines are disagreement</b>, and the "
    "direction of the slope says which instrument is the generous one. A scatter plot would answer the "
    "same question less directly and a table would not answer it at all.", OK)]

S += [PageBreak()]

# =============================================================================
# PART C - SYNTAX REFERENCE
# =============================================================================
S += [para("Part C", PART)]
S += [para("Syntax and methods used, with what each one does", H1)]
S += [para(
    "Everything listed here appears in the Budget or Feedback source. The counts are how many times each "
    "is used across the two features, so you can see which ones actually matter.", SMALL)]

S += [para("C1. JavaScript language features", H2)]
S += [table([
    ["Syntax", "What it does", "Example from this code"],
    ["=&gt; (arrow function)",
     "A shorter way to write a function. Also keeps the surrounding <font face='Courier'>this</font>",
     "const money = (n) =&gt; Math.round(n * 100) / 100"],
    ["async / await",
     "Marks a function as asynchronous and waits for a promise to settle, so database calls read top to bottom instead of nesting callbacks",
     "const budget = await ProjectBudget.findOne({...})"],
    ["?. (optional chaining)",
     "Reads a property only if the thing before it exists. Returns undefined instead of throwing",
     "row.budget?.currency"],
    ["?? (nullish coalescing)",
     "Uses the right-hand value only when the left is null or undefined. Unlike ||, a valid 0 is kept",
     "entry.costRateOverride ?? budget.projectCostRate ?? 0"],
    ["... (spread / rest)",
     "Copies the contents of an array or object into a new one, or collects extra arguments",
     "{ ...person, recordPercentile }"],
    ["Destructuring",
     "Pulls named values out of an object or array in one statement",
     "const { objective, budget, forecast } = data"],
    ["Template literal",
     "A string in backticks that can embed expressions",
     "`${hours}h at ${rate} an hour`"],
    ["Ternary ? :",
     "A one-line if / else that produces a value",
     "willOverrun ? 'over' : 'ok'"],
], [30 * mm, 62 * mm, FULL - 92 * mm], code_cols=(2,))]

S += [para("C2. Array methods", H2)]
S += [table([
    ["Method", "What it does", "Used here for"],
    [".map()", "Makes a new array by transforming every item", "Turning raw time entries into priced entries (201 uses)"],
    [".filter()", "Makes a new array of only the items that pass a test", "Keeping only the last 14 days of entries (112 uses)"],
    [".reduce()", "Boils an array down to a single value", "Summing cost, hours and billed amounts (45 uses)"],
    [".sort()", "Reorders an array in place using a comparison", "Worst overrun first, biggest gap first (47 uses)"],
    [".find()", "Returns the first item that matches, or undefined", "The rate in force on a given date (43 uses)"],
    [".some()", "True if at least one item matches", "Whether any action is an overload finding"],
    [".slice()", "Copies part of an array without changing the original", "The last 40 ledger rows for the table (30 uses)"],
    [".join()", "Turns an array into a string with a separator", "Building the email text (28 uses)"],
    [".includes()", "True if the array contains a value", "Whether a threshold has already fired"],
    [".push()", "Adds to the end of an array", "Collecting findings as they are discovered (53 uses)"],
    [".reverse()", "Flips the order", "Showing the newest ledger entries first"],
], [22 * mm, 62 * mm, FULL - 84 * mm], code_cols=(0,))]

S += [para("C3. Object, Map and Set", H2)]
S += [table([
    ["Method", "What it does", "Used here for"],
    ["new Map()", "A key-value store that keeps insertion order and allows any key type", "Grouping entries by person or by day (24 uses)"],
    ["new Set()", "A collection with no duplicates", "Unique days worked, unique threshold values (15 uses)"],
    [".get() / .set()", "Read from and write to a Map", "Running totals per person while looping once"],
    [".has()", "Whether a Map or Set contains a key", "Whether a person has already worked on a project"],
    ["Object.entries()", "Turns an object into an array of [key, value] pairs so it can be looped", "Walking a proposed department plan"],
    ["Object.fromEntries()", "The reverse &mdash; builds an object from pairs", "Rebuilding the blended-rate lookup"],
    ["Object.keys() / .values()", "The keys or the values of an object as an array", "Iterating competency scores"],
], [30 * mm, 58 * mm, FULL - 88 * mm], code_cols=(0,))]

S += [para("C4. Math and numbers", H2)]
S += [table([
    ["Method", "What it does", "Used here for"],
    ["Math.round()", "Nearest whole number", "Rounding money to cents and percentages to whole numbers (42 uses)"],
    ["Math.max() / Math.min()", "Largest or smallest of the arguments", "Clamping the confidence spread between 8% and 42%"],
    ["Math.abs()", "Removes the sign", "Ranking gaps by size regardless of direction"],
    ["Math.sqrt()", "Square root", "Standard deviation, for the confidence range and for Spearman"],
    ["Math.floor() / Math.ceil()", "Rounds down or up", "Percentile index; days to finish always rounds up"],
    [".toFixed(n)", "Formats a number to n decimal places, as a string", "Compact money like $12.5k"],
    [".toLocaleString()", "Formats a number with thousands separators", "$13,446 rather than 13446"],
], [30 * mm, 52 * mm, FULL - 82 * mm], code_cols=(0,))]

S += [para("C5. Mongoose &mdash; talking to MongoDB", H2)]
S += [table([
    ["Method", "What it does", "Used here for"],
    ["Model.find(filter)", "Every document matching a filter", "All time entries for a project (43 uses)"],
    ["Model.findById(id)", "One document by its _id", "Loading one project or one review (16 uses)"],
    ["Model.findOne(filter)", "The first document matching a filter", "The budget for a project; the open shift for a person"],
    ["Model.create(doc)", "Inserts a new document", "A new time entry, rate or review"],
    ["doc.save()", "Writes changes to an already-loaded document back to the database", "Closing a shift; recording fired thresholds"],
    [".populate(path, fields)", "Replaces a stored reference id with the actual document", "Turning an employee id into a name and colour (20 uses)"],
    [".select(fields)", "Asks for only certain fields, so less data crosses the wire", "Loading just name and email for the alert (15 uses)"],
    [".sort({field: 1})", "Orders the results in the database rather than in JavaScript", "Rates newest-first, entries oldest-first"],
    ["Model.updateOne(filter, update)", "Changes matching documents without loading them", "Resetting fired thresholds"],
    ["Model.countDocuments()", "Counts without fetching", "How many employees have an email address"],
    ["Model.distinct(field)", "The unique values of one field", "Which tasks have any time entries at all"],
    ["Model.aggregate([...])", "A pipeline that groups and totals inside the database", "Summing hours per task in one query rather than in a loop"],
    ["Model.bulkWrite(ops)", "Many writes in a single round trip", "Repairing spentHours across many tasks at once"],
], [38 * mm, 52 * mm, FULL - 90 * mm], code_cols=(0,))]

S += [callout(
    "Promise.all &mdash; worth knowing why it is there",
    "<font face='Courier'>await Promise.all([a(), b(), c()])</font> starts several database queries at "
    "once and waits for all of them, instead of waiting for each in turn. The portfolio page originally "
    "loaded every project one after another, and each one re-fetched the whole rate table and employee "
    "list &mdash; twenty-four round trips to Atlas to draw one screen. Loading the shared data once and "
    "running the projects in parallel took it from 671ms to 401ms.", NAVY_MID)]

S += [para("C6. Express &mdash; the HTTP layer", H2)]
S += [table([
    ["Method", "What it does"],
    ["express.Router()", "A mini application that groups related routes, mounted under one path prefix"],
    ["router.get / post / patch / delete", "Registers a handler for one HTTP method and path"],
    ["app.use(path, router)", "Mounts a router, so <font face='Courier'>/api/budget</font> + <font face='Courier'>/portfolio</font> becomes the full path"],
    ["req.params", "Values from the URL, such as the <font face='Courier'>:id</font> in /project/:id"],
    ["req.query", "Values from the query string, such as <font face='Courier'>?cycle=2026-Q3</font>"],
    ["req.body", "The JSON sent with a POST or PATCH"],
    ["res.json(data)", "Sends a JSON response"],
    ["res.status(code)", "Sets the HTTP status before sending"],
    ["next(err)", "Passes an error to the shared error handler instead of crashing the request"],
], [46 * mm, FULL - 46 * mm], code_cols=(0,))]
S += [para(
    "Both controllers wrap every handler in a small <font face='Courier'>asyncRoute()</font> helper. An "
    "async function that throws returns a rejected promise, and Express 5 will not catch that on its own, "
    "so the helper attaches a <font face='Courier'>.catch(next)</font> to every route. Without it a "
    "database error would hang the request instead of returning a clean 500.", SMALL)]

S += [para("C7. React &mdash; the frontend", H2)]
S += [table([
    ["Hook or API", "What it does", "Used here for"],
    ["useState(initial)", "Holds a value that, when changed, re-renders the component", "The loaded data, which drawer is open, form fields (98 uses)"],
    ["useEffect(fn, deps)", "Runs a side effect after render, re-running when the dependencies change", "Fetching from the API when the page mounts (29 uses)"],
    ["useCallback(fn, deps)", "Keeps the same function identity between renders", "The load() function, so the effect does not loop (28 uses)"],
    ["useMemo(fn, deps)", "Caches an expensive calculation until its inputs change", "The live language check on the review form (10 uses)"],
    ["createContext / useContext", "Shares a value down the tree without passing props through every level", "Who is \"acting as\", available to every page in the feature"],
    ["useParams()", "Reads the <font face='Courier'>:id</font> from the current route", "Which project or which person to load"],
    ["useNavigate()", "Moves to another route from code rather than from a link", "Opening a project when the whole card is clicked"],
    ["&lt;Link to=\"...\"&gt;", "A navigation link that does not reload the page", "Every cross-page link in both features"],
    ["Conditional rendering", "<font face='Courier'>{open &amp;&amp; &lt;div/&gt;}</font> renders only when the condition holds", "Drawers, empty states, error banners"],
    ["key prop", "Gives React a stable identity for each item in a list so it can update efficiently", "Every .map() that renders rows or cards"],
], [34 * mm, 52 * mm, FULL - 86 * mm], code_cols=(0,))]

S += [callout(
    "One React rule worth quoting",
    "A value that can be worked out from existing state should be <b>derived during render</b>, not stored "
    "in state and synchronised with an effect. The review form originally used two effects to write back "
    "into its own form state, which is a render loop wearing a disguise: it set state, re-rendered, and "
    "the effect ran again to check its own work. Both are now single derived constants.", NAVY_MID)]

S += [PageBreak()]

# =============================================================================
# PART D - VIVA
# =============================================================================
S += [para("Part D", PART)]
S += [para("Questions you are likely to be asked", H1)]

S += [para("On the Budget feature", H2)]

S += [qa("Why is the forecast built from 14 days rather than the whole project?",
         "Because a lifetime average is dragged towards whatever the team was doing months ago. A project "
         "can look completely calm on its lifetime average while the last fortnight has already decided "
         "the outcome. Fourteen days is long enough to survive one quiet Friday and short enough that a "
         "change of pace shows up while it still matters.")]

S += [qa("Why show a range instead of a single predicted number?",
         "Because a single number is a confidence nobody has earned. The range comes from how variable the "
         "daily burn has actually been &mdash; the standard deviation divided by the mean. A steady "
         "project earns a narrow band and an erratic one earns a wide one. Saying $11,000 to $12,100 is "
         "less impressive than saying $11,568 and far more honest, because it tells the manager whether "
         "the number is worth acting on.")]

S += [qa("Why do you store rates in a separate collection instead of a field on the employee?",
         "Because a single field on the employee would be edited when somebody is promoted, and that would "
         "silently rewrite what last quarter's hours cost &mdash; changing margin on projects that already "
         "closed. A dated Rate row means a rise applies only from the day it happened. I can demonstrate "
         "it: work logged 22 days ago still costs $42 an hour while work logged 21 days ago costs $50.")]

S += [qa("Why is the hard stop off by default?",
         "Because refusing to record work somebody genuinely did makes the ledger wrong, and a wrong "
         "ledger is usually worse than an overrun &mdash; every forecast built on it afterwards is also "
         "wrong. It exists for fixed-fee contracts where the cap is contractual, and it is opt-in.")]

S += [qa("How do you make sure an alert fires only once?",
         "The budget document keeps two lists: the thresholds being watched, and the ones already fired. "
         "After time is logged the current percentage is compared against both, and only newly crossed "
         "levels are recorded and announced. If several are crossed at once only one email goes out, for "
         "the highest, but all of them are marked fired so none can fire again.")]

S += [qa("What does the AI actually do here?",
         "It phrases one summary paragraph and nothing else. It is sent only the findings the code has "
         "already computed &mdash; never the raw ledger &mdash; so it has nothing to invent a figure from. "
         "Without an API key a rules-based writer produces the same summary and the page says which one "
         "wrote it. Earlier the page reported a model name whenever a key existed while never actually "
         "calling it, which was a claim the code had not earned, so that was fixed.")]

S += [para("On the Feedback feature", H2)]

S += [qa("Why are all four review sources in one collection?",
         "Because the comparison between them is the finding. If manager, peer, self and client feedback "
         "live in four tables or four tabs, you can only read them one at a time. In one collection with a "
         "source field they can be drawn on one set of axes, and then the gap between what somebody says "
         "about themselves and what everybody else says becomes visible &mdash; which is the single most "
         "useful thing the data contains.")]

S += [qa("How does calibration decide a reviewer is harsh?",
         "Not against the company mean &mdash; that was the first version and it was wrong, because it "
         "flags anybody who happens to review a weak team. It compares a reviewer against what other "
         "reviewers gave the same people. Their own earlier reviews are excluded from that baseline, "
         "otherwise they are partly compared against themselves and every drift figure is dragged towards "
         "zero.")]

S += [qa("What stops the agent from writing rubbish into the system?",
         "It cannot write at all. It produces a proposal with the evidence attached, and a named human "
         "approves or dismisses it. Only on approval is an objective created. Every step goes into an "
         "append-only audit log with who acted and when, and a fingerprint stops the same theme being "
         "raised twice. It also proposes only the strongest theme per person, because a development plan "
         "with six items is not a plan.")]

S += [qa("Why convert to percentiles instead of just scaling the rating to 100?",
         "Because ratings cluster. Almost nobody is given a 1 or a 5, so an average of 3.6 is not 72% of "
         "anything &mdash; it is the middle of the range people actually use. Multiplying by 20 and "
         "putting it beside a score out of 100 would manufacture disagreement out of nothing but the shape "
         "of the two distributions. Percentiles within the company are unit-free and survive a lenient or "
         "harsh review culture.")]

S += [qa("Why Spearman rather than Pearson?",
         "Because I am not claiming the two scales are linearly related &mdash; only that two instruments "
         "measuring anything alike should put people in a similar order. Spearman correlates the ranks, "
         "which is exactly that claim and no more. Pearson would assume a straight-line relationship "
         "between a derived score and a human rating, which there is no reason to expect.")]

S += [qa("What if the two disagree about somebody and nothing explains it?",
         "The page says so. It reports that none of the usual causes hold &mdash; they are not overloaded, "
         "not slipping, and the ratings are not concentrated in one competency &mdash; and that this makes "
         "it a question for a conversation rather than for another query. Padding the card with a "
         "plausible sentence would be worse than useless.")]

S += [para("On both", H2)]

S += [qa("Why can no existing product do the cross-feature comparisons?",
         "Because the industry is split down exactly that line. Review platforms hold the human half and "
         "have no record of what anybody shipped. Work trackers hold the recorded half and have never "
         "heard of a review cycle. Time and billing tools own cost but not deadlines. This system holds "
         "the tasks, the time, the rates and the reviews in one database, so it can ask questions that "
         "need two halves at once &mdash; what a deadline change costs, or whether the reviewers and the "
         "delivery record agree about the same person.")]

S += [qa("How is the styling kept from breaking the rest of the app?",
         "Every rule in each feature's stylesheet is scoped under a wrapper class &mdash; "
         "<font face='Courier'>.bud</font> for budget and <font face='Courier'>.fb</font> for feedback. "
         "The application already carries Bootstrap, the team's global stylesheet and two other feature "
         "stylesheets, and all of them define .card and .btn. Without the scope, whichever file the "
         "bundler emitted last would decide what the leave form looks like. The stylesheet is also "
         "imported inside the layout component, so it does not load at all until one of those pages is "
         "opened.")]

S += [qa("Give an example of a performance problem you found and fixed.",
         "Listing rates fetched every rate row with its employee populated, and then re-fetched each row "
         "one at a time to format it &mdash; fifteen round trips to Atlas for data already in memory. "
         "Making the formatter a pure function over the document already in hand reduced it to one query. "
         "The same class of mistake appeared in the advisor, which re-queried the tasks that had already "
         "been loaded a moment earlier.")]

S += [Spacer(1, 5 * mm)]
S += [callout(
    "The sentence to have ready",
    "\"Both features were built to be defended rather than demonstrated. Every number on screen can be "
    "traced back to the records that produced it, the AI is only ever allowed to phrase and never to "
    "calculate, and where the data cannot answer a question the interface says so instead of guessing.\"",
    OK)]

import os
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Budget_and_Feedback_Code_Guide.pdf")
build(out, S)
print("Built", out)
