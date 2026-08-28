import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer, mutationActions, readActions } from "../server.mjs";

test("the adapter exposes the complete named-access action sets", () => {
  assert.equal(readActions.length, 10);
  assert.equal(mutationActions.length, 22);
  assert.equal(new Set(readActions).size, readActions.length);
  assert.equal(new Set(mutationActions).size, mutationActions.length);
});

test("the adapter refuses to start without named access", () => {
  assert.throws(
    () => createMcpServer({ credential: "", fetchImpl: async () => null }),
    /PLANIT_AGENT_CREDENTIAL is required/,
  );
});

test("a Codex-compatible client can list and call all four tools", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({ actions: ["search_items"] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const server = createMcpServer({
    backendUrl: "https://planitforme.example/",
    credential: "named-access",
    fetchImpl,
  });
  const client = new Client({ name: "contract-test", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const listed = await client.listTools();
    assert.deepEqual(
      listed.tools.map((tool) => tool.name),
      ["planner_access", "planner_read", "planner_preview", "planner_apply"],
    );

    const result = await client.callTool({ name: "planner_access", arguments: {} });
    assert.equal(result.content[0].type, "text");
    assert.deepEqual(JSON.parse(result.content[0].text), { actions: ["search_items"] });
    assert.equal(requests[0].url, "https://planitforme.example/agent/v1/tools");
    assert.equal(requests[0].options.headers["X-Planit-Agent-Credential"], "named-access");
  } finally {
    await client.close();
  }
});
