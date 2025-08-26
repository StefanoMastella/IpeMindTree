# 🌳 Ipê Mind Tree (IMT)

> **Plataforma de Alinhamento Cognitivo para a Comunidade Ipê Village**

O Ipê Mind Tree é uma plataforma inovadora desenvolvida para facilitar o alinhamento cognitivo entre membros da comunidade Ipê Village, promovendo a sincronização de conhecimentos, ideias e processos de pensamento através de uma rede integrada de informações.

## 🎯 Filosofia e Propósito

### Alinhamento Cognitivo
A filosofia central do IMT baseia-se no conceito de **alinhamento cognitivo** - a capacidade de sincronizar e harmonizar diferentes perspectivas, conhecimentos e processos de pensamento dentro de uma comunidade. O sistema atua como uma "árvore de mentes" onde:

- **Raízes**: Representam os conhecimentos fundamentais compartilhados
- **Tronco**: Simboliza a estrutura comum de pensamento da comunidade
- **Galhos**: Manifestam as diferentes especialidades e áreas de expertise
- **Folhas**: Expressam as ideias individuais que se nutrem da sabedoria coletiva

### Ipê Village
O Ipê Village é uma comunidade focada em inovação, colaboração e crescimento mútuo. O IMT serve como a infraestrutura tecnológica que permite:

- Compartilhamento eficiente de conhecimento
- Visualização de conexões entre ideias e conceitos
- Facilitação de processos colaborativos
- Preservação e evolução da memória coletiva

## 🏗️ Arquitetura Técnica

### Stack Tecnológico

**Frontend:**
- React 18 com TypeScript
- Vite para build e desenvolvimento
- Tailwind CSS para estilização
- Shadcn/UI + Radix UI para componentes
- React Query para gerenciamento de estado
- Wouter para roteamento

**Backend:**
- Node.js com Express
- TypeScript para type safety
- PostgreSQL como banco de dados
- Drizzle ORM para queries
- WebSocket para comunicação real-time

**Integrações de IA:**
- Google Gemini API para processamento de linguagem natural
- OpenAI API (opcional) para funcionalidades avançadas
- Sistema de RAG (Retrieval-Augmented Generation)

**Infraestrutura:**
- Railway para deploy e hosting
- PostgreSQL gerenciado
- SSL automático
- CI/CD integrado

### Funcionalidades Principais

#### 1. Visualização de Rede de Conhecimento
- Grafo interativo de conceitos e ideias
- Mapeamento de conexões semânticas
- Navegação intuitiva pela base de conhecimento

#### 2. Importação Multi-formato
- **Obsidian Canvas**: Importação de mapas mentais
- **Notion**: Sincronização de bases de conhecimento
- **Google Drive**: Integração com documentos
- **Telegram Bot**: Interface conversacional

#### 3. Sistema de Chat Inteligente
- Conversas contextualizadas com IA
- Busca semântica na base de conhecimento
- Sugestões automáticas de conexões

#### 4. Gestão de Subprompts
- Sistema modular de prompts especializados
- Reutilização de padrões de pensamento
- Personalização por domínio de conhecimento

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ 
- PostgreSQL 14+
- Chave da API Google Gemini

### Instalação Local

1. **Clone o repositório:**
```bash
git clone https://github.com/StefanoMastella/IpeMindTree.git
cd IpeMindTree
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure as variáveis de ambiente:**
```bash
cp .env.example .env
# Edite o .env com suas configurações
```

4. **Configure o banco de dados:**
```bash
# Para PostgreSQL local
npm run setup:db

# Ou execute o SQL diretamente
psql -d sua_database -f create_tables.sql
```

5. **Verifique a configuração:**
```bash
npm run check:env
```

6. **Execute em desenvolvimento:**
```bash
npm run dev
```

### Deploy em Produção

1. **Prepare para deploy:**
```bash
npm run deploy:prepare
```

2. **Siga o guia de deploy:**
- Consulte `DEPLOY_GUIDE.md` para instruções detalhadas
- Ou `GUIA_EXECUCAO_FINAL.md` para um guia prático

## 📁 Estrutura do Projeto

```
IpeMindTree/
├── client/                 # Frontend React
│   └── src/
│       ├── components/     # Componentes reutilizáveis
│       ├── pages/         # Páginas da aplicação
│       └── lib/           # Utilitários e configurações
├── server/                # Backend Node.js
│   ├── routes/           # Rotas da API
│   ├── services/         # Lógica de negócio
│   └── tools/            # Ferramentas auxiliares
├── shared/               # Código compartilhado
├── docs/                 # Documentação
└── scripts/              # Scripts de automação
```

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor de desenvolvimento
npm run build            # Build para produção
npm run start            # Executa versão de produção

# Banco de dados
npm run setup:db         # Configura banco automaticamente
npm run db:push          # Sincroniza schema com Drizzle

# Verificações
npm run check:env        # Verifica configuração do ambiente
npm run check            # Verificação de tipos TypeScript
npm run deploy:prepare   # Prepara para deploy
```

## 🔧 Configuração

### Variáveis de Ambiente Obrigatórias
```env
DATABASE_URL=postgresql://user:password@host:port/database
GEMINI_API_KEY=sua_chave_gemini
NODE_ENV=development|production
```

### Variáveis Opcionais
```env
OPENAI_API_KEY=sua_chave_openai
TELEGRAM_BOT_TOKEN=token_do_bot
ENABLE_TELEGRAM_BOT=true
```

## 📚 Documentation

- **[Architecture Analysis](docs/ARQUITETURA_ANALISE.md)**: Detailed technical analysis
- **[Deploy Guide](docs/DEPLOY_GUIDE.md)**: Technical deployment instructions
- **[Execution Guide](docs/GUIA_EXECUCAO_FINAL.md)**: Step-by-step practical guide
- **[Roadmap](docs/ROADMAP_PRODUCAO.md)**: Development plan
- **[Checkpoint](docs/CHECKPOINT.md)**: Progress history

## 🤝 Contributing

IMT is developed for and by the Ipê Village community. Contributions are welcome through:

1. Issues to report bugs or suggest improvements
2. Pull requests with new features
3. Documentation and usage examples
4. User experience feedback

## 📄 License

MIT License - see the LICENSE file for details.

## 🌟 Project Status

- ✅ **Development**: Functional
- ✅ **Build**: Tested and approved
- 🚀 **Deploy**: Live on Railway
- 📈 **Roadmap**: Phase 1 complete, Phase 2 in planning

---

**Developed with 💚 for the Ipê Village community**

*"A collective mind is stronger than the sum of its individual parts"*