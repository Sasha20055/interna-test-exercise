# Agent instructions

Read [docs/SDD.md](docs/SDD.md) before changing this project. It is the authoritative specification, placement guide, roadmap and acceptance checklist.

- Preserve the starter architecture, public contracts, original tests and fixture.
- Keep params, pure compute and view separate. Keep widget internals in the existing flat `src/widget/` tree with a widget-name prefix.
- Follow SDD type ownership and dependency direction. No generic utility dumping grounds or alternative architectures.
- Complete one assigned task with its tests and evidence before moving on. There is no line-count limit.
- Write self-explanatory code. Comments are exceptional and must be English; preserve useful contract documentation.
- Do not introduce `any`, suppressions, speculative dependencies or derived React state.
- Run relevant checks and record actual results in SDD. Never claim unexecuted checks passed.
- Do not invent missing YAML or grid dimensions. Keep unresolved external requirements visible.
