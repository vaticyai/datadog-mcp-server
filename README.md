# Datadog MCP Server

> **DISCLAIMER**: This is a community-maintained project and is not officially affiliated with, endorsed by, or supported by Datadog, Inc. This MCP server utilizes the Datadog API but is developed independently as part of the [Model Context Protocol](https://github.com/modelcontextprotocol/servers) ecosystem.

![NPM Version](https://img.shields.io/npm/v/%40winor30%2Fmcp-server-datadog)![Build and Test](https://github.com/winor30/mcp-server-datadog/actions/workflows/ci.yml/badge.svg)[![codecov](https://codecov.io/gh/winor30/mcp-server-datadog/graph/badge.svg?token=BG4ZB74X92)](https://codecov.io/gh/winor30/mcp-server-datadog)[![smithery badge](https://smithery.ai/badge/@winor30/mcp-server-datadog)](https://smithery.ai/server/@winor30/mcp-server-datadog)

MCP server for the Datadog API, enabling incident management and more.

<a href="https://glama.ai/mcp/servers/bu8gtzkwfr">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/bu8gtzkwfr/badge" alt="mcp-server-datadog MCP server" />
</a>

## Features

- **Observability Tools**: Provides a mechanism to leverage key Datadog monitoring features, such as incidents, monitors, logs, dashboards, and metrics, through the MCP server.
- **Extensible Design**: Designed to easily integrate with additional Datadog APIs, allowing for seamless future feature expansion.
- **Safe Metrics Querying**: Enforces validation of metric tags in queries to prevent invalid or unsupported tag usage, improving reliability and correctness.

## Tools

1. `list_incidents`
   - Retrieve a list of incidents from Datadog.
   - **Inputs**:
     - `filter` (optional string): Filter parameters for incidents (e.g., status, priority).
     - `pagination` (optional object): Pagination details like page size/offset.
   - **Returns**: Array of Datadog incidents and associated metadata.

2. `get_incident`
   - Retrieve detailed information about a specific Datadog incident.
   - **Inputs**:
     - `incident_id` (string): Incident ID to fetch details for.
   - **Returns**: Detailed incident information (title, status, timestamps, etc.).

3. `get_monitors`
   - Fetch the status of Datadog monitors.
   - **Inputs**:
     - `groupStates` (optional array): States to filter (e.g., alert, warn, no data, ok).
     - `name` (optional string): Filter by name.
     - `tags` (optional array): Filter by tags.
   - **Returns**: Monitors data and a summary of their statuses.

4. `get_logs`
   - Search and retrieve logs from Datadog.
   - **Inputs**:
     - `query` (string): Datadog logs query string.
     - `from` (number): Start time in epoch seconds.
     - `to` (number): End time in epoch seconds.
     - `limit` (optional number): Maximum number of logs to return (defaults to 100).
   - **Returns**: Array of matching logs.

5. `list_dashboards`
   - Get a list of dashboards from Datadog.
   - **Inputs**:
     - `name` (optional string): Filter dashboards by name.
     - `tags` (optional array): Filter dashboards by tags.
   - **Returns**: Array of dashboards with URL references.

6. `get_dashboard`
   - Retrieve a specific dashboard from Datadog.
   - **Inputs**:
     - `dashboard_id` (string): ID of the dashboard to fetch.
   - **Returns**: Dashboard details including title, widgets, etc.

7. `query_metrics`
   - Retrieve metrics data from Datadog.
   - **Inputs**:
     - `query` (string): Metrics query string. Example: `avg:system.cpu.user{env:prod,host:web-01}`
     - `from` (number): Start time in epoch seconds.
     - `to` (number): End time in epoch seconds.
   - **Tag Validation**: If your query includes tags (e.g., `env:prod`), these tags are validated against the set of allowed tags for the metric. If any tag key is not allowed for the metric, the request will return an error listing the invalid tags and the set of allowed tag keys. This helps prevent mistakes and ensures only supported tags are used in queries.
   - **Tip**: Use the [`list_tags_by_metric_name`](#list_tags_by_metric_name) tool to discover which tags are allowed for a given metric before constructing your query.
   - **Returns**: Metrics data for the queried timeframe, or an error if invalid tags are used.

8. `list_tags_by_metric_name`
   - List all tags for a given metric name using the Datadog API.
   - **Inputs**:
     - `metric_name` (string): The name of the metric to retrieve tags for. Example: `system.cpu.user`
   - **Returns**: An array of tags (strings) that are allowed for the specified metric. Each tag is in the form `tag_key:tag_value` (e.g., `host:web-01`).
   - **Usage**: Use this tool to discover which tag keys are valid for a metric, so you can construct valid queries for the [`query_metrics`](#query_metrics) tool.

9. `list_traces`
   - Retrieve a list of APM traces from Datadog.
   - **Inputs**:
     - `query` (string): Datadog APM trace query string.
     - `from` (number): Start time in epoch seconds.
     - `to` (number): End time in epoch seconds.
     - `limit` (optional number): Maximum number of traces to return (defaults to 100).
     - `sort` (optional string): Sort order for traces (defaults to '-timestamp').
     - `service` (optional string): Filter by service name.
     - `operation` (optional string): Filter by operation name.
   - **Returns**: Array of matching traces from Datadog APM.

10. `list_hosts`
    - Get list of hosts from Datadog.
    - **Inputs**:
      - `filter` (optional string): Filter string for search results.
      - `sort_field` (optional string): Field to sort hosts by.
      - `sort_dir` (optional string): Sort direction (asc/desc).
      - `start` (optional number): Starting offset for pagination.
      - `count` (optional number): Max number of hosts to return (max: 1000).
      - `from` (optional number): Search hosts from this UNIX timestamp.
      - `include_muted_hosts_data` (optional boolean): Include muted hosts status and expiry.
      - `include_hosts_metadata` (optional boolean): Include host metadata (version, platform, etc).
    - **Returns**: Array of hosts with details including name, ID, aliases, apps, mute status, and more.

11. `get_active_hosts_count`
    - Get the total number of active hosts in Datadog.
    - **Inputs**:
      - `from` (optional number): Number of seconds from which you want to get total number of active hosts (defaults to 2h).
    - **Returns**: Count of total active and up hosts.

12. `mute_host`
    - Mute a host in Datadog.
    - **Inputs**:
      - `hostname` (string): The name of the host to mute.
      - `message` (optional string): Message to associate with the muting of this host.
      - `end` (optional number): POSIX timestamp for when the mute should end.
      - `override` (optional boolean): If true and the host is already muted, replaces existing end time.
    - **Returns**: Success status and confirmation message.

13. `unmute_host`
    - Unmute a host in Datadog.
    - **Inputs**:
      - `hostname` (string): The name of the host to unmute.
    - **Returns**: Success status and confirmation message.

14. `list_downtimes`
    - List scheduled downtimes from Datadog.
    - **Inputs**:
      - `currentOnly` (optional boolean): Return only currently active downtimes when true.
      - `monitorId` (optional number): Filter by monitor ID.
    - **Returns**: Array of scheduled downtimes with details including scope, monitor information, and schedule.

15. `schedule_downtime`
    - Schedule a downtime in Datadog.
    - **Inputs**:
      - `scope` (string): Scope to apply downtime to (e.g. 'host:my-host').
      - `start` (optional number): UNIX timestamp for the start of the downtime.
      - `end` (optional number): UNIX timestamp for the end of the downtime.
      - `message` (optional string): A message to include with the downtime.
      - `timezone` (optional string): The timezone for the downtime (e.g. 'UTC', 'America/New_York').
      - `monitorId` (optional number): The ID of the monitor to mute.
      - `monitorTags` (optional array): A list of monitor tags for filtering.
      - `recurrence` (optional object): Recurrence settings for the downtime.
        - `type` (string): Recurrence type ('days', 'weeks', 'months', 'years').
        - `period` (number): How often to repeat (must be >= 1).
        - `weekDays` (optional array): Days of the week for weekly recurrence.
        - `until` (optional number): UNIX timestamp for when the recurrence ends.
    - **Returns**: Scheduled downtime details including ID and active status.

16. `cancel_downtime`
    - Cancel a scheduled downtime in Datadog.
    - **Inputs**:
      - `downtimeId` (number): The ID of the downtime to cancel.
    - **Returns**: Confirmation of downtime cancellation.

17. `get_rum_applications`
    - Get all RUM applications in the organization.
    - **Inputs**: None.
    - **Returns**: List of RUM applications.

18. `get_rum_events`
    - Search and retrieve RUM events from Datadog.
    - **Inputs**:
      - `query` (string): Datadog RUM query string.
      - `from` (number): Start time in epoch seconds.
      - `to` (number): End time in epoch seconds.
      - `limit` (optional number): Maximum number of events to return (default: 100).
    - **Returns**: Array of RUM events.

19. `get_rum_grouped_event_count`
    - Search, group and count RUM events by a specified dimension.
    - **Inputs**:
      - `query` (optional string): Additional query filter for RUM search (default: "\*").
      - `from` (number): Start time in epoch seconds.
      - `to` (number): End time in epoch seconds.
      - `groupBy` (optional string): Dimension to group results by (default: "application.name").
    - **Returns**: Grouped event counts.

20. `get_rum_page_performance`
    - Get page (view) performance metrics from RUM data.
    - **Inputs**:
      - `query` (optional string): Additional query filter for RUM search (default: "\*").
      - `from` (number): Start time in epoch seconds.
      - `to` (number): End time in epoch seconds.
      - `metricNames` (array of strings): Array of metric names to retrieve (e.g., 'view.load_time', 'view.first_contentful_paint').
    - **Returns**: Performance metrics including average, min, max, and count for each metric.

21. `get_rum_page_waterfall`
    - Retrieve RUM page (view) waterfall data filtered by application name and session ID.
    - **Inputs**:
      - `applicationName` (string): Application name to filter events.
      - `sessionId` (string): Session ID to filter events.
    - **Returns**: Waterfall data for the specified application and session.

## Setup

### Datadog Credentials

You need valid Datadog API credentials to use this MCP server:

- `DATADOG_API_KEY`: Your Datadog API key
- `DATADOG_APP_KEY`: Your Datadog Application key
- `DATADOG_SITE` (optional): The Datadog site (e.g. `datadoghq.eu`)

Export them in your environment before running the server:

```bash
export DATADOG_API_KEY="your_api_key"
export DATADOG_APP_KEY="your_app_key"
export DATADOG_SITE="your_datadog_site"
```

## Installation

### Installing via Smithery

To install Datadog MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@winor30/mcp-server-datadog):

```bash
npx -y @smithery/cli install @winor30/mcp-server-datadog --client claude
```

### Manual Installation

```bash
pnpm install
pnpm build
pnpm watch   # for development with auto-rebuild
```

## Usage with Claude Desktop

To use this with Claude Desktop, add the following to your `claude_desktop_config.json`:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`  
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
      }
    }
  }
}
```

```json
{
  "mcpServers": {
    "datadog": {
      "command": "/path/to/mcp-server-datadog/build/index.js",
      "env": {
        "DATADOG_API_KEY": "<YOUR_API_KEY>",
        "DATADOG_APP_KEY": "<YOUR_APP_KEY>",
        "DATADOG_SITE": "<YOUR_SITE>" // Optional
      }
    }
  }
}
```

Or specify via `npx`:

```json
{
  "mcpServers": {
    "mcp-server-datadog": {
      "command": "npx",
      "args": ["-y", "@winor30/mcp-server-datadog"],
      "env": {
        "DATADOG_API_KEY": "<YOUR_API_KEY>",
        "DATADOG_APP_KEY": "<YOUR_APP_KEY>",
        "DATADOG_SITE": "<YOUR_SITE>" // Optional
      }
    }
  }
}
```

## Debugging

Because MCP servers communicate over standard input/output, debugging can sometimes be tricky. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector). You can run the inspector with:

```bash
npm run inspector
```

The inspector will provide a URL you can open in your browser to see logs and send requests manually.

## Contributing

Contributions are welcome! Feel free to open an issue or a pull request if you have any suggestions, bug reports, or improvements to propose.

## License

This project is licensed under the [Apache License, Version 2.0](./LICENSE).
