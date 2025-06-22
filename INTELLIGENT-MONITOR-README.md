# Intelligent FitTracker Monitor

## Overview

This intelligent monitor automatically manages your Expo development server, tracks real-time errors, and applies fixes using AI-powered analysis.

## Features

### ✅ **Automatic Expo Server Management**

- Starts Expo server on port 8081 (configurable)
- Handles port conflicts automatically
- Restarts server when needed
- Maintains consistent port usage

### ✅ **Real-Time Error Detection**

- Monitors live logs for errors
- Detects common React Native/Expo issues:
  - Module resolution errors
  - Metro bundler errors
  - Port conflicts
  - Dependency issues
  - Syntax errors

### ✅ **AI-Powered Error Resolution**

- Sends errors to Claude API for analysis
- Gets specific fix recommendations
- Applies automatic fixes when possible
- Logs AI responses for review

### ✅ **Smart Auto-Fixing**

- Automatic dependency installation
- Metro cache clearing
- Server restarts after fixes
- Prevention of consecutive errors

## Usage

### Basic Usage (No AI)

```powershell
.\intelligent-monitor.ps1 -NoAI
```

### With AI Integration

```powershell
# Set your Claude API key
$env:CLAUDE_API_KEY = "your-claude-api-key-here"

# Start with AI
.\intelligent-monitor.ps1
```

### Quick Start

```powershell
.\start-intelligent-monitor.ps1
```

### Custom Configuration

```powershell
.\intelligent-monitor.ps1 -ExpoPort 3000 -MetroPort 3001 -ClaudeApiKey "your-key"
```

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `-ClaudeApiKey` | Your Claude API key for AI features | `$env:CLAUDE_API_KEY` |
| `-ExpoPort` | Port for Expo development server | `8081` |
| `-MetroPort` | Port for Metro bundler | `8080` |
| `-LogLevel` | Logging level (Info, Warning, Error) | `Info` |
| `-NoAI` | Disable AI features | `false` |

## What the Monitor Does

1. **Starts Expo Server**: Launches `npx expo start --port 8081 --clear`
2. **Monitors Logs**: Continuously checks for errors in real-time
3. **Detects Issues**: Identifies common React Native/Expo problems
4. **AI Analysis**: Sends errors to Claude for expert analysis
5. **Auto-Fix**: Applies automatic fixes (npm install, cache clear, etc.)
6. **Server Management**: Restarts server when needed
7. **Port Management**: Kills conflicting processes and maintains port consistency

## Log Files

- `intelligent-monitor.log` - Main monitor activity log
- `expo-errors.log` - Detected errors log
- `ai-responses.log` - AI analysis responses

## Error Types Detected

- **MODULE_RESOLUTION**: Module not found errors
- **METRO_BUNDLE_ERROR**: Metro bundler issues
- **EXPO_SERVER_ERROR**: Development server problems
- **PORT_CONFLICT**: Port already in use
- **DEPENDENCY_ERROR**: Missing packages
- **SYNTAX_ERROR**: JavaScript/TypeScript syntax issues

## Status Monitoring

The monitor provides real-time status updates including:

- Uptime
- Number of Node processes
- Applied fixes count
- Server restart count
- Current server status

## Stopping the Monitor

Press `Ctrl+C` to gracefully stop the monitor. It will:

- Stop the Expo server process
- Save all logs
- Clean up resources

## Troubleshooting

If the monitor fails to start:

1. Ensure you're in the project directory
2. Check that ports 8081/8080 aren't blocked
3. Verify npm/npx are working
4. Check PowerShell execution policy

For AI features:

1. Verify your Claude API key is valid
2. Check internet connectivity
3. Ensure API quota is available
