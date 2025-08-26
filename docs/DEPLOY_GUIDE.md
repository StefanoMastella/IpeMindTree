# Guia de Deploy - Ipê Mind Tree

## Fase 1: Configuração de Infraestrutura

### 1. Configurar PostgreSQL no Railway

1. **Criar conta no Railway**:
   - Acesse https://railway.app
   - Faça login com GitHub

2. **Criar novo projeto**:
   - Clique em "New Project"
   - Selecione "Provision PostgreSQL"
   - Anote a DATABASE_URL gerada

3. **Executar script de criação das tabelas**:
   ```bash
   # Conectar ao banco e executar create_tables.sql
   psql "sua_database_url_aqui" -f create_tables.sql
   ```

### 2. Configurar Chaves de API

1. **Google Gemini API**:
   - Acesse https://makersuite.google.com/app/apikey
   - Crie uma nova chave API
   - Copie a chave gerada

2. **OpenAI API** (opcional):
   - Acesse https://platform.openai.com/api-keys
   - Crie uma nova chave API
   - Copie a chave gerada

### 3. Deploy no Railway

1. **Conectar repositório**:
   - No Railway, clique em "New Project"
   - Selecione "Deploy from GitHub repo"
   - Conecte este repositório

2. **Configurar variáveis de ambiente**:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   GEMINI_API_KEY=sua_chave_gemini_real
   OPENAI_API_KEY=sua_chave_openai_real
   VITE_GEMINI_API_KEY=${GEMINI_API_KEY}
   NODE_ENV=production
   PORT=3000
   ENABLE_TELEGRAM_BOT=true
   ```

3. **Configurar domínio**:
   - No painel do Railway, vá em "Settings"
   - Em "Domains", adicione um domínio personalizado
   - Ou use o domínio gerado automaticamente

### 4. Verificar Deploy

1. **Logs de build**:
   - Verifique se o build foi executado com sucesso
   - Procure por erros nos logs

2. **Testar aplicação**:
   - Acesse a URL fornecida pelo Railway
   - Verifique se a interface carrega corretamente
   - Teste funcionalidades básicas

## Comandos Úteis

```bash
# Verificar se ambiente está pronto
npm run check:env

# Configurar banco de dados
npm run setup:db

# Preparar para deploy (verifica ambiente + build)
npm run deploy:prepare

# Build local
npm run build

# Testar produção localmente
npm run start

# Verificar tipos
npm run check

# Sincronizar banco
npm run db:push
```

## Troubleshooting

### Erro de conexão com banco:
- Verifique se a DATABASE_URL está correta
- Confirme se as tabelas foram criadas
- Teste conexão com `npm run db:push`

### Erro de API:
- Verifique se as chaves de API estão corretas
- Confirme se as variáveis de ambiente estão configuradas
- Teste localmente primeiro

### Erro de build:
- Execute `npm run build` localmente
- Verifique se todas as dependências estão instaladas
- Confirme se o Node.js está na versão correta (v18+)

## Próximos Passos

1. ✅ Deploy básico funcionando
2. 🔄 Configurar domínio personalizado
3. 🔄 Implementar SSL (automático no Railway)
4. 🔄 Configurar monitoramento
5. 🔄 Otimizar performance

## Status Atual

- ✅ Build de produção testado e funcionando
- ✅ Arquivos de configuração criados
- 🔄 Aguardando configuração do banco PostgreSQL
- 🔄 Aguardando chaves de API reais
- 🔄 Aguardando deploy no Railway