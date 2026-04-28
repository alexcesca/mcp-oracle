import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import * as dotenv from "dotenv";
import http from "http";

import { closePool } from "./db/pool.js";
import { toolDefinitions, dispatchTool } from "./tools/index.js";

dotenv.config();

const ORACLE_USER = process.env.ORACLE_USER;
const ORACLE_PASSWORD = process.env.ORACLE_PASSWORD;
const ORACLE_CONNECT_STRING = process.env.ORACLE_CONNECT_STRING;

const HTTP_PORT = parseInt(process.env.MCP_HTTP_PORT ?? "3000", 10);
const TRANSPORT_MODE = process.env.MCP_TRANSPORT ?? "stdio"; // "stdio" or "http"

if (!ORACLE_USER || !ORACLE_PASSWORD || !ORACLE_CONNECT_STRING) {
  console.error(
    "Missing required environment variables: ORACLE_USER, ORACLE_PASSWORD, ORACLE_CONNECT_STRING"
  );
  process.exit(1);
}

function createMcpServer(): Server {
  const server = new Server(
    { name: "mcp-oracle", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // List all available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions,
  }));

  // Dispatch tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await dispatchTool(name, (args ?? {}) as Record<string, any>);

      if (result === null) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }

      return result;
    } catch (error: any) {
      if (error instanceof McpError) throw error;

      return {
        content: [{ type: "text", text: `Oracle Error: ${error.message}` }],
        isError: true,
      };
    }
  });

  server.onerror = (error) => console.error("[MCP Error]", error);

  return server;
}

async function runStdio() {
  // Redirect console.log to stderr to avoid corrupting the MCP stdio stream
  console.log = console.error;

  const server = createMcpServer();

  process.on("SIGINT", async () => {
    await closePool();
    await server.close();
    process.exit(0);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[MCP] Server running in STDIO mode");
}

async function runHttp() {
  const httpServer = http.createServer(async (req, res) => {
    // Handle CORS preflight
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, mcp-session-id");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === "/mcp" || req.url?.startsWith("/mcp?")) {
      // If browser opens /mcp via GET without SSE Accept header → show friendly info page
      const isBrowserGet =
        req.method === "GET" && !req.headers.accept?.includes("text/event-stream");

      if (isBrowserGet) {
        const info = {
          name: "mcp-oracle",
          version: "1.0.0",
          transport: "Streamable HTTP (MCP)",
          status: "running",
          endpoint: `http://localhost:${HTTP_PORT}/mcp`,
          instructions: {
            inspector: "npx @modelcontextprotocol/inspector",
            inspector_url: `http://localhost:${HTTP_PORT}/mcp`,
            inspector_transport: "Streamable HTTP",
            curl_example: `curl -X POST http://localhost:${HTTP_PORT}/mcp -H "Content-Type: application/json" -H "Accept: text/event-stream,application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`,
          },
          tools: toolDefinitions.map((t) => ({ name: t.name, description: t.description })),
        };
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(info, null, 2));
        return;
      }

      try {
        // Stateless mode: a new server+transport is created per request.
        // sessionIdGenerator: undefined disables session tracking.
        const server = createMcpServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });

        await server.connect(transport);

        await transport.handleRequest(req, res);

        // Clean up after response is sent
        res.on("finish", async () => {
          await server.close();
        });
      } catch (err: any) {
        console.error("[HTTP] Error handling request:", err.message);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
      }
      return;
    }

    // Health-check endpoint
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", transport: "streamable-http", port: HTTP_PORT }));
      return;
    }

    // Root info page
    if (req.url === "/" || req.url === "") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          name: "mcp-oracle",
          version: "1.0.0",
          transport: "Streamable HTTP",
          endpoint: `http://localhost:${HTTP_PORT}/mcp`,
          health: `http://localhost:${HTTP_PORT}/health`,
          tools: toolDefinitions.map((t) => t.name),
        })
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  process.on("SIGINT", async () => {
    console.error("[MCP] Shutting down HTTP server...");
    await closePool();
    httpServer.close();
    process.exit(0);
  });

  httpServer.listen(HTTP_PORT, () => {
    console.error(`[MCP] ✅ Server running in Streamable HTTP mode`);
    console.error(`[MCP] 🔗 MCP Endpoint : http://localhost:${HTTP_PORT}/mcp`);
    console.error(`[MCP] 💚 Health Check : http://localhost:${HTTP_PORT}/health`);
    console.error(`[MCP] 📋 Tool List   : http://localhost:${HTTP_PORT}/`);
  });
}

// Entry point — choose transport based on env var
if (TRANSPORT_MODE === "http") {
  runHttp().catch(console.error);
} else {
  runStdio().catch(console.error);
}
