# Use Node.js 22 slim for a small and efficient image
FROM node:22-slim

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install ONLY production dependencies to save memory
# This will ignore react, recharts, etc.
RUN npm install --omit=dev --no-audit

# Install tsx globally or just use the local one if it's in dependencies
# Since we moved tsx and typescript to dependencies, they will be installed.

# Copy the rest of the application code
COPY . .

# Expose the health check port
EXPOSE 8080

# Environment variables (can also be set in Koyeb UI)
ENV NODE_ENV=production
ENV PORT=8080

# Run the bot
CMD ["npm", "run", "bot"]
