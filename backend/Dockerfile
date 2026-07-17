# Use official lightweight Node.js LTS image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install clean production dependencies
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build the TypeScript project
RUN npm run build

# Expose the default Google Cloud Run port (8080)
EXPOSE 8080

# Run the API server
CMD ["node", "dist/server.js"]
