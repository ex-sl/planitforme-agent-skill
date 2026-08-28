import { pathToFileURL } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export const readActions = Object.freeze([
  "search_items",
  "get_item",
  "list_occurrences",
  "list_tags",
  "get_placement",
  "get_placement_context",
  "get_preferences",
  "get_current_plan",
  "get_item_audit",
  "get_audit_history",
]);

export const mutationActions = Object.freeze([
  "create_task",
  "update_task",
  "task_action",
  "create_event",
  "update_event",
  "event_action",
  "create_routine",
  "update_routine",
  "routine_action",
  "materialize_occurrence",
  "update_occurrence",
  "reset_occurrence",
  "occurrence_outcome",
  "create_tag",
  "rename_tag",
  "tag_action",
  "set_item_tags",
  "placement_action",
  "planning_preferences",
  "convert_item",
  "plan_proposal",
  "audit_undo",
]);

function normalizedBackendUrl(value) {
  return String(value || "https://planitforme.ru").trim().replace(/\/+$/, "");
}

function jsonText(value) {
  return { content: [{ type: "text", text: JSON.stringify(value) }] };
}

export function createMcpServer({ backendUrl, credential, fetchImpl = globalThis.fetch } = {}) {
  const baseUrl = normalizedBackendUrl(backendUrl);
  const accessValue = String(credential || "").trim();
  if (!accessValue) throw new Error("PLANIT_AGENT_CREDENTIAL is required");
  if (typeof fetchImpl !== "function") throw new Error("This adapter requires Node.js 18 or newer");

  async function request(path, options = {}) {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Planit-Agent-Credential": accessValue,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const bodyText = await response.text();
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (_error) {
      body = bodyText;
    }
    if (!response.ok) {
      const detail = typeof body === "string" ? body : JSON.stringify(body);
      throw new Error(`PlanItForMe request failed (${response.status}): ${detail}`);
    }
    return body;
  }

  const tools = {
    planner_access: {
      description: "Read the current PlanItForMe agent capabilities",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      run: async () => request("/agent/v1/tools"),
    },
    planner_read: {
      description: "Read one approved PlanItForMe view",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", enum: readActions },
          arguments: { type: "object" },
        },
        required: ["action"],
        additionalProperties: false,
      },
      run: async (args) => request("/agent/v1/read", {
        method: "POST",
        body: { action: args.action, arguments: args.arguments || {} },
      }),
    },
    planner_preview: {
      description: "Preview one PlanItForMe change without applying it",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", enum: mutationActions },
          arguments: { type: "object" },
        },
        required: ["action", "arguments"],
        additionalProperties: false,
      },
      run: async (args) => request("/agent/v1/mutations/preview", {
        method: "POST",
        body: { action: args.action, arguments: args.arguments },
      }),
    },
    planner_apply: {
      description: "Apply one separately confirmed PlanItForMe preview",
      inputSchema: {
        type: "object",
        properties: {
          command_id: { type: "string", minLength: 8, maxLength: 128 },
          preview_token: { type: "string", minLength: 16, maxLength: 1048576 },
          confirmation: { type: "string", enum: ["apply"] },
        },
        required: ["command_id", "preview_token", "confirmation"],
        additionalProperties: false,
      },
      run: async (args) => request("/agent/v1/mutations/apply", {
        method: "POST",
        body: args,
      }),
    },
  };

  const server = new Server(
    { name: "planitforme-agent", version: "0.1.0" },
    { capabilities: { tools: { list: true } } },
  );

  server.fallbackRequestHandler = async (message) => {
    if (message.method === "tools/list") {
      return {
        tools: Object.entries(tools).map(([name, tool]) => ({
          name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    }
    if (message.method === "tools/call") {
      const tool = tools[message.params.name];
      if (!tool) throw new Error(`Unknown tool: ${message.params.name}`);
      return jsonText(await tool.run(message.params.arguments || {}));
    }
    throw new Error("Method not found");
  };

  return server;
}

export async function main(environment = process.env) {
  const server = createMcpServer({
    backendUrl: environment.BACKEND_URL,
    credential: environment.PLANIT_AGENT_CREDENTIAL,
  });
  await server.connect(new StdioServerTransport());
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(error.message || String(error));
    process.exitCode = 1;
  });
}
