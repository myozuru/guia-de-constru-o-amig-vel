# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The product serves the Master and players in the *The Saint Promisse* RPG campaign. The Master manages the shared campaign and controls which sheet fields players can see. Players use character sheets and shared campaign tools during play.

## Product Purpose

*The Saint Promisse — TP Fichas* is a web app for managing character sheets, combat, tests and 3D dice, items, maps, and campaign workflows. It supports the Master and players using the same campaign. The project records do not define a success metric beyond supporting these workflows.

## Positioning

A role-aware tabletop app for *The Saint Promisse* campaign, bringing character management and live play tools into one place. The project does not document a broader market claim.

## Operating Context

The app is used by the Master and players during an RPG campaign. It supports shared world state across clients and local persistence for offline use. Accounts use nicknames and passwords; the Master role is assigned through `user_roles`.

The TP Fichas experience is client-rendered at `/` because its stores, 3D dice, audio, and local persistence depend on browser APIs.

## Capabilities and Constraints

- The Master has campaign editing controls; player sheets filter fields according to their reveal settings.
- Multiplayer world state uses `realtime_world`; images use `realtime_assets`; temporary sheet templates use `tempTemplates`, with local persistence as an offline cache.
- Cloud clients use only this workspace's environment configuration. When it is absent, the app uses an offline stub so it cannot reach another project's data.
- Visual work is limited to the site's identity, HUD, UI/UX, and invocation library. It must preserve RPG rules and logic, stores, contracts, character sheets, and campaign data.

## Brand Commitments

The current product title in `src/routes/index.tsx` is *The Saint Promisse — TP Fichas*. No separate voice standard is documented.

## Evidence on Hand

- `src/routes/index.tsx` identifies the product and describes its campaign workflows.
- `AGENTS.md` records role behavior, visibility, synchronization, and workspace configuration constraints.
- `package.json` records the TanStack Start, React, and TypeScript app setup and the `npm run dev` command.
- No verified testimonials, pricing, customer counts, or case studies were found in the product materials reviewed; future product copy must not invent them.

## Product Principles

- Keep the Master in control of campaign configuration and player-facing visibility.
- Support both Master and player roles in shared campaign workflows.
- Preserve existing RPG behavior and campaign data during visual work.
