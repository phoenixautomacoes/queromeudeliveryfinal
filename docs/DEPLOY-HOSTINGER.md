# Guia de Implantação na Hostinger (Node Web App)

## 1. Requisitos na Hostinger
- Plano de Hospedagem VPS ou Cloud / Web com suporte a Node.js 20+ ou 22+.
- Versão do Node.js configurada: **22.x**.
- Gerenciador de Processos: **Node Web App Manager** ou **PM2**.

## 2. Passo a Passo de Instalação

1. **Subir Arquivos do Projeto:**
   Faça upload do repositório ou clone via Git no diretório `/home/u123456789/public_html/qmd-app`.

2. **Configuração de Variáveis de Ambiente:**
   Copie `.env.example` para `.env` e preencha as variáveis de produção:
   ```bash
   cp .env.example .env
   nano .env
   ```

3. **Instalação das Dependências:**
   ```bash
   npm install --production=false
   ```

4. **Compilação do Pacote:**
   ```bash
   npm run build
   ```
   *Isso compilará o React com Vite em `dist/` e o servidor Node/Express em `dist/server.cjs` com esbuild.*

5. **Execução das Migrations e Seed (Opcional):**
   ```bash
   npm run catalog:import -- --store=burger-craft --file=data/catalogs/burger-craft.json
   ```

6. **Inicialização:**
   No painel da Hostinger, aponte a pasta de execução para a raiz e o arquivo de inicialização para:
   `dist/server.cjs`
   Ou via terminal:
   ```bash
   npm start
   ```

7. **Configuração do Domínio e SSL:**
   Ative o Certificado SSL Let's Encrypt gratuito no painel da Hostinger.
