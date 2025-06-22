# Use a macOS-like environment for iOS builds
FROM --platform=linux/amd64 node:18-bullseye

# Install necessary tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    unzip \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Expo CLI and EAS CLI
RUN npm install -g @expo/cli eas-cli

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY app.json ./
COPY eas.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the Expo port
EXPOSE 8081 19000 19001 19002

# Default command
CMD ["npx", "expo", "start", "--host", "0.0.0.0"]
