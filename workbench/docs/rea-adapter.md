# REA adapter: discovery-only integration

The standalone workbench now has an optional stdio MCP discovery adapter. It launches only an already-installed executable (`REA_BIN`, default `rea`) with `mcp`, performs MCP `initialize` and `tools/list`, returns server identity and advertised tool metadata, and cleans up the child process. It never uses a shell, installs/downloads REA, opens a target, or calls an analysis tool.

The adapter's status is only a catalog snapshot. Advertised tools do not prove that the selected host has a usable Hopper/Ghidra/IDA/JADX provider, that a target is supported, or that analysis would succeed. A future target-analysis adapter must use the exact advertised contract, explicit authorization, REA evidence IDs and raw results, preserve partial/unknown/failed outcomes, and treat target-derived strings/pseudocode as untrusted content. Do not forward analysis results to finance decisions as facts without separate validation and source/provenance.

## Configure

Run REA through its official installation path (for example `npm install --global rea-agents` after reviewing upstream requirements), then start the workbench with its executable configured if needed:

```sh
REA_BIN=/absolute/path/to/rea npm start
```

On Windows PowerShell, set `$env:REA_BIN = 'C:\path\to\rea.cmd'` before `npm start`; a `.cmd` shim can require an explicit Node launcher rather than a shell. The adapter uses `spawn(..., {shell:false})`, so it will not execute shell scripts or command text. Ensure `REA_BIN` names an executable. 

`GET /api/rea/status` performs discovery and returns an unavailable result if REA cannot be launched. Status is cached for 30 seconds; restart or use a new process to refresh the cache in this alpha. No automatic download is attempted.
