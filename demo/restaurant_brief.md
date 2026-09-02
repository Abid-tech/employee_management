# Client Brief — Bengal Bites Online Ordering Platform

Prepared for Northwind Digital
Contact: Tanvir Alam, Operations Director, Bengal Bites Restaurants

## Background

Bengal Bites runs eleven restaurants across Dhaka and takes about four thousand
delivery orders a week. Every order arrives by phone, is written on a pad at the
counter, and is carried to the kitchen by hand. Nobody can tell a customer how
long their food will take, branch managers only learn what sold when they count
the pads at midnight, and an order lost between the counter and the kitchen is
discovered when the customer calls back angry.

They want a platform where customers order from their phone, the kitchen sees
each order appear on a screen as it is placed, and every branch manager can see
what is selling while the evening is still running.

## What we need built

- Build the customer ordering screen for browsing the menu and placing an order
- Create the order management API that accepts an order and returns its kitchen status
- Set up the database schema for menu items, orders, branches and delivery riders
- Design the kitchen display screen that groups incoming orders by preparation stage
- Build the branch manager dashboard reporting daily sales and the most popular items
- Integrate the payment gateway so customers can pay by card or mobile wallet
- Write end to end tests for the ordering, payment and cancellation paths
- Research how two competing food delivery apps handle a cancelled order
- Deploy the platform to a staging environment for the Dhanmondi branch to trial
- Draft the kitchen staff training manual in Bangla with screenshots
- Prepare the launch campaign for the loyalty newsletter
- Update the delivery rider onboarding policy to cover the new order flow

## Constraints

The customer ordering screen and the order management API are critical. Bengal
Bites has already booked radio advertising for the first week of next month and
neither of those can slip.

The branch manager dashboard is important but can follow two weeks later, once
real orders are flowing through the system.

The loyalty newsletter campaign and the kitchen training manual are nice to have
for launch day and can be finished afterwards if time runs short.

A security review is required before any card payments are accepted.

## Out of scope

Table reservations and the in-restaurant point of sale, which stay on the
existing till system. Supplier and stock ordering is a later phase and is not
part of this work.
