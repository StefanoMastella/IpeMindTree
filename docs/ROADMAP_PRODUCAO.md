# Roadmap para Produção - Ipê Mind Tree (IMT)

## Status Atual ✅

**Data**: 27 de Agosto de 2025  
**Status**: Projeto funcionando localmente com banco de dados na nuvem  
**URL Local**: http://localhost:3000  
**Servidor**: Rodando na porta 3000 com Node.js v24.6.0
**Banco de Dados**: PostgreSQL na nuvem (Neon)

### O que já foi feito:
- ✅ Análise arquitetural completa (ver `ARQUITETURA_ANALISE.md`)
- ✅ Node.js instalado e configurado
- ✅ Dependências instaladas (750 pacotes)
- ✅ Servidor de desenvolvimento funcionando
- ✅ Interface React carregando corretamente
- ✅ Configuração básica do ambiente (.env)
- ✅ Dotenv configurado para carregar variáveis de ambiente
- ✅ Banco de dados PostgreSQL configurado na nuvem (Neon)
- ✅ Tabelas do banco de dados criadas com sucesso
- ✅ Servidor conectado ao banco de dados na nuvem

---

## Próximos Passos para Produção 🚀

### Fase 1: Configuração de Infraestrutura (Prioridade Alta)

#### 1.1 Banco de Dados PostgreSQL
- [x] **Configurar PostgreSQL em produção**
  - ✅ Escolhido Neon como provedor de PostgreSQL na nuvem
  - ✅ Substituída a DATABASE_URL no `.env` com a URL de conexão do Neon
  - ✅ Executado o script `create_tables.sql` no banco de produção
  - ✅ Testada conexão com sucesso (endpoint `/api/ideas` retornando 200)
  - [ ] Importar dados existentes para o banco de dados na nuvem

#### 1.2 Variáveis de Ambiente
- [x] **Configurar chaves de API reais**
  - ✅ `GEMINI_API_KEY`: Configurada chave do Google AI Studio
  - [ ] `OPENAI_API_KEY`: Pendente configuração da chave da OpenAI
  - ✅ `DATABASE_URL`: Configurada URL do PostgreSQL de produção (Neon)
  - [ ] Configurar variáveis no ambiente de deploy

#### 1.3 Deploy da Aplicação
- [ ] **Escolher plataforma de deploy**
  - Opções recomendadas: Vercel, Railway, Render, ou DigitalOcean
  - Configurar build scripts para produção
  - Testar `npm run build` e `npm run start`
  - Configurar variáveis de ambiente na plataforma

### Fase 2: Domínio e SSL (Prioridade Alta)

#### 2.1 Domínio Personalizado
- [ ] **Registrar domínio**
  - Sugestões: `ipemindtree.com`, `ipemind.org`, `mindtree.ai`
  - Configurar DNS para apontar para o servidor
  - Configurar subdomínios se necessário (api.dominio.com)

#### 2.2 Certificado SSL
- [ ] **Configurar HTTPS**
  - A maioria das plataformas (Vercel, Railway) incluem SSL automático
  - Verificar se o certificado está funcionando
  - Redirecionar HTTP para HTTPS

### Fase 3: Otimizações e Segurança (Prioridade Média)

#### 3.1 Performance
- [ ] **Otimizar build de produção**
  - Verificar bundle size com `npm run build`
  - Implementar code splitting se necessário
  - Otimizar imagens (converter para WebP)
  - Configurar cache headers

#### 3.2 Segurança
- [ ] **Implementar medidas de segurança**
  - Rate limiting para APIs
  - Validação de entrada mais rigorosa
  - Sanitização de dados do usuário
  - Headers de segurança (CORS, CSP)

#### 3.3 Monitoramento
- [ ] **Configurar logs e monitoramento**
  - Implementar logging estruturado
  - Configurar alertas de erro
  - Monitoramento de uptime
  - Analytics básicos (opcional)

### Fase 4: Funcionalidades Avançadas (Prioridade Baixa)

#### 4.1 Integrações Externas
- [ ] **Ativar integrações completas**
  - Bot do Telegram (já implementado, precisa de token)
  - Google Drive (para importação de documentos)
  - Notion (para sincronização)
  - Obsidian (importação de vaults)

#### 4.2 Melhorias de UX
- [ ] **Aprimorar interface**
  - Corrigir warnings de HTML aninhado
  - Implementar loading states
  - Melhorar responsividade mobile
  - Adicionar animações suaves

---

## Configurações Técnicas Detalhadas

### Variáveis de Ambiente Necessárias
```env
# Banco de Dados
DATABASE_URL=postgresql://user:password@host:port/database

# APIs de IA
GEMINI_API_KEY=sua_chave_gemini_aqui
OPENAI_API_KEY=sua_chave_openai_aqui
VITE_GEMINI_API_KEY=${GEMINI_API_KEY}

# Funcionalidades Opcionais
ENABLE_TELEGRAM_BOT=true
TELEGRAM_BOT_TOKEN=seu_token_telegram_aqui

# Ambiente
NODE_ENV=production
PORT=3000
```

### Scripts de Deploy
```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "db:push": "drizzle-kit push",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

### Estrutura de Deploy Recomendada
1. **Frontend**: Build estático servido pelo Vite
2. **Backend**: Node.js/Express na mesma aplicação
3. **Banco**: PostgreSQL externo
4. **Assets**: Uploads servidos estaticamente

---

## Contexto para Próximo Agente 🤖

### Arquivos Importantes
- `ARQUITETURA_ANALISE.md`: Análise completa da arquitetura
- `CHECKPOINT.md`: Log de alterações do projeto
- `create_tables.sql`: Script de criação do banco
- `package.json`: Dependências e scripts
- `.env`: Variáveis de ambiente (configurar para produção)
- `server/index.ts`: Ponto de entrada do servidor (modificado para localhost:3000)
- `server/db.ts`: Configuração do banco (dotenv adicionado)

### Estado Atual do Projeto
- **Funcionando**: Interface React, servidor Express, roteamento
- **Configurado**: Node.js, npm, dependências, dotenv
- **Pendente**: Banco real, APIs de IA, deploy, domínio

### Modificações Feitas
1. Adicionado `dotenv` ao `server/index.ts` e `server/db.ts`
2. Alterado porta de 5000 para 3000 e host de "0.0.0.0" para "localhost"
3. Configurado `.env` com DATABASE_URL temporária
4. Instalado Node.js v24.6.0 via winget

### Comandos para Continuar
```bash
# Verificar se servidor está rodando
node --version
npm --version

# Iniciar desenvolvimento
npm run dev

# Build para produção
npm run build
npm run start

# Gerenciar banco
npm run db:push
```

---

## Estimativas de Tempo

- **Fase 1** (Infraestrutura): 2-4 horas
- **Fase 2** (Domínio/SSL): 1-2 horas  
- **Fase 3** (Otimizações): 4-8 horas
- **Fase 4** (Funcionalidades): 8-16 horas

**Total estimado**: 15-30 horas de desenvolvimento

---

**Próximo passo recomendado**: Investigar o problema do chat da IMT e importar dados existentes para o banco de dados.

## Tarefas Imediatas (Prioridade Alta)

### 1. Investigação e Correção do Chat
- [ ] **Investigar o problema do chat da IMT**
  - Verificar logs de erro no console
  - Testar conexão com APIs de IA
  - Identificar possíveis problemas de autenticação
  - Corrigir problemas encontrados

### 2. Migração de Dados
- [ ] **Importar dados existentes para o banco de dados na nuvem**
  - Criar script de exportação de dados locais
  - Criar script de importação para o banco Neon
  - Verificar integridade dos dados após importação
  - Testar funcionalidades com os dados importados

### 3. Testes e Documentação
- [ ] **Testar funcionalidades que dependem do banco de dados**
  - Verificar criação e edição de ideias
  - Testar sistema de comentários
  - Validar autenticação de usuários
- [ ] **Documentar as soluções implementadas**
  - Atualizar documentação técnica
  - Criar guia de troubleshooting
  - Documentar processo de backup e restauração

**Status**: ✅ Banco de dados configurado, próximas etapas definidas