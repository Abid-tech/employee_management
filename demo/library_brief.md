# Client Brief — Central Library Borrowing System

Prepared for Northwind Digital
Contact: Dr Rehana Karim, Chief Librarian, Central University Library

## Background

The Central University Library holds about ninety thousand titles and serves
eleven thousand students. Borrowing is recorded in a ledger at the issue desk,
so a student who wants to know whether a book is on the shelf has to walk to
the third floor and look. Overdue notices are typed by hand once a fortnight,
by which time a book has usually been missing for a month, and the queue at the
issue desk during examination weeks runs past the entrance.

They want a system where students search the catalogue from their phone, borrow
and return at a self-service kiosk, and librarians see overdue loans without
counting anything by hand.

## What we need built

- Build the student catalogue search screen for finding a title and checking availability
- Create the borrowing API that issues, renews and returns a copy
- Set up the database schema for titles, copies, members and loans
- Design the wireframes and branding for the borrowing kiosk
- Build the librarian dashboard reporting overdue loans and the most borrowed titles
- Integrate the SMS gateway so a member is reminded before a loan falls due
- Write end to end tests for the issue, renew and return paths
- Research how two other university libraries handle reservation queues
- Deploy the system to a staging environment for the main reading room to trial
- Draft the library assistant training manual with screenshots
- Prepare the announcement campaign for the student newsletter
- Update the borrowing policy to cover the new renewal limits

## Constraints

The catalogue search screen and the borrowing API are critical. The library has
committed to running the new system from the start of the next semester and
neither of those can slip.

The librarian dashboard is important but can follow three weeks later, once loan
data is actually being recorded.

The student newsletter campaign and the library assistant training manual are
nice to have for the opening week and can be finished afterwards if time runs
short.

A security review is required before any student records are loaded.

## Out of scope

Inter-library loans and the journal subscription catalogue, which stay with the
existing supplier. Fine collection and payment is a later phase and is not part
of this work.
