FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

COPY backend/package*.json ./backend/

RUN cd backend && npm ci --omit=dev --ignore-scripts

COPY backend/ ./backend/
COPY frontend/ ./frontend/

WORKDIR /app/backend

EXPOSE 5000

USER node

CMD ["node", "server.js"]
