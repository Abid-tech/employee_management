# Client Brief — Meghna Group Supplier Portal

Prepared for Northwind Digital
Contact: Farhana Rahim, Head of Procurement, Meghna Group

## Background

Meghna Group works with just over four hundred suppliers across garments and
packaging. Purchase orders are sent by email and confirmed by phone, so nobody
can say with confidence which orders are outstanding on any given day. The
finance team rebuilds the picture in a spreadsheet every Sunday.

They want a portal where suppliers log in, see their own orders, confirm or
query them, and upload invoices themselves.

## What we need built

- Build a supplier login screen with email verification and password reset
- Create the purchase order list endpoint, filtered to the signed-in supplier
- Design the order detail screen showing line items, delivery dates and status
- Set up the database schema for suppliers, orders and invoice documents
- Build the invoice upload flow with file size and format validation
- Write end to end tests for the order confirmation path
- Deploy the portal to a staging environment for the client to review
- Research how three competing supplier portals handle partial deliveries
- Draft the supplier onboarding guide in Bangla and English
- Prepare the launch announcement for the procurement team

## Constraints

The login and the order list are critical — the client has committed to a
supplier demo in three weeks and neither can slip. Invoice upload is important
but can follow a fortnight later.

The onboarding guide is nice to have for launch and can be finished afterwards
if time runs short.

Security review is required before anything touches real supplier data.

## Out of scope

Payment processing, which stays in their existing accounting system.
