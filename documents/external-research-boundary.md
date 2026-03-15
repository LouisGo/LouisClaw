# External Research Boundary

## Goal

Let OpenClaw do narrowly scoped external web research only when local materials are not enough to support a high-quality morning topic.

## Responsibility Split

- `LouisClaw`
  - decides whether local material is sufficient
  - prepares a bounded research request
  - stores requests and packets on disk
  - turns local + external materials into morning topic outputs
- `OpenClaw`
  - fulfills a prepared request
  - reads a small number of public sources
  - writes back one compact research packet
  - does not decide the broader topic strategy on its own

## Hard Boundaries

- off by default
- only for subscribed morning topics
- only when local material count is below threshold
- one packet per topic per day
- bounded source count
- no open-ended browsing
- no continuous background research
- no silent expansion into adjacent themes

## Cost Control

- default `max_sources=6`
- default `min_local_items=3`
- external research schedules are defined but not installed by default
- if local material is already sufficient, request preparation skips and OpenClaw should do nothing

## File Contract

- requests: `data/research/requests/*.md`
- packets: `data/research/packets/*.md`

Request files are written by LouisClaw.
Packet files are fulfilled by OpenClaw.

## Packet Shape

Each packet should stay compact and include:

- conclusion
- up to 6 key findings
- source URLs
- confidence note
- exact topic label

The packet is a supplement, not the final morning article.
