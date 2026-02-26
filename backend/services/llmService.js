
// Global configuration
let config = {
    // Provider selection: 'openai', 'gemini', 'claude', 'mistral'
    provider: process.env.LLM_PROVIDER || 'gemini',
    
    // OpenAI Configuration
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: 'gpt-3.5-turbo',
    
    // Gemini Configuration
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: 'gemini-1.0-pro',
    
    // Claude Configuration
    claudeApiKey: process.env.CLAUDE_API_KEY || '',
    claudeModel: 'claude-3-haiku-20240307',
    
    // Mistral Configuration
    mistralApiKey: process.env.MISTRAL_API_KEY || '',
    mistralModel: 'mistral-tiny',
    
    // Common settings
    temperature: 0.2,
    maxTokens: 500,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000
};

// Usage tracking
let totalTokensUsed = 0;
let requestCount = 0;

/**
 * Get API endpoint and headers based on provider
 */
function getApiConfig() {
    switch (config.provider) {
        case 'openai':
            return {
                url: 'https://api.openai.com/v1/chat/completions',
                headers: {
                    'Authorization': `Bearer ${config.openaiApiKey}`,
                    'Content-Type': 'application/json'
                }
            };
        
        case 'gemini':
            return {
                url: `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        
        case 'claude':
            return {
                url: 'https://api.anthropic.com/v1/messages',
                headers: {
                    'x-api-key': config.claudeApiKey,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                }
            };
        
        case 'mistral':
            return {
                url: 'https://api.mistral.ai/v1/chat/completions',
                headers: {
                    'Authorization': `Bearer ${config.mistralApiKey}`,
                    'Content-Type': 'application/json'
                }
            };
        
        case 'mock':
            return {
                url: 'mock://api',
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        
        default:
            throw new Error(`Unsupported provider: ${config.provider}`);
    }
}

/**
 * Get current model name based on provider
 */
function getCurrentModel() {
    switch (config.provider) {
        case 'openai': return config.openaiModel;
        case 'gemini': return config.geminiModel;
        case 'claude': return config.claudeModel;
        case 'mistral': return config.mistralModel;
        case 'mock': return 'mock-model';
        default: return 'unknown';
    }
}

/**
 * Get current API key based on provider
 */
function getCurrentApiKey() {
    switch (config.provider) {
        case 'openai': return config.openaiApiKey;
        case 'gemini': return config.geminiApiKey;
        case 'claude': return config.claudeApiKey;
        case 'mistral': return config.mistralApiKey;
        case 'mock': return 'mock-key';
        default: return '';
    }
}

/**
 * Build request body based on provider
 */
function buildRequestBody(prompt) {
    switch (config.provider) {
        case 'openai':
            return {
                model: config.openaiModel,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: config.temperature,
                max_tokens: config.maxTokens
            };
        
        case 'gemini':
            return {
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: config.temperature,
                    maxOutputTokens: config.maxTokens
                }
            };
        
        case 'claude':
            return {
                model: config.claudeModel,
                max_tokens: config.maxTokens,
                temperature: config.temperature,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            };
        
        case 'mistral':
            return {
                model: config.mistralModel,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: config.temperature,
                max_tokens: config.maxTokens
            };
        
        case 'mock':
            return {
                model: 'mock-model',
                prompt: prompt,
                temperature: config.temperature,
                max_tokens: config.maxTokens
            };
        
        default:
            throw new Error(`Unsupported provider: ${config.provider}`);
    }
}

/**
 * Parse API response based on provider
 */
function parseResponse(data) {
    let content = '';
    let tokensUsed = 0;

    switch (config.provider) {
        case 'openai':
            content = data.choices[0]?.message?.content || '';
            tokensUsed = data.usage?.total_tokens || 0;
            break;
        
        case 'gemini':
            content = data.candidates[0]?.content?.parts[0]?.text || '';
            tokensUsed = data.usageMetadata?.totalTokenCount || 0;
            break;
        
        case 'claude':
            content = data.content[0]?.text || '';
            tokensUsed = data.usage?.input_tokens + data.usage?.output_tokens || 0;
            break;
        
        case 'mistral':
            content = data.choices[0]?.message?.content || '';
            tokensUsed = data.usage?.total_tokens || 0;
            break;
        
        case 'mock':
            content = generateMockResponse(prompt);
            tokensUsed = 0;
            break;
        
        default:
            content = 'Response parsing failed';
            tokensUsed = 0;
    }

    return {
        content: content,
        tokensUsed: tokensUsed
    };
}

/**
 * Make actual API call to LLM
 */
function makeAPICall(prompt) {
    // Handle mock provider
    if (config.provider === 'mock') {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockResponse = generateMockResponse(prompt);
                resolve({
                    content: mockResponse,
                    tokensUsed: 0,
                    model: 'mock-model',
                    provider: 'mock',
                    timestamp: new Date().toISOString()
                });
            }, 500); // Simulate API delay
        });
    }

    const apiConfig = getApiConfig();
    const requestBody = buildRequestBody(prompt);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    return new Promise((resolve, reject) => {
        fetch(apiConfig.url, {
            method: 'POST',
            headers: apiConfig.headers,
            body: JSON.stringify(requestBody),
            signal: controller.signal
        })
        .then(response => {
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
                });
            }
            
            return response.json();
        })
        .then(data => {
            const parsedResponse = parseResponse(data);
            totalTokensUsed += parsedResponse.tokensUsed;
            requestCount++;
            
            resolve({
                ...parsedResponse,
                model: getCurrentModel(),
                provider: config.provider,
                timestamp: new Date().toISOString()
            });
        })
        .catch(error => {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                reject(new Error('Request timeout'));
            } else {
                reject(error);
            }
        });
    });
}

/**
 * Test connection to LLM API
 */
function testConnection() {
    if (!getCurrentApiKey()) {
        return Promise.resolve({
            success: false,
            message: 'No API key provided',
            provider: config.provider
        });
    }

    return makeAPICall('Hello, this is a test message.')
        .then(response => {
            return {
                success: true,
                message: 'Connection successful',
                provider: config.provider,
                model: getCurrentModel(),
                response: response.content.substring(0, 100)
            };
        })
        .catch(error => {
            // Handle quota exceeded gracefully
            if (error.message.includes('quota') || error.message.includes('429')) {
                return {
                    success: false,
                    message: 'API quota exceeded. System will use fallback responses.',
                    provider: config.provider,
                    quotaExceeded: true
                };
            }
            
            return {
                success: false,
                message: error.message,
                provider: config.provider,
                error: error.message
            };
        });
}

/**
 * Call LLM API with retry mechanism
 */
function callLLM(prompt) {
    if (!getCurrentApiKey()) {
        throw new Error(`API key is required. Set ${config.provider.toUpperCase()}_API_KEY environment variable.`);
    }

    console.log(`🤖 Calling LLM API (${config.provider}/${getCurrentModel()})...`);
    
    return new Promise((resolve, reject) => {
        let attempt = 1;
        
        function tryCall() {
            makeAPICall(prompt)
                .then(response => {
                    requestCount++;
                    resolve(response);
                })
                .catch(error => {
                    console.error(`❌ Attempt ${attempt} failed:`, error.message);
                    
                    if (attempt >= config.maxRetries) {
                        reject(new Error(`LLM API failed after ${config.maxRetries} attempts: ${error.message}`));
                        return;
                    }
                    
                    // Wait before retrying (exponential backoff)
                    setTimeout(() => {
                        attempt++;
                        tryCall();
                    }, config.retryDelay * Math.pow(2, attempt - 1));
                });
        }
        
        tryCall();
    });
}

/**
 * Generate a mock response when no API key is available or quota exceeded
 */
function generateMockResponse(prompt) {
    console.log('🤖 Using mock response (no API key or quota exceeded)');
    
    // Simple rule-based responses for common questions
    const responses = {
        'hello': 'Hello! How can I help you today? I can assist with account management, security settings, billing inquiries, mobile app features, troubleshooting, and API integration.',
        'hi': 'Hi there! What can I help you with? I\'m here to assist with account management, security settings, billing, mobile app features, troubleshooting, and API integration.',
        'hey': 'Hey! How can I assist you today? I can help with account management, security settings, billing inquiries, mobile app features, troubleshooting, and API integration.',
        'good morning': 'Good morning! How can I help you today? I\'m your RAG-powered assistant ready to assist with account management, security settings, billing, and more.',
        'good afternoon': 'Good afternoon! What can I help you with today? I\'m here to assist with account management, security settings, billing, mobile app features, and more.',
        'good evening': 'Good evening! How can I assist you today? I\'m your RAG-powered assistant ready to help with account management, security settings, billing, and more.',
        'thanks': 'You\'re welcome! Is there anything else I can help you with?',
        'thank you': 'You\'re welcome! Is there anything else I can assist you with?',
        'bye': 'Goodbye! Feel free to come back anytime if you need help.',
        'goodbye': 'Goodbye! Have a great day and come back anytime you need assistance.',
        'help': 'I can help you with: account management, security settings, billing inquiries, mobile app features, troubleshooting, and API integration. What would you like to know?',
        'password': 'You can reset your password from Settings > Security. Click on "Change Password" and enter your current password followed by the new password.',
        'account': 'To set up a new account, click on the "Sign Up" button on the homepage. Enter your email address, create a strong password, and provide your full name.',
        '2fa': 'Two-Factor Authentication (2FA) adds an extra layer of security. Enable 2FA from Settings > Security > Two-Factor Authentication.',
        'billing': 'We accept various payment methods including credit cards, debit cards, and PayPal. You can update your payment method from Settings > Billing.',
        'mobile': 'Our mobile app is available for both iOS and Android devices. Download it from the App Store or Google Play Store.',
        'troubleshoot': 'If you\'re having trouble logging in, first check your internet connection, clear your browser cache and cookies, then try again.',
        'api': 'Our API allows developers to integrate our services. Visit the Developer Dashboard to generate an API key and access comprehensive documentation.',
        'default': 'I can help you with account management, security settings, billing inquiries, mobile app features, troubleshooting, and API integration. Please ask me about any of these topics or try rephrasing your question.'
    };
    
    // Check if prompt contains any keywords (case insensitive)
    const lowerPrompt = prompt.toLowerCase().trim();
    
    // Check for exact matches first
    if (responses[lowerPrompt]) {
        return responses[lowerPrompt];
    }
    
    // Check for partial matches
    for (const [key, response] of Object.entries(responses)) {
        if (lowerPrompt.includes(key)) {
            return response;
        }
    }
    
    return responses.default;
}

/**
 * Generate a fallback response when API fails
 */
function generateFallbackResponse(error) {
    console.error('🔄 Using fallback response due to error:', error);
    
    // Return a helpful message about the system
    return {
        content: 'I apologize, but I\'m currently experiencing issues with the AI service. This might be due to API quota limits or temporary service disruptions. The RAG system is working correctly - I can still retrieve relevant documents, but I\'m unable to generate AI responses right now. Please try again later or contact support if the issue persists.',
        tokensUsed: 0,
        model: 'fallback-response',
        provider: 'fallback',
        timestamp: new Date().toISOString(),
        fallback: true
    };
}

/**
 * Call LLM with fallback handling
 */
function callLLMWithFallback(prompt) {
    return callLLM(prompt)
        .catch(error => generateFallbackResponse(error.message));
}

/**
 * Get usage statistics
 */
function getUsageStats() {
    return {
        totalTokensUsed: totalTokensUsed,
        requestCount: requestCount,
        averageTokensPerRequest: requestCount > 0 ? Math.round(totalTokensUsed / requestCount) : 0,
        model: config.model,
        temperature: config.temperature
    };
}

/**
 * Reset usage statistics
 */
function resetUsageStats() {
    totalTokensUsed = 0;
    requestCount = 0;
    console.log('📊 Usage statistics reset');
}

/**
 * Update configuration
 */
function updateConfig(newConfig) {
    if (newConfig.model) {
        config.model = newConfig.model;
    }
    
    if (newConfig.temperature !== undefined) {
        config.temperature = Math.max(0, Math.min(2, newConfig.temperature));
    }
    
    if (newConfig.maxTokens) {
        config.maxTokens = newConfig.maxTokens;
    }
    
    if (newConfig.apiKey) {
        config.apiKey = newConfig.apiKey;
    }
    
    console.log('✅ LLM service configuration updated');
}

/**
 * Test API connection
 */
function testConnection() {
    return callLLM("Hello! Please respond with 'Connection successful' if you can read this.")
        .then(response => ({
            success: true,
            message: 'Connection successful',
            model: config.model,
            response: response.content.substring(0, 100)
        }))
        .catch(error => ({
            success: false,
            message: 'Connection failed',
            error: error.message
        }));
}

// Export all functions
module.exports = {
    callLLM,
    callLLMWithFallback,
    generateFallbackResponse,
    generateMockResponse,
    getUsageStats,
    resetUsageStats,
    updateConfig,
    testConnection,
    getApiConfig,
    getCurrentModel,
    getCurrentApiKey,
    buildRequestBody,
    parseResponse
};
