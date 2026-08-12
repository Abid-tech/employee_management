# Client Brief — Doorbell Courier Tracking Platform

Prepared for Northwind Digital
Contact: Nafisa Haque, Chief Operating Officer, Doorbell Logistics

## Background

Doorbell Logistics moves about twelve thousand parcels a week across Dhaka and
Chattogram with a fleet of two hundred riders. Every parcel is tracked on a
paper manifest that a rider hands back at the end of a shift, so the office
cannot answer "where is my parcel" until the next morning. Customers call the
support line instead, and roughly a third of those calls are people asking a
question nobody in the building can answer yet.

They want a platform where riders scan each parcel at pickup and delivery,
customers follow their own parcel on a public tracking page, and the operations
desk sees every rider on one live map.

## What we need built

- Build the rider mobile screen for scanning a parcel barcode at pickup and drop-off
- Create the parcel tracking API that returns the current status and location history
- Set up the database schema for parcels, riders, routes and scan events
- Design the public tracking screen that a customer opens from an SMS link
- Build the operations dashboard showing every active rider on one map
- Integrate the SMS gateway so customers get a message at dispatch and on delivery
- Write end to end tests for the scan, dispatch and delivery paths
- Research how two competing courier firms handle failed delivery attempts
- Deploy the platform to a staging environment for the operations team to trial
- Draft the rider training manual in Bangla with screenshots
- Prepare the launch announcement for the customer newsletter
- Update the rider onboarding policy to cover the new scanning process

## Constraints

The barcode scanning screen and the tracking API are critical. Doorbell has
promised the new tracking page to its three largest retail clients before the
Eid rush, and neither of those can slip.

The operations map is important but can follow three weeks later, once scanning
data is actually flowing.

The customer newsletter and the rider training manual are nice to have for
launch day and can be finished afterwards if time runs short.

A security review is required before any real customer addresses are loaded.

## Out of scope

Cash on delivery reconciliation, which stays in the existing finance system.
Route optimisation is a later phase and is not part of this work.
