const documentManager = require('../services/documentManager');
const ragPipeline = require('../services/ragPipeline');
const llmService = require('../services/llmService');
const conversationManager = require('../services/conversationManager');

// Global initialization state
let initialized = false;

/**
 * Initialize all system components
 */
function initializeSystem() {
    try {
        console.log('🚀 Initializing RAG Chat System...');
        
        // Initialize all services
        documentManager.initialize();
        ragPipeline.initialize();
        conversationManager.initialize();
        
        // Test LLM connection (optional)
        if (process.env.OPENAI_API_KEY) {
            llmService.testConnection()
                .then(result => {
                    if (result.success) {
                        console.log('✅ LLM connection test passed');
                    } else {
                        console.warn('⚠️ LLM connection test failed:', result.message);
                    }
                })
                .catch(error => {
                    console.warn('⚠️ LLM connection test failed:', error.message);
                });
        } else {
            console.warn('⚠️ No LLM API key provided - system will use fallback responses');
        }
        
        initialized = true;
        console.log('✅ RAG Chat System initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize system:', error.message);
        initialized = false;
    }
}

/**
 * Validate incoming request
 */
function validateRequest(body) {
    if (!body) {
        return { isValid: false, error: 'Request body is required' };
    }

    if (!body.message || typeof body.message !== 'string') {
        return { isValid: false, error: 'Message is required and must be a string' };
    }

    if (body.message.trim().length === 0) {
        return { isValid: false, error: 'Message cannot be empty' };
    }

    if (body.message.length > 2000) {
        return { isValid: false, error: 'Message is too long (max 2000 characters)' };
    }

    // SessionId is optional but if provided, must be string
    if (body.sessionId && typeof body.sessionId !== 'string') {
        return { isValid: false, error: 'SessionId must be a string' };
    }

    return { isValid: true };
}

/**
 * Send success response
 */
function sendSuccessResponse(res, data) {
    res.status(200).json({
        success: true,
        data: data
    });
}

/**
 * Send error response
 */
function sendErrorResponse(res, statusCode, message) {
    res.status(statusCode).json({
        success: false,
        error: {
            message: message,
            statusCode: statusCode,
            timestamp: new Date().toISOString()
        }
    });
}

/**
 * Main chat handler - processes user messages
 */
function handleChatRequest(req, res) {
    try {
        // Validate request
        const validation = validateRequest(req.body);
        if (!validation.isValid) {
            return sendErrorResponse(res, 400, validation.error);
        }

        // Check if system is initialized
        if (!initialized) {
            return sendErrorResponse(res, 503, 'System is still initializing. Please try again.');
        }

        const { sessionId, message } = req.body;
        const startTime = Date.now();

        console.log(`💬 Processing chat request - Session: ${sessionId}, Message: "${message.substring(0, 50)}..."`);

        // Get or create session
        const activeSessionId = conversationManager.getOrCreateSession(sessionId, {
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });

        // Add user message to conversation
        conversationManager.addMessage(activeSessionId, 'user', message);

        // Get conversation history for context
        const conversationHistory = conversationManager.getFormattedHistory(activeSessionId);

        // Process query through RAG pipeline
        const ragResult = ragPipeline.processQuery(message, conversationHistory);

        let response;
        let tokensUsed = 0;

        if (ragResult.hasContext) {
            // We have relevant context, call LLM
            llmService.callLLMWithFallback(ragResult.prompt)
                .then(llmResponse => {
                    response = llmResponse.content;
                    tokensUsed = llmResponse.tokensUsed;

                    console.log(`✅ LLM response generated (${tokensUsed} tokens)`);

                    // Add assistant response to conversation
                    conversationManager.addMessage(activeSessionId, 'assistant', response, {
                        tokensUsed: tokensUsed,
                        retrievedChunks: ragResult.retrievedChunks,
                        similarityScores: ragResult.similarityScores
                    });

                    // Calculate processing time
                    const processingTime = Date.now() - startTime;

                    // Prepare response
                    const chatResponse = {
                        reply: response,
                        sessionId: activeSessionId,
                        tokensUsed: tokensUsed,
                        retrievedChunks: ragResult.retrievedChunks,
                        processingTimeMs: processingTime,
                        hasContext: ragResult.hasContext,
                        timestamp: new Date().toISOString()
                    };

                    console.log(`✅ Chat request completed in ${processingTime}ms`);
                    sendSuccessResponse(res, chatResponse);
                })
                .catch(llmError => {
                    console.error('❌ LLM call failed:', llmError.message);
                    const fallbackResponse = 'I apologize, but I encountered an error while generating a response. Please try again.';
                    
                    // Add fallback response to conversation
                    conversationManager.addMessage(activeSessionId, 'assistant', fallbackResponse);
                    
                    const chatResponse = {
                        reply: fallbackResponse,
                        sessionId: activeSessionId,
                        tokensUsed: 0,
                        retrievedChunks: ragResult.retrievedChunks,
                        processingTimeMs: Date.now() - startTime,
                        hasContext: ragResult.hasContext,
                        timestamp: new Date().toISOString()
                    };
                    
                    sendSuccessResponse(res, chatResponse);
                });
        } else {
            // No relevant context found, check if we have a mock response
            if (ragResult.mockResponse) {
                response = ragResult.mockResponse;
                console.log('🤖 Using mock response for general query');
            } else if (ragResult.prompt && !ragResult.prompt.includes('I don\'t have enough information')) {
                // Check if prompt contains a mock response (not the generic fallback)
                response = ragResult.prompt;
                console.log('🤖 Using mock response from prompt');
            } else {
                response = ragResult.prompt; // Contains the fallback message
                console.log('⚠️ No relevant context found, using fallback response');
            }

            // Add response to conversation
            conversationManager.addMessage(activeSessionId, 'assistant', response);

            // Calculate processing time
            const processingTime = Date.now() - startTime;

            // Prepare response
            const chatResponse = {
                reply: response,
                sessionId: activeSessionId,
                tokensUsed: 0,
                retrievedChunks: ragResult.retrievedChunks,
                processingTimeMs: processingTime,
                hasContext: ragResult.hasContext,
                timestamp: new Date().toISOString()
            };

            console.log(`✅ Chat request completed in ${processingTime}ms`);
            sendSuccessResponse(res, chatResponse);
        }

    } catch (error) {
        console.error('❌ Chat request failed:', error.message);
        sendErrorResponse(res, 500, 'An unexpected error occurred while processing your request.');
    }
}

/**
 * Handle session management requests
 */
function handleSessionRequest(req, res) {
    try {
        const { sessionId } = req.params;
        const { action } = req.query;

        switch (action) {
            case 'stats':
                const stats = conversationManager.getSessionStats(sessionId);
                if (!stats) {
                    return sendErrorResponse(res, 404, 'Session not found');
                }
                return sendSuccessResponse(res, stats);

            case 'history':
                const history = conversationManager.getConversationHistory(sessionId);
                return sendSuccessResponse(res, { sessionId, history });

            case 'clear':
                const clearedSession = conversationManager.clearConversation(sessionId);
                return sendSuccessResponse(res, { 
                    message: 'Conversation cleared',
                    sessionId: clearedSession.id 
                });

            default:
                return sendErrorResponse(res, 400, 'Invalid action. Use: stats, history, or clear');
        }

    } catch (error) {
        console.error('❌ Session request failed:', error.message);
        sendErrorResponse(res, 500, 'Failed to process session request');
    }
}

/**
 * Handle system status requests
 */
function handleStatusRequest(req, res) {
    try {
        const systemStats = {
            initialized: initialized,
            ragPipeline: ragPipeline.getConfiguration(),
            llmService: llmService.getUsageStats(),
            conversationManager: conversationManager.getSystemStats(),
            documentManager: documentManager.getStatistics(),
            timestamp: new Date().toISOString()
        };

        sendSuccessResponse(res, systemStats);

    } catch (error) {
        console.error('❌ Status request failed:', error.message);
        sendErrorResponse(res, 500, 'Failed to get system status');
    }
}

/**
 * Health check endpoint
 */
function handleHealthCheck(req, res) {
    const health = {
        status: initialized ? 'healthy' : 'initializing',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    };

    const statusCode = initialized ? 200 : 503;
    res.status(statusCode).json(health);
}

// Initialize system when module loads
initializeSystem();

// Export route handlers
module.exports = {
    chat: handleChatRequest,
    session: handleSessionRequest,
    status: handleStatusRequest,
    health: handleHealthCheck
};
