# Fix-It Run 🔧

A little web game about a home-appliance technician's day: **drive** to the
customer's home, **diagnose** the problem, **repair** the appliance, and earn a
5-star review.

## Run locally

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
```

```bash
npm run dev
```

Then open the URL printed in the terminal (default: http://localhost:5173).

## How to play

Each day has 3 service calls. Every call has three stages:

| Stage | Goal | Controls |
| --- | --- | --- |
| 1. Drive | Reach the home inside the appointment window. Dodge cars, cones and potholes; grab part boxes for a bonus. | `←` `→` or `A` `D`, or tap the left / right side |
| 2. Diagnose | Listen to the customer and pick the faulty part. | `1` `2` `3` or click |
| 3. Repair | Stop the marker in the green zone for each of the 3 repair steps. | `Space` or tap |

Arriving on time, diagnosing right the first time and making a clean repair
earns more stars — and a bigger tip. Your best day is saved in the browser.

## Project layout

- `index.html` – page shell
- `src/main.js` – game loop, stages and rendering (HTML canvas, no runtime dependencies)
- `src/jobs.js` – service-call content (customers, appliances, symptoms) — add new jobs here
- `src/style.css` – page styling

`npm run build` produces a static bundle in `dist/` that can be hosted anywhere.
