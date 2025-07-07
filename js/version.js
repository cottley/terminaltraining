// Version information for Terminal Training Environment
const VERSION_INFO = {
    version: '1.1',
    build: '20250707112957',
    creator: 'Christopher Ottley',
    coCreator: 'Claude.ai'
};

// Export for both CommonJS and ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VERSION_INFO;
} else {
    window.VERSION_INFO = VERSION_INFO;
}