const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Global configuration
let config = {
    maxHistoryLength: 6, // 3 message pairs (6 messages)
    sessionTimeout: 3600000, // 1 hour in milliseconds
    storageFile: 'conversations.json'
};

// Global session storage
let sessions = new Map();
let storagePath = path.join(__dirname, '../data', config.storageFile);

/**
 * Generate a unique session ID
 */
function generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Create a new conversation session
 */
function createSession(metadata = {}) {
    const sessionId = generateSessionId();
    const session = {
        id: sessionId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        messages: [],
        metadata: {
            userAgent: metadata.userAgent,
            ip: metadata.ip,
            ...metadata
        },
        messageCount: 0
    };

    sessions.set(sessionId, session);
    console.log(`✅ Created new session: ${sessionId}`);
    
    // Save to file
    saveSessions();
    
    return sessionId;
}

/**
 * Get existing session or create new one
 */
function getOrCreateSession(sessionId, metadata = {}) {
    if (!sessionId) {
        return createSession(metadata);
    }

    const session = getSession(sessionId);
    if (session) {
        // Update last activity
        session.lastActivity = new Date().toISOString();
        saveSessions();
        return sessionId;
    } else {
        // Session doesn't exist, create new one
        console.log(`⚠️ Session ${sessionId} not found, creating new session`);
        return createSession(metadata);
    }
}

/**
 * Get session by ID
 */
function getSession(sessionId) {
    const session = sessions.get(sessionId);
    
    if (!session) {
        return null;
    }

    // Check if session has expired
    if (isSessionExpired(session)) {
        console.log(`⏰ Session ${sessionId} expired, removing`);
        sessions.delete(sessionId);
        saveSessions();
        return null;
    }

    return session;
}

/**
 * Check if session has expired
 */
function isSessionExpired(session) {
    const lastActivity = new Date(session.lastActivity);
    const now = new Date();
    return (now - lastActivity) > config.sessionTimeout;
}

/**
 * Add message to conversation history
 */
function addMessage(sessionId, role, content, metadata = {}) {
    const session = getSession(sessionId);
    
    if (!session) {
        throw new Error(`Session ${sessionId} not found or expired`);
    }

    const message = {
        id: crypto.randomBytes(8).toString('hex'),
        role: role,
        content: content,
        timestamp: new Date().toISOString(),
        metadata: {
            tokensUsed: metadata.tokensUsed || 0,
            model: metadata.model || '',
            retrievedChunks: metadata.retrievedChunks || 0,
            similarityScores: metadata.similarityScores || [],
            ...metadata
        }
    };

    session.messages.push(message);
    session.messageCount++;
    session.lastActivity = new Date().toISOString();

    // Limit message history to maxHistoryLength
    if (session.messages.length > config.maxHistoryLength) {
        const excessMessages = session.messages.length - config.maxHistoryLength;
        session.messages.splice(0, excessMessages);
        console.log(`📝 Trimmed ${excessMessages} old messages from session ${sessionId}`);
    }

    saveSessions();
    console.log(`💬 Added ${role} message to session ${sessionId} (${session.messages.length} total)`);
    
    return session;
}

/**
 * Get conversation history for a session
 */
function getConversationHistory(sessionId, limit = null) {
    const session = getSession(sessionId);
    
    if (!session) {
        return [];
    }

    let messages = session.messages;
    
    if (limit && limit > 0) {
        messages = messages.slice(-limit);
    }

    return messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
    }));
}

/**
 * Get formatted conversation history for LLM prompt
 */
function getFormattedHistory(sessionId) {
    const history = getConversationHistory(sessionId);
    return history.map(msg => ({
        role: msg.role,
        content: msg.content
    }));
}

/**
 * Clear conversation history for a session
 */
function clearConversation(sessionId) {
    const session = getSession(sessionId);
    
    if (!session) {
        throw new Error(`Session ${sessionId} not found or expired`);
    }

    session.messages = [];
    session.messageCount = 0;
    session.lastActivity = new Date().toISOString();
    
    saveSessions();
    console.log(`🧹 Cleared conversation history for session ${sessionId}`);
    
    return session;
}

/**
 * Delete a session completely
 */
function deleteSession(sessionId) {
    const deleted = sessions.delete(sessionId);
    
    if (deleted) {
        saveSessions();
        console.log(`🗑️ Deleted session ${sessionId}`);
    }
    
    return deleted;
}

/**
 * Get session statistics
 */
function getSessionStats(sessionId) {
    const session = getSession(sessionId);
    
    if (!session) {
        return null;
    }

    const userMessages = session.messages.filter(msg => msg.role === 'user');
    const assistantMessages = session.messages.filter(msg => msg.role === 'assistant');
    
    const totalTokensUsed = session.messages.reduce((sum, msg) => 
        sum + (msg.metadata.tokensUsed || 0), 0);

    return {
        sessionId: session.id,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        messageCount: session.messageCount,
        userMessageCount: userMessages.length,
        assistantMessageCount: assistantMessages.length,
        totalTokensUsed: totalTokensUsed,
        averageTokensPerMessage: session.messageCount > 0 ? Math.round(totalTokensUsed / session.messageCount) : 0,
        isExpired: isSessionExpired(session)
    };
}

/**
 * Get all active sessions
 */
function getAllSessions() {
    const activeSessions = [];
    
    sessions.forEach((session, sessionId) => {
        if (!isSessionExpired(session)) {
            activeSessions.push({
                id: sessionId,
                createdAt: session.createdAt,
                lastActivity: session.lastActivity,
                messageCount: session.messageCount,
                metadata: session.metadata
            });
        }
    });

    return activeSessions.sort((a, b) => 
        new Date(b.lastActivity) - new Date(a.lastActivity)
    );
}

/**
 * Save sessions to file
 */
function saveSessions() {
    try {
        const sessionsData = {};
        
        sessions.forEach((session, sessionId) => {
            sessionsData[sessionId] = session;
        });

        const data = {
            sessions: sessionsData,
            metadata: {
                totalSessions: sessions.size,
                lastSaved: new Date().toISOString(),
                version: '1.0'
            }
        };

        fs.writeFileSync(storagePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Error saving sessions:', error.message);
    }
}

/**
 * Load sessions from file
 */
function loadSessions() {
    try {
        if (!fs.existsSync(storagePath)) {
            console.log('📁 No existing sessions file found, starting fresh');
            return;
        }

        const rawData = fs.readFileSync(storagePath, 'utf8');
        const data = JSON.parse(rawData);
        
        sessions.clear();
        
        Object.entries(data.sessions || {}).forEach(([sessionId, session]) => {
            // Skip expired sessions
            if (!isSessionExpired(session)) {
                sessions.set(sessionId, session);
            }
        });

        console.log(`✅ Loaded ${sessions.size} sessions from file`);
    } catch (error) {
        console.error('❌ Error loading sessions:', error.message);
        // Start with empty sessions if file is corrupted
        sessions.clear();
    }
}

/**
 * Start periodic cleanup of expired sessions
 */
function startSessionCleanup() {
    // Clean up every 5 minutes
    setInterval(() => {
        cleanupExpiredSessions();
    }, 5 * 60 * 1000);
}

/**
 * Remove expired sessions
 */
function cleanupExpiredSessions() {
    const initialCount = sessions.size;
    const expiredSessions = [];

    sessions.forEach((session, sessionId) => {
        if (isSessionExpired(session)) {
            expiredSessions.push(sessionId);
        }
    });

    expiredSessions.forEach(sessionId => {
        sessions.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
        saveSessions();
        console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
    }
}

/**
 * Get system-wide statistics
 */
function getSystemStats() {
    const allSessions = getAllSessions();
    const totalMessages = allSessions.reduce((sum, session) => sum + session.messageCount, 0);
    
    return {
        totalActiveSessions: allSessions.length,
        totalMessages: totalMessages,
        averageMessagesPerSession: allSessions.length > 0 ? Math.round(totalMessages / allSessions.length) : 0,
        maxHistoryLength: config.maxHistoryLength,
        sessionTimeout: config.sessionTimeout,
        storageFile: storagePath
    };
}

/**
 * Initialize conversation manager
 */
function initialize() {
    console.log('🚀 Initializing Conversation Manager...');
    loadSessions();
    startSessionCleanup();
    console.log('✅ Conversation Manager initialized');
}

// Export all functions
module.exports = {
    createSession,
    getOrCreateSession,
    getSession,
    addMessage,
    getConversationHistory,
    getFormattedHistory,
    clearConversation,
    deleteSession,
    getSessionStats,
    getAllSessions,
    saveSessions,
    loadSessions,
    cleanupExpiredSessions,
    getSystemStats,
    initialize
};
