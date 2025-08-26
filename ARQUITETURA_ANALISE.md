# Análise Arquitetural - Ipê Mind Tree (IMT)

## Visão Geral do Projeto

O **Ipê Mind Tree** é uma plataforma colaborativa de gestão de conhecimento e ideias, desenvolvida originalmente no Replit. O sistema combina funcionalidades de rede social, sistema de gestão de conhecimento e assistente de IA para facilitar a colaboração em comunidades.

## Estrutura Geral do Projeto

### Arquitetura Monolítica Full-Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Banco de Dados**: PostgreSQL (Neon Database)
- **ORM**: Drizzle ORM
- **Estilização**: Tailwind CSS + Shadcn/UI
- **Roteamento**: Wouter (cliente) + Express (servidor)

## Hierarquia de Arquivos e Funcionalidades

### 📁 Raiz do Projeto
```
├── .config/                    # Configurações do ambiente Replit
├── .env                        # Variáveis de ambiente
├── .gitignore                  # Arquivos ignorados pelo Git
├── .replit                     # Configuração do Replit
├── CHECKPOINT.md               # Log de alterações do projeto
├── attached_assets/            # Recursos e documentação anexa
├── backups/                    # Backups de arquivos importantes
├── client/                     # 🎯 FRONTEND React
├── server/                     # 🎯 BACKEND Node.js/Express
├── shared/                     # 🎯 CÓDIGO COMPARTILHADO
├── uploads/                    # Arquivos enviados pelos usuários
├── components.json             # Configuração Shadcn/UI
├── create_tables.sql           # Script de criação do banco
├── drizzle.config.ts           # Configuração do Drizzle ORM
├── package.json                # Dependências e scripts
├── tailwind.config.ts          # Configuração Tailwind CSS
├── tsconfig.json               # Configuração TypeScript
└── vite.config.ts              # Configuração Vite
```

### 🎯 CLIENT (Frontend)
```
client/src/
├── App.tsx                     # Componente raiz da aplicação
├── main.tsx                    # Ponto de entrada React
├── index.css                   # Estilos globais
├── components/                 # Componentes React
│   ├── ui/                     # Componentes base Shadcn/UI
│   ├── chat-interface.tsx      # Interface de chat com IA
│   ├── connections-visualization.tsx # Visualização de redes
│   ├── create-idea-modal.tsx   # Modal para criar ideias
│   ├── header.tsx              # Cabeçalho da aplicação
│   ├── footer.tsx              # Rodapé da aplicação
│   ├── ideas-grid.tsx          # Grid de exibição de ideias
│   ├── idea/                   # Componentes relacionados a ideias
│   └── obsidian/               # Componentes para integração Obsidian
├── hooks/                      # Hooks customizados React
│   ├── use-auth.ts             # Hook de autenticação
│   ├── use-mobile.tsx          # Hook para detecção mobile
│   └── use-toast.ts            # Hook para notificações
├── lib/                        # Utilitários e configurações
│   ├── auth-context.tsx        # Contexto de autenticação
│   ├── queryClient.ts          # Configuração TanStack Query
│   ├── types.ts                # Tipos TypeScript
│   ├── utils.ts                # Funções utilitárias
│   └── llm-context.ts          # Contexto para LLM/IA
└── pages/                      # Páginas da aplicação
    ├── home.tsx                # Página inicial
    ├── chat.tsx                # Página de chat com IA
    ├── explore.tsx             # Exploração de ideias
    ├── idea-detail.tsx         # Detalhes de uma ideia
    ├── obsidian.tsx            # Integração com Obsidian
    ├── auth-page.tsx           # Autenticação
    ├── database-viewer.tsx     # Visualizador do banco (admin)
    └── subprompt-admin.tsx     # Administração de subprompts
```

### 🎯 SERVER (Backend)
```
server/
├── index.ts                    # Ponto de entrada do servidor
├── routes.ts                   # Registro de rotas principais
├── db.ts                       # Configuração do banco de dados
├── storage.ts                  # Interface de acesso aos dados
├── auth.ts                     # Sistema de autenticação
├── llm-service.ts              # Serviço de integração com LLM
├── vite.ts                     # Configuração Vite para desenvolvimento
├── routes/                     # Rotas da API
│   ├── chat-routes.ts          # Endpoints de chat
│   ├── database-routes.ts      # Endpoints do banco
│   ├── gemini-proxy-routes.ts  # Proxy para Gemini API
│   ├── obsidian-routes.ts      # Endpoints Obsidian
│   ├── openai-proxy-routes.ts  # Proxy para OpenAI API
│   └── subprompt-routes.ts     # Endpoints de subprompts
├── services/                   # Lógica de negócio
│   ├── chat-service.ts         # Gerenciamento de chat
│   ├── obsidian-service.ts     # Integração com Obsidian
│   ├── obsidian-importer.ts    # Importação de dados Obsidian
│   ├── canvas-parser.ts        # Parser de arquivos Canvas
│   ├── rag-service.ts          # Retrieval-Augmented Generation
│   ├── subprompt-service.ts    # Gerenciamento de subprompts
│   ├── openai-service.ts       # Integração OpenAI
│   ├── google-drive.ts         # Integração Google Drive
│   ├── notion-service.ts       # Integração Notion
│   └── file-service/           # Gerenciamento de arquivos
├── tools/                      # Ferramentas auxiliares
│   ├── extract-explicit-links.ts # Extração de links
│   └── generate-links.ts       # Geração de links
└── telegram/                   # Integração Telegram
    └── bot.ts                  # Bot do Telegram
```

### 🎯 SHARED (Código Compartilhado)
```
shared/
└── schema.ts                   # Schemas Drizzle + Zod (tipos compartilhados)
```

## Funcionalidades Principais

### 1. **Sistema de Ideias**
- **Localização**: `client/src/pages/explore.tsx`, `server/services/`
- **Função**: Criação, visualização e gerenciamento de ideias colaborativas
- **Recursos**: Upload de imagens, comentários, tags, busca

### 2. **Chat com IA (Ipê Mind Assistant)**
- **Localização**: `client/src/pages/chat.tsx`, `server/services/chat-service.ts`
- **Função**: Assistente de IA para exploração de conhecimento
- **Integrações**: OpenAI, Gemini, RAG (Retrieval-Augmented Generation)

### 3. **Integração Obsidian**
- **Localização**: `client/src/pages/obsidian.tsx`, `server/services/obsidian-*`
- **Função**: Importação e visualização de vaults Obsidian
- **Recursos**: Parser de Canvas, extração de links, visualização de rede

### 4. **Sistema de Subprompts**
- **Localização**: `client/src/pages/subprompt-admin.tsx`, `server/services/subprompt-service.ts`
- **Função**: Gerenciamento de prompts especializados para diferentes domínios
- **Domínios**: Governança, Saúde, Educação, Finanças, Tecnologia, Comunidade

### 5. **Visualização de Redes**
- **Localização**: `client/src/components/connections-visualization.tsx`
- **Função**: Visualização interativa de conexões entre ideias e conceitos
- **Tecnologia**: React Force Graph 2D

### 6. **Sistema de Autenticação**
- **Localização**: `server/auth.ts`, `client/src/lib/auth-context.tsx`
- **Função**: Autenticação de usuários com sessões
- **Tecnologia**: Passport.js + Express Session

### 7. **Integração Telegram**
- **Localização**: `server/telegram/bot.ts`
- **Função**: Bot para interação via Telegram
- **Status**: Configurável via variável de ambiente

## Estrutura do Banco de Dados

### Tabelas Principais:
1. **users** - Usuários do sistema
2. **ideas** - Ideias colaborativas
3. **images** - Imagens uploadadas
4. **comments** - Comentários nas ideias
5. **obsidian_nodes** - Nós importados do Obsidian
6. **obsidian_links** - Links entre nós Obsidian
7. **subprompts** - Prompts especializados
8. **resources** - Recursos diversos
9. **import_logs** - Logs de importação
10. **chat_sessions** - Sessões de chat
11. **chat_messages** - Mensagens do chat

## Tecnologias e Dependências

### Frontend:
- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** + **Shadcn/UI**
- **TanStack Query** (gerenciamento de estado servidor)
- **Wouter** (roteamento)
- **Framer Motion** (animações)
- **React Force Graph 2D** (visualizações)

### Backend:
- **Node.js** + **Express** + **TypeScript**
- **Drizzle ORM** + **PostgreSQL**
- **Passport.js** (autenticação)
- **Multer** (upload de arquivos)
- **OpenAI SDK** + **Gemini API**
- **WebSocket** (comunicação real-time)

### Banco de Dados:
- **PostgreSQL** (Neon Database)
- **Drizzle ORM** para migrations e queries
- **Zod** para validação de schemas

## Configuração de Ambiente

### Variáveis de Ambiente Necessárias:
```env
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
OPENAI_API_KEY=...
VITE_GEMINI_API_KEY=${GEMINI_API_KEY}
ENABLE_TELEGRAM_BOT=true
```

### Scripts Disponíveis:
- `npm run dev` - Desenvolvimento
- `npm run build` - Build para produção
- `npm run start` - Execução em produção
- `npm run db:push` - Aplicar mudanças no banco

## Pontos de Atenção para Migração

### 1. **Dependência do Replit**
- Plugins específicos do Replit no Vite
- Configurações de ambiente específicas
- Porta fixa 5000 para compatibilidade

### 2. **Banco de Dados**
- Atualmente usa Neon Database (PostgreSQL)
- Schema bem definido em `create_tables.sql`
- Migrações via Drizzle ORM

### 3. **APIs Externas**
- OpenAI API para chat
- Gemini API como alternativa
- Google Drive para importação
- Telegram Bot (opcional)

### 4. **Arquivos Estáticos**
- Upload de imagens em `/uploads`
- Assets em `/attached_assets`
- Necessário configurar servir arquivos estáticos

## Arquitetura de Domínios IMT

O sistema implementa uma arquitetura baseada em domínios específicos do "Ipê Mind Tree":

1. **Governance** - Governança e políticas
2. **Health** - Saúde e bem-estar
3. **Education** - Educação e aprendizado
4. **Finance** - Finanças e economia
5. **Technology** - Tecnologia e inovação
6. **Community** - Comunidade e colaboração
7. **Resources** - Recursos e sustentabilidade
8. **Projects** - Projetos e iniciativas
9. **Ethics** - Ética e valores

Cada domínio possui subprompts especializados e lógica de categorização automática baseada em palavras-chave.

---

**Status**: Projeto funcional desenvolvido no Replit, pronto para migração para infraestrutura própria com domínio personalizado e banco de dados externo.