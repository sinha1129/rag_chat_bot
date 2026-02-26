# 🤖 RAG Chat Backend API

Production-grade GenAI Assistant with Retrieval-Augmented Generation (RAG) built with Node.js and Express.

## 🚀 Features

- **🔍 RAG Implementation**: Real embedding-based document retrieval
- **📚 Document Management**: Automatic chunking and vector storage
- **💬 Conversation Management**: Session handling with history
- **🤖 LLM Integration**: Support for OpenAI, Gemini, and Claude
- **🔒 Security**: Helmet, CORS, rate limiting, and input validation
- **📊 Analytics**: Token usage tracking and performance monitoring
- **🏥 Health Checks**: Comprehensive system monitoring

## 📋 Prerequisites

- Node.js 14.0.0 or higher
- npm or yarn
- OpenAI API key (or other LLM provider)

## 🛠 Installation

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Set environment variables**:
   ```bash
   # For OpenAI (recommended)
   export OPENAI_API_KEY="your-openai-api-key"
   
   # Optional: Set port and environment
   export PORT=3001
   export NODE_ENV=development
   ```

3. **Start the server**:
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # Production mode
   npm start
   ```

## 🌐 API Endpoints

### Main Chat Endpoint
```
POST /api/chat
```

**Request Body**:
```json
{
  "sessionId": "optional-session-id",
  "message": "How can I reset my password?"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "reply": "Users can reset their password from Settings > Security...",
    "sessionId": "abc123...",
    "tokensUsed": 120,
    "retrievedChunks": 3,
    "processingTimeMs": 850,
    "hasContext": true,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### System Status
```
GET /api/status
```

### Health Check
```
GET /api/health
```

### Session Management
```
GET /api/session/:sessionId?action=stats
GET /api/session/:sessionId?action=history
POST /api/session/:sessionId?action=clear
```

### API Documentation
```
GET /api/docs
```

## 📁 Project Structure

```
backend/
├── server.js              # Main Express server
├── package.json           # Dependencies and scripts
├── README.md              # This file
├── services/              # Business logic services
│   ├── documentManager.js # Document processing & chunking
│   ├── ragPipeline.js     # RAG core functionality
│   ├── llmService.js      # LLM API integration
│   └── conversationManager.js # Session handling
├── routes/                # API route handlers
│   └── chat.js           # Main chat API routes
└── data/                 # Data storage
    ├── docs.json         # Knowledge base documents
    ├── vectorStore.json  # Document embeddings (auto-generated)
    └── conversations.json # Session storage (auto-generated)
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |

### Service Configuration

Each service can be configured with custom parameters:

```javascript
// Example: Custom LLM configuration
const llmService = new LLMService({
  apiKey: 'your-key',
  model: 'gpt-4',
  temperature: 0.2,
  maxTokens: 500
});

// Example: Custom RAG configuration
const ragPipeline = new RAGPipeline(documentManager, {
  similarityThreshold: 0.7,
  maxRetrievedChunks: 3
});
```

## 🔧 How It Works

### 1. Document Processing
- Documents are loaded from `docs.json`
- Text is chunked into 300-word segments with 50-word overlap
- Each chunk is converted to an embedding vector
- Vectors are stored in `vectorStore.json`

### 2. Query Processing
- User message is converted to embedding
- Similarity search finds relevant document chunks
- Context is injected into LLM prompt
- Response is generated based on retrieved context

### 3. Conversation Management
- Sessions are created automatically
- Last 6 messages (3 pairs) are kept for context
- Sessions expire after 1 hour of inactivity
- All data is persisted to JSON files

## 🧪 Testing the API

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Send a Chat Message
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I reset my password?"
  }'
```

### Get Session Statistics
```bash
curl "http://localhost:3001/api/session/abc123?action=stats"
```

## 📊 Monitoring

### System Status
Visit `/api/status` to see:
- System initialization status
- RAG pipeline configuration
- LLM usage statistics
- Active session count
- Document processing stats

### Performance Metrics
The API tracks:
- Token usage per request
- Processing time
- Similarity scores
- Session activity

## 🔒 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: 100 requests per 15 minutes (production)
- **Input Validation**: Request sanitization
- **Error Handling**: Secure error responses

## 🚨 Error Handling

The API provides comprehensive error handling:

```json
{
  "success": false,
  "error": {
    "message": "Descriptive error message",
    "statusCode": 400,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

Common error codes:
- `400`: Bad Request (validation error)
- `404`: Not Found (invalid endpoint)
- `429`: Too Many Requests (rate limit)
- `500`: Internal Server Error
- `503`: Service Unavailable (system initializing)

## 🔄 Development

### Adding New Documents
1. Edit `data/docs.json`
2. Restart the server to reprocess documents

### Custom LLM Provider
1. Update `llmService.js` with new provider
2. Modify `buildRequestBody()` and `parseResponse()` methods

### Adjusting RAG Parameters
1. Edit similarity threshold in `ragPipeline.js`
2. Modify chunk size in `documentManager.js`

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🆘 Support

For issues and questions:
1. Check the API documentation at `/api/docs`
2. Review system status at `/api/status`
3. Check logs for detailed error messages
4. Ensure all environment variables are set correctly
