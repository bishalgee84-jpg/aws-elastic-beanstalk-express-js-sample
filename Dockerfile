FROM node:16-bullseye-slim

WORKDIR /app

# Copy dependency metadata first to improve Docker layer caching.
COPY package*.json ./

# Install production dependencies only.
RUN npm ci --omit=dev

# Copy application source code.
COPY . .

# Run application using the non-root Node account.
USER node

EXPOSE 8080

CMD ["npm", "start"]
