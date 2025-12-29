# Use Node.js 22 slim for a small and efficient image
FROM node:22-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies to save memory (includes tsx and express)
RUN npm install --omit=dev --no-audit

# Copy the rest of the application code
COPY . .

# Expose the health check port
EXPOSE 8080

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

# In Render/Koyeb, sometimes tsx can be heavy. 
# We'll use tsx for now as requested but with --no-cache to save disk/memory
CMD ["npx", "tsx", "--no-cache", "server-bot.ts"]
