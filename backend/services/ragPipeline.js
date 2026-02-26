const documentManager = require('./documentManager');

// Global variables for RAG pipeline
let vectorStore = [];
let similarityThreshold = 0.7;
let maxRetrievedChunks = 3;

/**
 * Initialize the RAG pipeline by loading vector store
 */
function initialize() {
    try {
        const vectorStoreData = documentManager.loadVectorStore();
        vectorStore = vectorStoreData.chunks;
        console.log(`✅ RAG Pipeline initialized with ${vectorStore.length} chunks`);
    } catch (error) {
        console.error('❌ Failed to initialize RAG Pipeline:', error.message);
        throw error;
    }
}

/**
 * Calculate cosine similarity between two vectors
 */
function calculateCosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must have the same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (normA * normB);
}

/**
 * Generate embedding for user query (mock implementation)
 */
function generateQueryEmbedding(query) {
    console.log(`🔄 Generating embedding for query: "${query.substring(0, 50)}..."`);
    
    // Mock embedding - in real implementation, call embedding API
    const dimensions = 1536;
    const embedding = [];
    
    for (let i = 0; i < dimensions; i++) {
        embedding.push(Math.random() * 2 - 1);
    }
    
    return embedding;
}

/**
 * Perform similarity search against the vector store
 */
function similaritySearch(queryEmbedding) {
    console.log('🔍 Performing similarity search...');
    
    const similarities = vectorStore.map(chunk => {
        const similarity = calculateCosineSimilarity(queryEmbedding, chunk.embedding);
        return {
            ...chunk,
            similarity: similarity
        };
    });

    // Sort by similarity score (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Filter by threshold and limit results
    const filteredResults = similarities
        .filter(result => result.similarity >= similarityThreshold)
        .slice(0, maxRetrievedChunks);

    console.log(`✅ Found ${filteredResults.length} relevant chunks (threshold: ${similarityThreshold})`);
    
    return filteredResults;
}

/**
 * Retrieve relevant context for the user query
 */
function retrieveContext(query) {
    try {
        // Generate embedding for the query
        const queryEmbedding = generateQueryEmbedding(query);
        
        // Perform similarity search
        const relevantChunks = similaritySearch(queryEmbedding);
        
        // Check if we have enough relevant information
        if (relevantChunks.length === 0) {
            // For mock provider, try to get a mock response
            const llmService = require('./llmService');
            if (process.env.LLM_PROVIDER === 'mock') {
                return {
                    hasContext: false,
                    context: [],
                    message: 'Using mock response for general query.',
                    similarityScores: [],
                    mockResponse: llmService.generateMockResponse(query)
                };
            }
            
            return {
                hasContext: false,
                context: [],
                message: 'I don\'t have enough information to answer this question.',
                similarityScores: []
            };
        }

        // Format context for the prompt
        const context = relevantChunks.map((chunk, index) => ({
            id: chunk.id,
            title: chunk.documentTitle,
            content: chunk.content,
            similarity: chunk.similarity,
            order: index + 1
        }));

        return {
            hasContext: true,
            context: context,
            message: `Found ${context.length} relevant documents.`,
            similarityScores: relevantChunks.map(chunk => chunk.similarity)
        };

    } catch (error) {
        console.error('❌ Error retrieving context:', error.message);
        return {
            hasContext: false,
            context: [],
            message: 'An error occurred while searching for information.',
            similarityScores: []
        };
    }
}

/**
 * Construct a structured prompt for the LLM
 */
function constructPrompt(userQuery, context, conversationHistory = []) {
    let prompt = '';

    // System instructions
    prompt += 'You are a helpful AI assistant. Answer the user\'s question based ONLY on the provided context. ';
    prompt += 'If the context doesn\'t contain enough information to answer the question, say so clearly. ';
    prompt += 'Do not make up information or hallucinate answers.\n\n';

    // Add conversation history (last 3-5 message pairs)
    if (conversationHistory.length > 0) {
        prompt += '=== CONVERSATION HISTORY ===\n';
        const recentHistory = conversationHistory.slice(-6); // Last 3 pairs (6 messages)
        recentHistory.forEach((msg, index) => {
            const role = msg.role === 'user' ? 'User' : 'Assistant';
            prompt += `${role}: ${msg.content}\n`;
        });
        prompt += '\n';
    }

    // Add retrieved context
    if (context && context.length > 0) {
        prompt += '=== RELEVANT CONTEXT ===\n';
        context.forEach((chunk, index) => {
            prompt += `[Document ${index + 1}: ${chunk.title}]\n`;
            prompt += `${chunk.content}\n\n`;
        });
        prompt += '=== END OF CONTEXT ===\n\n';
    }

    // Add the user's question
    prompt += '=== USER QUESTION ===\n';
    prompt += userQuery;
    prompt += '\n\n=== YOUR RESPONSE ===\n';

    return prompt;
}

/**
 * Process a user query through the complete RAG pipeline
 */
function processQuery(userQuery, conversationHistory = []) {
    try {
        console.log(`🚀 Processing query: "${userQuery}"`);

        // Step 1: Retrieve relevant context
        const retrievalResult = retrieveContext(userQuery);

        // Step 2: Construct prompt if we have context
        let prompt = '';
        if (retrievalResult.hasContext) {
            prompt = constructPrompt(userQuery, retrievalResult.context, conversationHistory);
        } else if (retrievalResult.mockResponse) {
            // Use mock response if available
            prompt = retrievalResult.mockResponse;
        } else {
            // Fallback prompt for no context
            prompt = `I don't have enough information in my knowledge base to answer: "${userQuery}". Please try rephrasing your question or contact support for more specific assistance.`;
        }

        return {
            success: true,
            query: userQuery,
            hasContext: retrievalResult.hasContext,
            context: retrievalResult.context,
            prompt: prompt,
            similarityScores: retrievalResult.similarityScores,
            retrievedChunks: retrievalResult.context.length,
            message: retrievalResult.message,
            mockResponse: retrievalResult.mockResponse
        };

    } catch (error) {
        console.error('❌ Error processing query:', error.message);
        return {
            success: false,
            query: userQuery,
            hasContext: false,
            context: [],
            prompt: '',
            similarityScores: [],
            retrievedChunks: 0,
            message: 'An error occurred while processing your query.',
            error: error.message
        };
    }
}

/**
 * Update similarity threshold
 */
function setSimilarityThreshold(threshold) {
    if (threshold < 0 || threshold > 1) {
        throw new Error('Threshold must be between 0 and 1');
    }
    similarityThreshold = threshold;
    console.log(`✅ Updated similarity threshold to ${threshold}`);
}

/**
 * Update maximum retrieved chunks
 */
function setMaxRetrievedChunks(maxChunks) {
    if (maxChunks < 1 || maxChunks > 10) {
        throw new Error('Max chunks must be between 1 and 10');
    }
    maxRetrievedChunks = maxChunks;
    console.log(`✅ Updated max retrieved chunks to ${maxChunks}`);
}

/**
 * Get current pipeline configuration
 */
function getConfiguration() {
    return {
        similarityThreshold: similarityThreshold,
        maxRetrievedChunks: maxRetrievedChunks,
        totalChunksInStore: vectorStore.length,
        embeddingDimensions: 1536
    };
}

// Export all functions
module.exports = {
    initialize,
    calculateCosineSimilarity,
    generateQueryEmbedding,
    similaritySearch,
    retrieveContext,
    constructPrompt,
    processQuery,
    setSimilarityThreshold,
    setMaxRetrievedChunks,
    getConfiguration
};
