# Client Brief — Shefa Clinic Appointment System

Prepared for Northwind Digital
Contact: Dr. Tanvir Alam, Operations Director, Shefa Clinic Dhaka

## Background

Shefa Clinic runs four branches and books roughly nine hundred appointments a
week. Every booking is taken over the phone and written into a paper diary at
the branch that took the call. Patients who move between branches have to
repeat their history each time, and the clinic cannot tell how many slots went
unused until the diary is counted at month end.

They want a system where patients book their own appointments online, staff see
one shared schedule across all four branches, and doctors open a patient's
history before the consultation starts.

## What we need built

- Build the patient registration screen with mobile number verification
- Create the appointment booking API that holds a slot for ten minutes while payment is confirmed
- Design the shared branch schedule screen showing all four branches side by side
- Set up the database schema for patients, branches, doctors and appointment slots
- Build the SMS reminder integration that texts patients a day before the visit
- Implement the doctor's consultation view with the patient's past visit history
- Write end to end tests for the booking and cancellation paths
- Research how two competing clinic chains handle no-shows and overbooking
- Deploy the system to a staging environment for the clinic to trial
- Draft the reception staff training manual in Bangla
- Prepare the launch campaign for the clinic's Facebook page
- Update the staff onboarding policy to cover the new system

## Constraints

Patient registration and the booking API are critical. The clinic has committed
to a public launch at the end of the quarter and neither of those can slip.

The SMS reminder work is important but can follow two weeks later, once the
booking flow is stable.

The Facebook launch campaign and the training manual are nice to have for
opening day and can be finished afterwards if time runs short.

A security review is required before any real patient records are loaded.

## Out of scope

Billing and insurance claims, which stay in the clinic's existing accounting
software. Prescriptions remain on paper for this phase.
