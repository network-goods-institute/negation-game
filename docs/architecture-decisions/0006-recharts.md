# 1. Recharts

Date: 2024-11-07

## Status

Accepted

## Context

We'll include charts with a timeline of the favor of points across time. I decided to go with [Recharts](https://recharts.org) because I have experience with it and it's very customizeable, but after implementing with it, I found it to have too many UX limitations for this usecase.

- it only shows the tooltip for actual data points, and doesn't interpolate the line to show the tooltip at any position. That makes it harder to read the chart when looking for a specific date.
- The animations are also a bit buggy and weird.
- the line interpolations are not smooth. The ones that are supposed to be have some weird artifacts

That might have something to do with the fact that I'm returning sparse time series to optimize the amount of data that needs to be downloaded (only return the data points that have actual value changes instead of returning points for every single date value), but I definitely want to keep it that way because I expect this kind of data to be sparse for a lot of Points, since there could be some forks in the graph that are left unnatended for a while, and then get rediscovered and get more activity again

I'm looking into what Polymarket uses, because it is very pretty and smooth, and seems like they use TradingView's [Lightweight Charts](https://github.com/tradingview/lightweight-charts).

Since we have other priorities now, I won't try that out right away, but after taking care of the more important missing features, I'll revisit this decision

## Decision

We'll use recharts for now because it is already implemented, but this decision will be revisited when we manage to prioritize it again.

## Consequences

Point page charts work well enough for people to get the idea, although they're quite a bit rought around the edges

I'll refrain from adding sparklines for the more succinct point cards for now because I'd have to redo them when changing to LW charts.
