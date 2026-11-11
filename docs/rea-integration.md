# REA capability model and integration boundary

The workbench treats **Reverse Engineer Anything (REA)** as an upstream, evidence-producing analysis system, not as a generic financial agent. REA capabilities are invoked only for compatible, authorized technical targets and only through its supported CLI/MCP contracts. It does not provide market quotes, financial advice, trading strategy validation, or exchange execution.

## REA capability classes

Based on the public upstream project documentation and tool catalog, REA's strongest workbench fit is:

1. **Capability discovery and cross-tool analysis:** REA advertises supported operations and routes compatible binaries, applications, and runtime-analysis tasks through provider adapters. Actual provider availability and host constraints must be read from its capability inventory; the workbench must not promise a particular decompiler is installed or available.
2. **Targeted technical analysis:** Native binary analysis, application/package analysis, managed-code analysis, web/application inspection, and runtime observations are distinct tool families. Target type and supported operations determine which can be called. Large targets should be investigated through focused function/call-graph or application-graph tools, rather than dumping raw disassembly into a general agent context.
3. **Evidence-backed reconstruction:** REA can return evidence, limitations, and unknowns for analysis results and support reconstruction workflows where an upstream tool contract provides them. A reconstruction is a derived artifact, not proof of equivalence or original source. Test it independently against authorized references and preserve unresolved behavior.

REA's upstream claims include local analysis for supported capabilities and structured evidence/limitations. This workbench does not independently verify every provider, platform, or reconstruction feature. Consult the current [REA README](https://github.com/morluto/rea), [MCP contracts](https://github.com/morluto/rea/blob/main/docs/reference/mcp-contracts.md), and capability inventory before enabling an adapter.

## Claim discipline

This workbench uses typed claim statuses:

- `observed`: direct provider/data observation with source identity and timestamp.
- `observed_sample`: illustrative or synthetic input; never current-market fact.
- `inferred`: a relationship or interpretation derived from observations.
- `unknown`: evidence is unavailable, incomplete, unsupported, or ambiguous.
- `reconstructed`: generated replacement behavior; does not assert source equivalence.

These are workbench claim categories, not a substitute for REA's own Evidence schema. REA Evidence should be retained intact and linked by upstream run/evidence identity; adapters must not flatten, rewrite, or misattribute its provenance. Failed and partial provider outcomes stay visible.

## Adapter contract (planned; not yet connected)

- Discover REA and its current version/capabilities through a documented MCP client or CLI contract.
- Match task/target to advertised operation; refuse unsupported capability rather than guessing.
- Keep target access, provider licensing, authorization, process capture, and cleanup under REA's actual boundaries.
- Store the upstream response/artifact reference and source version; label workbench commentary as derived.
- Keep reconstruction separate from the analyzed original, run tests on authorized fixtures, and report mismatches/unknowns.
- Do not execute reconstructed code or inspect third-party targets without authorization.

This alpha does not launch REA, pretend its tools are installed, import its private APIs, or claim a connection to the user's `Reverse-Engineer-Anything` fork. The user's fork is important to the roadmap; its URL/access and supported integration contract must be confirmed before a connector is added. No upstream source is copied into this repository.
