const fs = require('fs');
const path = require('path');

// Global variables for document storage
let documents = [];
let chunks = [];
let embeddings = [];

// Configuration
const config = {
    chunkSize: 300,
    chunkOverlap: 50
};

/**
 * Load documents from the JSON file
 */
function loadDocuments() {
    try {
        const docsPath = path.join(__dirname, '../data/docs.json');
        const rawData = fs.readFileSync(docsPath, 'utf8');
        documents = JSON.parse(rawData);
        console.log(`✅ Loaded ${documents.length} documents`);
        return documents;
    } catch (error) {
        console.error('❌ Error loading documents:', error.message);
        throw new Error('Failed to load documents');
    }
}

/**
 * Split text into chunks based on word count
 */
function chunkText(text, chunkSize = config.chunkSize, overlap = config.chunkOverlap) {
    const words = text.split(' ');
    const chunks = [];
    
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        chunks.push(chunk);
        
        // Stop if we've reached the end
        if (i + chunkSize >= words.length) {
            break;
        }
    }
    
    return chunks;
}

/**
 * Process all documents into chunks with metadata
 */
function processDocuments() {
    chunks = [];
    
    documents.forEach((doc, docIndex) => {
        const textChunks = chunkText(doc.content);
        
        textChunks.forEach((chunk, chunkIndex) => {
            chunks.push({
                id: `doc_${docIndex}_chunk_${chunkIndex}`,
                documentTitle: doc.title,
                documentIndex: docIndex,
                chunkIndex: chunkIndex,
                content: chunk,
                wordCount: chunk.split(' ').length,
                metadata: {
                    source: 'docs.json',
                    title: doc.title,
                    chunkId: `doc_${docIndex}_chunk_${chunkIndex}`
                }
            });
        });
    });
    
    console.log(`✅ Processed ${documents.length} documents into ${chunks.length} chunks`);
    return chunks;
}

/**
 * Generate mock embedding (1536 dimensions like OpenAI)
 */
function generateMockEmbedding() {
    const dimensions = 1536;
    const embedding = [];
    
    for (let i = 0; i < dimensions; i++) {
        embedding.push(Math.random() * 2 - 1); // Random values between -1 and 1
    }
    
    return embedding;
}

/**
 * Generate embeddings for all chunks
 */
function generateEmbeddings(chunksToProcess = chunks) {
    console.log('🔄 Generating embeddings for chunks...');
    
    // Generate mock embeddings for each chunk
    const chunksWithEmbeddings = chunksToProcess.map(chunk => ({
        ...chunk,
        embedding: generateMockEmbedding()
    }));
    
    embeddings = chunksWithEmbeddings;
    console.log(`✅ Generated embeddings for ${chunksWithEmbeddings.length} chunks`);
    return chunksWithEmbeddings;
}

/**
 * Save chunks with embeddings to file
 */
function saveVectorStore(filename = 'vectorStore.json') {
    try {
        const vectorStorePath = path.join(__dirname, '../data', filename);
        const data = {
            chunks: embeddings,
            metadata: {
                totalDocuments: documents.length,
                totalChunks: chunks.length,
                embeddingDimensions: 1536,
                createdAt: new Date().toISOString()
            }
        };
        
        fs.writeFileSync(vectorStorePath, JSON.stringify(data, null, 2));
        console.log(`✅ Saved vector store to ${filename}`);
        return vectorStorePath;
    } catch (error) {
        console.error('❌ Error saving vector store:', error.message);
        throw new Error('Failed to save vector store');
    }
}

/**
 * Load vector store from file
 */
function loadVectorStore(filename = 'vectorStore.json') {
    try {
        const vectorStorePath = path.join(__dirname, '../data', filename);
        
        if (!fs.existsSync(vectorStorePath)) {
            console.log('⚠️ Vector store file not found, creating new one...');
            loadDocuments();
            processDocuments();
            generateEmbeddings();
            saveVectorStore(filename);
        }
        
        const rawData = fs.readFileSync(vectorStorePath, 'utf8');
        const data = JSON.parse(rawData);
        
        embeddings = data.chunks;
        console.log(`✅ Loaded vector store with ${data.chunks.length} embeddings`);
        return data;
    } catch (error) {
        console.error('❌ Error loading vector store:', error.message);
        throw new Error('Failed to load vector store');
    }
}

/**
 * Get all chunks with embeddings
 */
function getChunksWithEmbeddings() {
    return embeddings;
}

/**
 * Get document statistics
 */
function getStatistics() {
    return {
        totalDocuments: documents.length,
        totalChunks: chunks.length,
        averageChunkSize: chunks.length > 0 ? 
            Math.round(chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0) / chunks.length) : 0,
        embeddingDimensions: 1536
    };
}

/**
 * Initialize the document manager
 */
function initialize() {
    console.log('🚀 Initializing Document Manager...');
    loadVectorStore();
    console.log('✅ Document Manager initialized');
}

// Export all functions
module.exports = {
    loadDocuments,
    chunkText,
    processDocuments,
    generateEmbeddings,
    saveVectorStore,
    loadVectorStore,
    getChunksWithEmbeddings,
    getStatistics,
    initialize
};
