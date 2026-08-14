# Ollama Setup Guide

This guide provides detailed instructions for setting up and using Ollama with the Dictator application.

## What is Ollama?

Ollama is a tool that makes it easy to run large language models (LLMs) locally on your machine. It's:
- **Free**: No API costs
- **Private**: All processing happens on your machine
- **Easy**: Simple CLI and no complex setup
- **Fast**: Can run on CPU or GPU
- **Flexible**: Supports many models

## System Requirements

### Minimum (CPU only)
- **RAM**: 8GB (for smaller models like mistral)
- **Disk**: 5-10GB free space
- **CPU**: Any modern processor

### Recommended (For better performance)
- **RAM**: 16GB+
- **GPU**: NVIDIA (CUDA) or Apple Metal (M1/M2 chips benefit greatly)
- **Disk**: 20GB+ free space (for multiple models)

### Supported Platforms
- **macOS**: M1/M2/M3 (with GPU acceleration), Intel Macs (CPU only)
- **Linux**: Any distribution
- **Windows**: Windows Subsystem for Linux (WSL) or native
- **Docker**: Pre-built Docker images available

## Installation

### macOS

1. Download from https://ollama.ai/download/mac
2. Double-click the downloaded file
3. Follow installer prompts
4. Ollama will be added to your Applications folder

Verify installation:
```bash
ollama --version
```

### Linux (Ubuntu/Debian)

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

Or install from package manager:
```bash
# Ubuntu/Debian
sudo apt-get install ollama

# Fedora
sudo dnf install ollama

# Arch
yay -S ollama
```

### Windows

1. Download from https://ollama.ai/download/windows
2. Run the installer
3. Ollama will be added to System Tray

Note: Windows version runs in WSL (Windows Subsystem for Linux)

### Docker

```bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 ollama/ollama:latest
```

## Starting Ollama

### macOS
```bash
# If installed via .app
ollama serve

# Or via Homebrew
brew services start ollama
```

### Linux
```bash
# Systemd service (if installed via package manager)
sudo systemctl start ollama

# Or run directly
ollama serve
```

### Windows
- Click Ollama icon in system tray
- It should be running automatically

### Docker
```bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 ollama/ollama:latest
```

## Downloading Models

Once Ollama is running, download a model:

```bash
ollama pull <model-name>
```

### Popular Models (Ranked by Speed vs Quality)

| Model | Size | Speed | Quality | Notes |
|-------|------|-------|---------|-------|
| **Mistral** | 4GB | ⚡⚡⚡⚡⚡ | ⭐⭐⭐⭐ | **Recommended**: Best speed/quality balance |
| **Neural-Chat** | 4GB | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ | Good for conversations, optimized |
| **Orca-Mini** | 2GB | ⚡⚡⚡⚡⚡ | ⭐⭐⭐ | Very fast, decent quality, smallest |
| **Dolphin-Mixtral** | 26GB | ⚡⚡ | ⭐⭐⭐⭐⭐ | Best quality, requires lots of RAM/GPU |
| **Llama2** | 7GB | ⚡⚡⚡ | ⭐⭐⭐⭐ | Meta's model, good general purpose |
| **Wizardlm2** | 13GB | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | Excellent for complex tasks |
| **Phind-Codellama** | 16GB | ⚡⚡ | ⭐⭐⭐⭐⭐ | Excellent for code generation |
| **Zephyr** | 4GB | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ | Good instruction following |

### Download Examples

```bash
# Recommended starting point (best balance)
ollama pull mistral

# For coding tasks
ollama pull phind-codellama

# For general purpose
ollama pull neural-chat
ollama pull llama2

# For best quality (if you have lots of RAM/GPU)
ollama pull dolphin-mixtral

# View all available models
ollama list
```

## Configuring Dictator to Use Ollama

### Option 1: Default Local Setup

If Ollama is running on localhost with mistral model:

```bash
# .env.local
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
```

That's it! Dictator will use Ollama.

### Option 2: Custom Model

```bash
# .env.local
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=neural-chat
```

### Option 3: Remote Ollama Server

If Ollama is running on another machine:

```bash
# .env.local
OLLAMA_BASE_URL=http://192.168.1.100:11434
OLLAMA_MODEL=mistral
```

### Option 4: Docker Ollama

If running Ollama in Docker:

```bash
# .env.local
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=mistral
```

On Linux with Docker, you might need:
```bash
OLLAMA_BASE_URL=http://172.17.0.1:11434
```

## Verifying the Setup

### Check Ollama is Running

```bash
# Via curl
curl http://localhost:11434/api/tags

# Should show JSON with list of models
# Example response:
# {"models":[{"name":"mistral:latest","size":4109050757}]}
```

### Check Model is Available

```bash
ollama list

# Should show something like:
# NAME                    ID              SIZE    MODIFIED
# mistral:latest          2dfb3c8cd319    4.1 GB  2 minutes ago
```

### Test with Dictator

Start Dictator and try:
```bash
# Get available models
curl http://localhost:3000/api/ai/models

# Try an inline request
curl -X POST http://localhost:3000/api/ai/inline \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello", "snapshot": {}, "session": {}}'
```

## Performance Tuning

### GPU Acceleration

**NVIDIA GPU (CUDA)**:
```bash
# Install NVIDIA Container Toolkit if using Docker
# Ollama will automatically detect and use GPU
```

**Apple Metal (M1/M2/M3)**:
- Automatically enabled on Apple Silicon
- Provides significant speedup

### Memory Usage

Ollama loads models into memory. For limited RAM:

```bash
# Use smaller models
ollama pull orca-mini    # 2GB, fastest
ollama pull neural-chat  # 4GB, good balance

# Or remove unused models
ollama rm mistral:latest
```

### Temperature (Response Creativity)

In Dictator preferences, set temperature:
- **0.0-0.3**: Focused, deterministic (good for technical tasks)
- **0.5-0.7**: Balanced (default)
- **1.0-2.0**: Creative, varied (good for brainstorming)

## Troubleshooting

### Ollama Not Starting

```bash
# macOS: Check if running
ps aux | grep ollama

# Linux: Check systemd
sudo systemctl status ollama
sudo journalctl -u ollama -n 50

# Restart
sudo systemctl restart ollama
```

### Model Download Stalled

```bash
# Cancel current download
Ctrl+C

# Remove partially downloaded model
ollama rm mistral:latest

# Try again
ollama pull mistral
```

### Connection Refused

1. Verify Ollama is running: `curl http://localhost:11434/api/tags`
2. Check firewall isn't blocking port 11434
3. Verify OLLAMA_BASE_URL is correct in `.env.local`
4. If remote: Check network connectivity to server

### Slow Responses

1. Model is running on CPU - GPU will help
2. Model is very large - try smaller model
3. System is low on RAM - close other applications
4. Wrong model specified - check with `ollama list`

### Out of Memory

```bash
# Free memory by stopping model
ollama stop

# Or restart Ollama
killall ollama
ollama serve

# If recurring, use smaller model
ollama pull orca-mini
```

## Common Tasks

### Switch Models

```bash
# Pull new model
ollama pull llama2

# Update Dictator config
# .env.local
OLLAMA_MODEL=llama2

# Restart Dictator
```

### Remove Unused Model

```bash
ollama rm mistral:latest
```

### View Running Processes

```bash
ollama ps
```

### Update Ollama

```bash
# macOS
brew upgrade ollama

# Linux
sudo apt-get upgrade ollama

# Or download latest from ollama.ai
```

## Model Selection Guide

### For Code Generation
- **Phind-Codellama**: Specialized for coding tasks
- **Wizardlm2**: Excellent reasoning, good for complex logic
- **Mistral**: Good general-purpose option

### For Writing
- **Neural-Chat**: Optimized for conversations
- **Dolphin-Mixtral**: Highest quality (if resources allow)
- **Zephyr**: Good instruction following

### For Minimal Resources
- **Orca-Mini**: 2GB, fastest
- **Mistral**: 4GB, best balance
- **Neural-Chat**: 4GB, conversation optimized

### For Best Quality
- **Dolphin-Mixtral**: 26GB, best overall
- **Wizardlm2**: 13GB, excellent reasoning
- **Phind-Codellama**: 16GB, best for code

## Advanced Setup

### Running Ollama on GPU Server

```bash
# On GPU server
ollama serve --host 0.0.0.0:11434

# In Dictator .env.local
OLLAMA_BASE_URL=http://gpu-server-ip:11434
```

### Multiple Models for Different Tasks

You can run multiple models and switch in Dictator:

```bash
# Download multiple models
ollama pull mistral
ollama pull neural-chat
ollama pull phind-codellama

# Dictator can switch via API
curl -X POST http://localhost:3000/api/ai/preferences \
  -d '{"preferredProvider": "ollama", "preferredModel": "phind-codellama"}'
```

### Load Balancing with Docker Compose

```yaml
version: '3.8'
services:
  ollama-1:
    image: ollama/ollama
    volumes:
      - ollama1:/root/.ollama
    ports:
      - "11434:11434"
  
  ollama-2:
    image: ollama/ollama
    volumes:
      - ollama2:/root/.ollama
    ports:
      - "11435:11434"

volumes:
  ollama1:
  ollama2:
```

## References

- **Official Site**: https://ollama.ai
- **GitHub**: https://github.com/ollama/ollama
- **Models Available**: https://ollama.ai/library
- **Documentation**: https://github.com/ollama/ollama/blob/main/README.md
- **Performance Tips**: https://github.com/ollama/ollama/discussions

## Next Steps

1. Install Ollama from https://ollama.ai
2. Run `ollama pull mistral`
3. Verify: `curl http://localhost:11434/api/tags`
4. Configure Dictator: Set `OLLAMA_BASE_URL` and `OLLAMA_MODEL`
5. Restart Dictator: `npm run dev`
6. Start using Ollama-powered AI features!
