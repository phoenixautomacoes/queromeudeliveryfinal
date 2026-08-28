# Imagem Base Node.js 22 LTS
FROM node:22-alpine AS builder

WORKDIR /app

# Instalação de dependências
COPY package.json package-lock.json* ./
RUN npm install --production=false

# Cópia do código-fonte e compilação
COPY . .
RUN npm run build

# Estágio de Produção
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json ./
RUN npm install --production=true

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
