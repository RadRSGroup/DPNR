# MCP Integration Plan

This project uses an AI-first workflow. To support agents, wire up the following MCP servers in your agent runner (e.g., Claude Desktop Tools, Code Agents):

- Filesystem: read/write project files
- Git: commit, view history
- Terminal: run scripts and tests
- HTTP: call local demo services (e.g., materials stub)
- Postgres: connect to `db` service for migrations

## Demo MCP Service (Materials Stub)

- Container: `mcp-materials` (see `mcp/materials-stub`)
- Endpoints:
  - `GET /health` → `{ status: 'ok' }`
  - `GET /signed-url?id=<id>` → `{ id, url }` (demo only)

## Suggested Config Snippet

Describe your MCP configuration in your agent tool (pseudocode):

```json
{
  "servers": {
    "materials": {
      "type": "http",
      "baseUrl": "http://localhost:7070"
    },
    "db": {
      "type": "postgres",
      "connectionString": "postgresql://dpnr:dpnr@localhost:5432/dpnr"
    }
  }
}
```

Note: Built-in filesystem/git/terminal MCPs are preferred when available in your agent runtime.

