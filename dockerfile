# c:\Users\WE150072\OneDrive - YanmarGlobal\Documents\Project\archiveOS\Dockerfile

FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install -g concurrently

# Copy source code
COPY . .

# Expose port backend
EXPOSE 5000

# Jalankan Backend dan Worker secara bersamaan
CMD ["concurrently", "\"node server/index.js\"", "\"node server/worker.js\""]
