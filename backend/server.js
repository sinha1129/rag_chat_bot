// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import route handlers
const chatRoutes = require('./routes/chat');

// Global variables
let app = express();
let port = process.env.PORT || 3000;
let nodeEnv = process.env.NODE_ENV || 'development';
let server = null;

/**
 * Get allowed origins for CORS
 */
function getAllowedOrigins() {
    if (nodeEnv === 'production') {
        // In production, specify your frontend domain
        return ['http://localhost:3000', 'https://yourdomain.com'];
    } else {
        // In development, allow all origins
        return '*';
    }
}

/**
 * Setup Express middleware
 */
function setupMiddleware() {
    // Security middleware
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
            },
        },
    }));

    // CORS configuration
    app.use(cors({
        origin: getAllowedOrigins(),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Compression middleware
    app.use(compression());

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: nodeEnv === 'production' ? 100 : 1000, // Limit requests per window
        message: {
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: '15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use('/api/', limiter);

    // Request logging middleware
    app.use((req, res, next) => {
        const timestamp = new Date().toISOString();
        console.log(`📥 ${timestamp} - ${req.method} ${req.path} - IP: ${req.ip}`);
        next();
    });
}

/**
 * Setup API routes
 */
function setupRoutes() {
    // Health check endpoint (no rate limiting)
    app.get('/api/health', chatRoutes.health);

    // API status endpoint
    app.get('/api/status', chatRoutes.status);

    // Main chat endpoint
    app.post('/api/chat', chatRoutes.chat);

    // Session management endpoints
    app.get('/api/session/:sessionId', chatRoutes.session);
    app.post('/api/session/:sessionId', chatRoutes.session);

    // Root endpoint
    app.get('/', (req, res) => {
        res.json({
            name: 'RAG Chat API',
            version: '1.0.0',
            description: 'Production-grade GenAI Assistant with RAG',
            endpoints: {
                chat: 'POST /api/chat',
                health: 'GET /api/health',
                status: 'GET /api/status',
                session: 'GET/POST /api/session/:sessionId'
            },
            documentation: '/api/docs',
            timestamp: new Date().toISOString()
        });
    });

    // API documentation endpoint
    app.get('/api/docs', (req, res) => {
        res.json({
            title: 'RAG Chat API Documentation',
            version: '1.0.0',
            endpoints: {
                'POST /api/chat': {
                    description: 'Send a message to the chat assistant',
                    requestBody: {
                        sessionId: 'string (optional)',
                        message: 'string (required)'
                    },
                    response: {
                        reply: 'string',
                        sessionId: 'string',
                        tokensUsed: 'number',
                        retrievedChunks: 'number',
                        processingTimeMs: 'number',
                        hasContext: 'boolean',
                        timestamp: 'string'
                    }
                },
                'GET /api/health': {
                    description: 'Check API health status',
                    response: {
                        status: 'string',
                        timestamp: 'string',
                        uptime: 'number',
                        memory: 'object'
                    }
                },
                'GET /api/status': {
                    description: 'Get system status and statistics',
                    response: {
                        initialized: 'boolean',
                        ragPipeline: 'object',
                        llmService: 'object',
                        conversationManager: 'object',
                        documentManager: 'object',
                        timestamp: 'string'
                    }
                },
                'GET /api/session/:sessionId?action=stats': {
                    description: 'Get session statistics',
                    response: {
                        sessionId: 'string',
                        createdAt: 'string',
                        lastActivity: 'string',
                        messageCount: 'number',
                        totalTokensUsed: 'number'
                    }
                },
                'GET /api/session/:sessionId?action=history': {
                    description: 'Get conversation history',
                    response: {
                        sessionId: 'string',
                        history: 'array'
                    }
                },
                'POST /api/session/:sessionId?action=clear': {
                    description: 'Clear conversation history',
                    response: {
                        message: 'string',
                        sessionId: 'string'
                    }
                }
            }
        });
    });

    // 404 handler for undefined routes
    app.use('*', (req, res) => {
        res.status(404).json({
            success: false,
            error: {
                message: 'Endpoint not found',
                path: req.originalUrl,
                availableEndpoints: [
                    'GET /',
                    'GET /api/docs',
                    'GET /api/health',
                    'GET /api/status',
                    'POST /api/chat',
                    'GET /api/session/:sessionId',
                    'POST /api/session/:sessionId'
                ]
            }
        });
    });
}

/**
 * Setup error handling middleware
 */
function setupErrorHandling() {
    // Global error handler
    app.use((error, req, res, next) => {
        console.error('❌ Unhandled error:', error);

        // Don't leak error details in production
        const message = nodeEnv === 'production' 
            ? 'Internal server error' 
            : error.message;

        res.status(error.status || 500).json({
            success: false,
            error: {
                message: message,
                statusCode: error.status || 500,
                timestamp: new Date().toISOString(),
                ...(nodeEnv !== 'production' && { stack: error.stack })
            }
        });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled Promise Rejection at:', promise, 'reason:', reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('❌ Uncaught Exception:', error);
        gracefulShutdown('SIGTERM');
    });
}

/**
 * Graceful shutdown function
 */
function gracefulShutdown(signal) {
    try {
        console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
        
        // Close the server
        if (server) {
            server.close(() => {
                console.log('✅ HTTP server closed');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
        
        // Force close after 10 seconds
        setTimeout(() => {
            console.error('⏰ Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
        
    } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
    }
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT'];
    
    signals.forEach(signal => {
        process.on(signal, () => {
            gracefulShutdown(signal);
        });
    });
}

/**
 * Start the server
 */
function startServer() {
    server = app.listen(port, () => {
        console.log('🚀 RAG Chat Server Started Successfully!');
        console.log(`📍 Server running on: http://localhost:${port}`);
        console.log(`🌍 Environment: ${nodeEnv}`);
        console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
        console.log(`💚 Health Check: http://localhost:${port}/api/health`);
        console.log(`📊 System Status: http://localhost:${port}/api/status`);
        console.log('');
        console.log('🔧 Available Endpoints:');
        console.log('   POST /api/chat - Main chat endpoint');
        console.log('   GET  /api/health - Health check');
        console.log('   GET  /api/status - System status');
        console.log('   GET  /api/session/:sessionId - Session management');
        console.log('   GET  /api/docs - API documentation');
        console.log('');
        console.log('⚠️  Note: Make sure to set OPENAI_API_KEY environment variable for LLM functionality');
    });

    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`❌ Port ${port} is already in use`);
        } else {
            console.error('❌ Server error:', error);
        }
        process.exit(1);
    });
}

/**
 * Get Express app instance (for testing)
 */
function getApp() {
    return app;
}

// Initialize server
function initialize() {
    setupMiddleware();
    setupRoutes();
    setupErrorHandling();
    setupGracefulShutdown();
    startServer();
}

// Start server if this file is run directly
if (require.main === module) {
    initialize();
}

// Export functions for testing
module.exports = {
    initialize,
    getApp,
    startServer,
    setupMiddleware,
    setupRoutes,
    setupErrorHandling
};
