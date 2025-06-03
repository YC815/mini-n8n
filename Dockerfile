# 建立階段（build stage）
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 執行 build
RUN npm run build

# 正式執行階段（production stage）
FROM node:20-alpine AS runner

WORKDIR /app

# 只複製執行所需檔案
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# 環境變數
ENV NODE_ENV=production

EXPOSE 3000

# 啟動 Next.js
CMD ["npm", "start"]
