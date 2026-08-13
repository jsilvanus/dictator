# AI Provider Configuration Guide

This guide helps you configure different AI providers for the Dictator application.

## Quick Start

### Option 1: Claude (Default - Recommended for simplicity)

1. Get API key from https://console.anthropic.com/
2. Set in `.env.local`:
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Option 2: OpenAI

1. Get API key from https://platform.openai.com/api-keys
2. Set in `.env.local`:
```bash
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4o  # or gpt-3.5-turbo
```

### Option 3: Ollama (Self-hosted, Free)

1. Install Ollama from https://ollama.ai
2. Run in terminal:
   ```bash
   ollama serve
   ```
3. In another terminal, pull a model:
   ```bash
   ollama pull mistral
   ```
4. Set in `.env.local`:
```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral  # or llama2, neural-chat, etc.
```

### Option 4: Generic OpenAI-Compatible

For any service that follows OpenAI's API format (Azure OpenAI, local LLM servers, etc.):

```bash
OPENAI_COMPATIBLE_BASE_URL=https://your-api-endpoint
OPENAI_COMPATIBLE_API_KEY=your-api-key
OPENAI_COMPATIBLE_MODEL=your-model-name
```

## Full Configuration Examples

### Development Environment (Local Ollama)

```bash
# .env.local
DATABASE_URL=******localhost:5432/dictator
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=password123
```

### Production Environment (Claude)

```bash
# .env.production.local
DATABASE_URL=******prod-db:5432/dictator
NEXTAUTH_SECRET=your-secure-nextauth-secret
NEXTAUTH_URL=https://dictator.example.com
ANTHROPIC_API_KEY=sk-ant-your-production-key
CLAUDE_MODEL=claude-sonnet-4-6
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password
```

### Production Environment (OpenAI)

```bash
# .env.production.local
DATABASE_URL=******prod-db:5432/dictator
NEXTAUTH_SECRET=your-secure-nextauth-secret
NEXTAUTH_URL=https://dictator.example.com
OPENAI_API_KEY=sk-proj-your-production-key
OPENAI_MODEL=gpt-4o
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password
```

### Hybrid Setup (Multiple Providers)

```bash
# .env.local
DATABASE_URL=******localhost:5432/dictator
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Primary: Claude
ANTHROPIC_API_KEY=sk-ant-your-key

# Secondary: OpenAI
OPENAI_API_KEY=sk-proj-your-key
OPENAI_MODEL=gpt-4o

# Tertiary: Local Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
```

Users can then switch between providers via the preferences API.

## Environment Variable Reference

### Claude (Anthropic)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes* | - | Your Anthropic API key from https://console.anthropic.com/ |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-6` | Model to use (e.g., claude-opus-4-1, claude-sonnet-4-6) |

*Only required if using Claude as primary provider

### OpenAI

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes* | - | Your OpenAI API key from https://platform.openai.com/api-keys |
| `OPENAI_MODEL` | No | `gpt-4o` | Model to use (e.g., gpt-4, gpt-3.5-turbo) |
| `OPENAI_BASE_URL` | No | `https://api.openai.com/v1` | Custom base URL (for proxies or Azure OpenAI) |

*Only required if using OpenAI as primary provider

### Ollama (Self-hosted)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | URL where Ollama is running |
| `OLLAMA_MODEL` | No | `mistral` | Model to use (e.g., llama2, neural-chat, orca-mini) |

### Generic OpenAI-Compatible

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_COMPATIBLE_BASE_URL` | Yes* | - | Base URL of the OpenAI-compatible service |
| `OPENAI_COMPATIBLE_API_KEY` | Yes* | - | API key for the service |
| `OPENAI_COMPATIBLE_MODEL` | No | `gpt-3.5-turbo` | Model name to use |

*Only required if using Generic OpenAI-compatible as primary provider

## Installation Instructions by Provider

### Claude Setup

1. Visit https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API keys section
4. Create a new API key
5. Copy the key and add to `.env.local`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ```

### OpenAI Setup

1. Visit https://platform.openai.com/
2. Sign up or log in
3. Go to API keys section
4. Create a new API key
5. Ensure you have billing set up (free trial period may be expired)
6. Add to `.env.local`:
   ```bash
   OPENAI_API_KEY=sk-proj-...
   ```

### Ollama Setup (Linux/Mac/Windows)

1. Download Ollama from https://ollama.ai
2. Install and run
3. In terminal, pull a model:
   ```bash
   # Popular models
   ollama pull mistral        # Small, fast (4GB)
   ollama pull neural-chat    # Good balance (4GB)
   ollama pull llama2         # Larger, more capable (7GB)
   ollama pull dolphin-mixtral # Advanced (26GB)
   
   # Or list available models
   ollama list
   ```
4. Serve should start automatically, or manually:
   ```bash
   ollama serve
   ```
5. Server runs at `http://localhost:11434` (can be customized)

### Azure OpenAI Setup

Azure OpenAI provides OpenAI models through Azure infrastructure:

1. Create an Azure account and Azure OpenAI resource
2. Deploy a model through Azure
3. Get your deployment name and endpoint
4. Set in `.env.local`:
   ```bash
   OPENAI_API_KEY=your-azure-api-key
   OPENAI_MODEL=your-deployment-name
   OPENAI_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment/
   ```

### Local LLM Server (LM Studio, Text Generation WebUI, etc.)

If running a local LLM server with OpenAI-compatible API:

1. Start your LLM server (usually runs on port 8000 or 5000)
2. Set in `.env.local`:
   ```bash
   OPENAI_COMPATIBLE_BASE_URL=http://localhost:8000/v1
   OPENAI_COMPATIBLE_API_KEY=not-needed  # Usually can be any string
   OPENAI_COMPATIBLE_MODEL=your-model-name
   ```

## Running the Application

### With Node.js/npm

```bash
# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

### With Docker

```bash
# Build image
docker build -t dictator .

# Run with environment variables
docker run -e ANTHROPIC_API_KEY=sk-ant-... \
           -e DATABASE_URL=postgres://... \
           -p 3000:3000 \
           dictator
```

## Verifying Provider Configuration

### Check which provider is active

```bash
# Via API
curl http://localhost:3000/api/ai/models

# Should return list of available providers
{
  "providers": [
    {"type": "claude", "name": "Claude (Anthropic)", "configured": true},
    {"type": "ollama", "name": "Ollama (Self-hosted)", "configured": false}
  ]
}
```

### Test inline AI request

```bash
curl -X POST http://localhost:3000/api/ai/inline \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-auth-cookie>" \
  -d '{
    "prompt": "Say hello",
    "snapshot": {},
    "session": {}
  }'
```

## Troubleshooting

### Provider not loading

1. Check environment variables are set correctly (case-sensitive)
2. Verify API keys are valid
3. Check server logs: `npm run dev` should show which provider is active
4. For Ollama, verify `ollama serve` is running in another terminal

### "Connection refused" error

- **Ollama**: Make sure `ollama serve` is running
- **OpenAI/Claude**: Check internet connection and API key validity
- **Custom endpoint**: Verify the URL is correct and service is running

### Slow responses

- **Ollama**: Performance depends on model size and hardware. Smaller models (mistral, neural-chat) are faster
- **OpenAI/Claude**: Check API usage quota and rate limits
- Consider using a smaller model or increasing timeout

### Cost concerns

- **Claude/OpenAI**: Check usage in provider dashboard (console.anthropic.com, platform.openai.com)
- **Ollama**: Free (runs locally), only costs your hardware/electricity

## Switching Providers at Runtime

Users can switch providers without restarting the application via the preferences API:

```bash
# Get current preferences
curl http://localhost:3000/api/ai/preferences \
  -H "Cookie: <your-auth-cookie>"

# Update to OpenAI
curl -X POST http://localhost:3000/api/ai/preferences \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-auth-cookie>" \
  -d '{
    "preferredProvider": "openai",
    "preferredModel": "gpt-4o"
  }'

# Verify change
curl http://localhost:3000/api/ai/preferences \
  -H "Cookie: <your-auth-cookie>"
```

## Support

For issues or questions:
1. Check logs: `npm run dev` with verbose output
2. Verify environment variables
3. Check provider documentation:
   - Anthropic: https://docs.anthropic.com/
   - OpenAI: https://platform.openai.com/docs/
   - Ollama: https://github.com/ollama/ollama
4. See AI_MULTI_MODEL_IMPLEMENTATION.md for technical details
