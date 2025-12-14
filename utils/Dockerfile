# Use official Node.js runtime
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Expose port (Cloud Run will set PORT env var)
ENV PORT=8080
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]
