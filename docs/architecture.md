# Architecture

The SUN Financial Workbench is composed of modular layers with clean responsibility boundaries.

## Layer 1: Domain adapters

These modules connect to external systems and capabilities, including:
- REA / reverse engineering tools
- market data providers
- file system and artifact ingestion
- identity and authentication boundaries
- execution or simulation providers

## Layer 2: Intelligence and evidence

This captures the actual artifacts and observations:
- binary metadata
- memory and symbol observations
- financial signal data
- strategy reasoning records
- evidence bundles and provenance scores

## Layer 3: Agent intelligence

Agents operate under explicit task patterns:
- researcher
- analyst
- strategist
- risk reviewer
- executor
- memory curator

## Layer 4: Workbench orchestration

The orchestration layer manages:
- task routing
- context assembly
- memory retrieval
- approval and safety gates
- simulation or execution dispatch

## Layer 5: Paper trading and risk sandbox

The paper-trading layer is intentionally separate from live execution. It is responsible for:
- simulation of orders
- portfolio state
- performance tracking
- strategy validation
- risk review and scenario analysis

## Layer 6: Human control plane

All high-risk or irreversible actions pass through human review. The platform should create a visible review trail for:
- approval requests
- evidence summaries
- execution states
- fallback decisions

## Architectural emphasis

The design favors:
- explicit contracts
- observable state
- separable tool boundaries
- human-in-the-loop review
- provenance over guesswork

## Future evolution

This architecture is intended to evolve toward a real mission-control platform that can support technical investigations, market intelligence, simulation, and controlled autonomous execution without collapsing boundaries between analysis and action.
