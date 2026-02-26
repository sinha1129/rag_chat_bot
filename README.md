# RAG Chat Assistant 🤖

A professional, real-time chat assistant powered by Retrieval-Augmented Generation (RAG) with multi-provider LLM support.

## ✨ Features

### 🎯 Core Functionality
- **RAG Pipeline**: Advanced document retrieval with semantic search
- **Multi-Provider LLM Support**: OpenAI, Gemini, Claude, Mistral, and Mock mode
- **Real-time Chat**: Professional UI with live status updates
- **Session Management**: Persistent conversation history
- **Smart Fallbacks**: Rule-based responses when no context found

### 🎨 Professional Frontend
- **Modern Design**: Clean, professional interface with standard colors
- **Real-time Status**: Live system health monitoring
- **Responsive Layout**: Works on desktop and mobile
- **Smooth Animations**: Message transitions and hover effects
- **Error Handling**: Graceful error messages and recovery

### 🔧 Backend Features
- **RESTful API**: Clean, well-documented endpoints
- **Vector Search**: Cosine similarity for document retrieval
- **Conversation History**: Session-based message tracking
- **Usage Statistics**: Token usage and request monitoring
- **Environment Config**: Flexible provider switching

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- API keys for LLM providers (optional for mock mode)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd rag-chat-assistant
```

2. **Install dependencies**
```bash
cd backend
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. **Start the server**
```bash
npm start
```

5. **Open the frontend**
Open `frontend/index.html` in your browser or serve it with a web server.

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# LLM Provider Selection: openai, gemini, claude, mistral, mock
LLM_PROVIDER=mock

# API Keys (get from respective providers)
OPENAI_API_KEY=your_openai_key_here
GEMINI_API_KEY=your_gemini_key_here
CLAUDE_API_KEY=your_claude_key_here
MISTRAL_API_KEY=your_mistral_key_here

# Server Configuration
PORT=3002
NODE_ENV=development
```

### Provider Setup

#### OpenAI
1. Sign up at [OpenAI](https://platform.openai.com/)
2. Get API key from dashboard
3. Set `OPENAI_API_KEY` in `.env`
4. Set `LLM_PROVIDER=openai`

#### Google Gemini
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Set `GEMINI_API_KEY` in `.env`
3. Set `LLM_PROVIDER=gemini`

#### Anthropic Claude
1. Request API access at [Anthropic](https://www.anthropic.com/)
2. Set `CLAUDE_API_KEY` in `.env`
3. Set `LLM_PROVIDER=claude`

#### Mistral AI
1. Sign up at [Mistral AI](https://mistral.ai/)
2. Set `MISTRAL_API_KEY` in `.env`
3. Set `LLM_PROVIDER=mistral`

#### Mock Mode (No API Key Required)
```env
LLM_PROVIDER=mock
```

## 📁 Project Structure

```
rag-chat-assistant/
├── backend/
│   ├── services/
│   │   ├── llmService.js      # Multi-provider LLM integration
│   │   ├── ragPipeline.js     # RAG pipeline and vector search
│   │   ├── documentManager.js # Document processing
│   │   └── conversationManager.js # Session management
│   ├── routes/
│   │   ├── chat.js            # Chat API endpoints
│   │   ├── documents.js       # Document management
│   │   └── status.js          # System status
│   ├── data/
│   │   ├── docs.json          # Document storage
│   │   ├── vectorStore.json   # Embedding vectors
│   │   └── conversations.json # Chat history
│   ├── server.js              # Express server
│   ├── package.json           # Dependencies
│   └── .env                   # Environment variables
├── frontend/
│   └── index.html             # Professional web interface
├── README.md                  # This file
└── .gitignore                 # Git ignore rules
```

## 🔌 API Endpoints

### Chat API
- `POST /api/chat` - Send chat message
- `GET /api/status` - Get system status

### Document Management
- `POST /api/documents/upload` - Upload document
- `GET /api/documents` - List documents
- `DELETE /api/documents/:id` - Delete document

### System Status
- `GET /api/status` - System health and statistics

## 🎯 Usage Examples

### Basic Chat
```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "How do I reset my password?",
    sessionId: "user-session-123"
  })
});
```

### System Status
```javascript
const status = await fetch('/api/status');
const systemInfo = await status.json();
```

## 🛠️ Development

### Adding New Documents
Documents are stored in `backend/data/docs.json`. Each document should have:
- `id`: Unique identifier
- `title`: Document title
- `content`: Text content for RAG
- `metadata`: Additional information

### Extending Mock Responses
Edit `backend/services/llmService.js` in the `generateMockResponse` function to add more rule-based responses.

### Adding New LLM Providers
1. Add provider configuration to `config` object in `llmService.js`
2. Update `getApiConfig`, `getCurrentModel`, `getCurrentApiKey` functions
3. Add request body builder in `buildRequestBody`
4. Add response parser in `parseResponse`

## 🔍 Features in Detail

### RAG Pipeline
- **Embedding Generation**: Converts text to vector embeddings
- **Similarity Search**: Finds relevant documents using cosine similarity
- **Context Retrieval**: Gathers relevant information for LLM
- **Prompt Construction**: Builds structured prompts with context

### Session Management
- **Persistent Sessions**: Conversation history stored in JSON
- **Session IDs**: Unique identifiers for user sessions
- **Message History**: Complete chat log with metadata
- **Context Awareness**: Maintains conversation context

### Mock Mode
- **Rule-based Responses**: Intelligent responses for common queries
- **Keyword Matching**: Detects intent from user messages
- **Fallback Handling**: Graceful degradation when no API available
- **Development Friendly**: Test without API keys

## 🐛 Troubleshooting

### Common Issues

1. **API Key Errors**
   - Verify API keys in `.env` file
   - Check provider account status
   - Ensure correct provider selected

2. **No Relevant Context Found**
   - Add more documents to knowledge base
   - Check document content quality
   - Try rephrasing queries

3. **Server Connection Issues**
   - Verify backend is running on correct port
   - Check firewall settings
   - Ensure CORS configuration

### Debug Mode
Set `NODE_ENV=development` for detailed logging and error messages.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT models
- Google for Gemini models
- Anthropic for Claude models
- Mistral AI for their models
- The open-source community for inspiration and tools

---

**Built with ❤️ for intelligent conversational AI**
