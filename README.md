# 🌳 Ipê Mind Tree (IMT)

> **Cognitive Alignment Platform for the Ipê Village Community**

Ipê Mind Tree is an innovative platform developed to facilitate cognitive alignment among members of the Ipê Village community, promoting the synchronization of knowledge, ideas, and thought processes through an integrated information network.

## 🎯 Philosophy and Purpose

### Cognitive Alignment
IMT's core philosophy is based on the concept of **cognitive alignment** - the ability to synchronize and harmonize different perspectives, knowledge, and thought processes within a community. The system acts as a "tree of minds" where:

- **Roots**: Represent shared fundamental knowledge
- **Trunk**: Symbolizes the community's common thought structure
- **Branches**: Manifest different specialties and areas of expertise
- **Leaves**: Express individual ideas that are nourished by collective wisdom

### Ipê Village
Ipê Village is a community focused on innovation, collaboration, and mutual growth. IMT serves as the technological infrastructure that enables:

- Efficient knowledge sharing
- Visualization of connections between ideas and concepts
- Facilitation of collaborative processes
- Preservation and evolution of collective memory

## 🏗️ Technical Architecture

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build and development
- Tailwind CSS for styling
- Shadcn/UI + Radix UI for components
- React Query for state management
- Wouter for routing

**Backend:**
- Node.js with Express
- TypeScript for type safety
- PostgreSQL as database
- Drizzle ORM for queries
- WebSocket for real-time communication

**AI Integrations:**
- Google Gemini API for natural language processing
- OpenAI API (optional) for advanced features
- RAG (Retrieval-Augmented Generation) system

**Infrastructure:**
- Railway for deployment and hosting
- Managed PostgreSQL
- Automatic SSL
- Integrated CI/CD

### Main Features

#### 1. Knowledge Network Visualization
- Interactive graph of concepts and ideas
- Semantic connection mapping
- Intuitive knowledge base navigation

#### 2. Multi-format Import
- **Obsidian Canvas**: Mind map import
- **Notion**: Knowledge base synchronization
- **Google Drive**: Document integration
- **Telegram Bot**: Conversational interface

#### 3. Intelligent Chat System
- Contextualized AI conversations
- Semantic search in knowledge base
- Automatic connection suggestions

#### 4. Subprompt Management
- Modular specialized prompt system
- Reuse of thought patterns
- Customization by knowledge domain

## 🚀 How to Run

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Google Gemini API key

### Local Installation

1. **Clone the repository:**
```bash
git clone https://github.com/StefanoMastella/IpeMindTree.git
cd IpeMindTree
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your configurations
```

4. **Configure the database:**
```bash
# For local PostgreSQL
npm run setup:db

# Or run SQL directly
psql -d your_database -f create_tables.sql
```

5. **Verify configuration:**
```bash
npm run check:env
```

6. **Run in development:**
```bash
npm run dev
```

### Production Deployment

1. **Prepare for deployment:**
```bash
npm run deploy:prepare
```

2. **Follow deployment guide:**
- Check `DEPLOY_GUIDE.md` for detailed instructions
- Or `GUIA_EXECUCAO_FINAL.md` for a practical guide

## 📁 Project Structure

```
IpeMindTree/
├── client/                 # React Frontend
│   └── src/
│       ├── components/     # Reusable components
│       ├── pages/         # Application pages
│       └── lib/           # Utilities and configurations
├── server/                # Node.js Backend
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   └── tools/            # Helper tools
├── shared/               # Shared code
├── docs/                 # Documentation
└── scripts/              # Automation scripts
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Run production version

# Database
npm run setup:db         # Configure database automatically
npm run db:push          # Sync schema with Drizzle

# Verification
npm run check:env        # Check environment configuration
npm run check            # TypeScript type checking
npm run deploy:prepare   # Prepare for deployment
```

## 🔧 Configuration

### Required Environment Variables
```env
DATABASE_URL=postgresql://user:password@host:port/database
GEMINI_API_KEY=your_gemini_key
NODE_ENV=development|production
```

### Optional Variables
```env
OPENAI_API_KEY=your_openai_key
TELEGRAM_BOT_TOKEN=your_bot_token
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