# FlowyPrompt MCP Platform Setup Guide

## Claude Desktop Configuration

1. Copy claude-desktop.json to ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)
2. Or copy to %APPDATA%/Claude/claude_desktop_config.json (Windows)
3. Restart Claude Desktop
4. The FlowyPrompt MCP server will be available in Claude Desktop

### STDIO Configuration
- **Config File**: claude-desktop.json
- **Transport**: STDIO
- **Description**: Direct MCP communication via standard input/output

### HTTP Configuration
- **Config File**: claude-desktop-http.json
- **Transport**: HTTP
- **Description**: MCP communication via HTTP endpoints

## Claude Code Configuration

1. Add the following to your Claude Code settings:
   - For STDIO: Use the stdio command from claude-desktop.json
   - For HTTP: Use the HTTP endpoints directly
2. Restart Claude Code
3. FlowyPrompt tools will be available in Claude Code

### STDIO Configuration
- **Config File**: undefined
- **Transport**: undefined
- **Command**: node index.js --transport=stdio
- **Description**: Start server with STDIO transport

### HTTP Configuration
- **Config File**: undefined
- **Transport**: undefined
- **Description**: undefined

## ChatGPT Integration

1. Use the HTTP API endpoints directly
2. POST requests to /tools/:toolName for tool execution
3. GET requests to /tools for available tools

### API Endpoints
- **tools**: http://localhost:3001/tools
- **execute**: http://localhost:3001/tools/:toolName
- **health**: http://localhost:3001/health
- **Base URL**: http://localhost:3001

## OpenCode Integration

1. Use the HTTP API endpoints
2. Configure OpenCode to use the HTTP endpoints
3. Tools available via REST API calls
- **Base URL**: http://localhost:3001

## Troubleshooting

### Common Issues
1. **Port already in use**: Change the port using `PORT=3002 node index.js --transport=http`
2. **CORS issues**: The HTTP server includes CORS headers for all origins
3. **Connection timeouts**: Ensure the server is running before configuring clients

### Testing the Server
- **Health Check**: GET http://localhost:3001/health
- **List Tools**: GET http://localhost:3001/tools
- **Test Tool**: POST http://localhost:3001/tools/health_check

### Environment Variables
- `MCP_TRANSPORT`: Set to "stdio" or "http" (default: "stdio")
- `PORT`: Set HTTP server port (default: 3001)
- `HTTP_PORT`: Alternative port setting (default: 3001)

