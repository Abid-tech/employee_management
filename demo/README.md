# Demo files

Sample documents for showing the **Add work → From a document** feature.

| File | Use it for |
| --- | --- |
| `courier_brief.md` / `.pdf` / `.docx` | A courier tracking platform. Twelve bullets, twelve tasks, all four departments. The cleanest one to demonstrate. |
| `clinic_brief.md` / `.pdf` / `.docx` | A clinic appointment system. Twelve tasks across all four departments. |
| `project_brief.md` / `.pdf` / `.docx` | A supplier portal. Ten tasks. The original sample. |

The `.md` file is the source in each case. Regenerate the PDF and Word versions
after editing it:

```bash
node demo/make_demo_files.js clinic_brief
```

Leave the argument off and it rebuilds `project_brief` instead.

## What `courier_brief.pdf` should produce

Twelve tasks — **96h estimated, 8 with an owner**:

```
Build the rider mobile screen ................  Engineering      Rahim Uddin
Create the parcel tracking API ...............  Engineering      Ayan Mahmud
Set up the database schema ...................  Engineering      Ayan Mahmud
Design the public tracking screen ............  Design           Karim Chowdhury
Build the operations dashboard ...............  Engineering      —
Integrate the SMS gateway ....................  Engineering      —
Write end to end tests .......................  Engineering      Sadia Karim
Research two competing courier firms .........  Engineering      —
Deploy the platform to staging ...............  Engineering      —
Draft the rider training manual ..............  Human Resources  Nusrat Jahan
Prepare the launch announcement ..............  Marketing        Mehedi Hasan
Update the rider onboarding policy ...........  Human Resources  Nusrat Jahan
```

Note the source has exactly twelve bullets. That is deliberate: the planner caps
a plan at twelve tasks, so a longer brief would have its tail dropped rather
than silently producing a list nobody can work through.

## What `clinic_brief.pdf` should produce

Twelve tasks, routed across every department:

```
Build the patient registration screen ........  Engineering      Rahim Uddin
Create the appointment booking API ...........  Engineering      Ayan Mahmud
Design the shared branch schedule screen .....  Design           Karim Chowdhury
Set up the database schema ...................  Engineering      Ayan Mahmud
Build the SMS reminder integration ...........  Engineering      Ayan Mahmud
Implement the doctor's consultation view .....  Engineering      —
Write end to end tests .......................  Engineering      Sadia Karim
Research two competing clinic chains .........  Engineering      —
Deploy the system to staging .................  Engineering      —
Draft the reception staff training manual ....  Human Resources  Nusrat Jahan
Prepare the launch campaign ..................  Marketing        Mehedi Hasan
Update the staff onboarding policy ...........  Human Resources  Nusrat Jahan
```

Totals on the review screen: **12 tasks, 96h estimated, 9 with an owner**.

## A note on the two engines

Without `GEMINI_API_KEY` in `backend/.env`, a built-in reader parses the
document's structure. It gets the tasks and the routing right, but it reads
each line on its own, so it cannot connect *"patient registration and the
booking API are critical"* in the Constraints section back to the bullets
further up — everything comes out as medium priority.

With a Gemini key it reads the whole document at once, so those two come back
marked critical, the SMS reminder high, and the training manual and Facebook
campaign low. The interface always names which engine answered, so nobody has
to guess which one they are looking at.

Worth setting the key before a presentation: it is free, takes two minutes at
<https://aistudio.google.com/apikey>, and the difference is visible on screen.

## Where a task goes when the reader cannot tell

Some lines carry no signal at all — *"Deploy the system to a staging
environment"* names no skill the roster knows about. Those fall back to the
department with the most people on it (Engineering here, with six), rather than
to whichever department happens to sort first alphabetically.
