// Initialize Terminal
const term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Consolas, "Courier New", monospace',
    theme: {
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: '#364364'
    }
});

const fs = new FileSystem();
const cmdProcessor = new CommandProcessor(term, fs);

term.open(document.getElementById('terminal'));

// Helper function to find longest common prefix among strings
function getLongestCommonPrefix(strings) {
    if (strings.length === 0) return '';
    if (strings.length === 1) return strings[0];
    
    let prefix = '';
    const firstString = strings[0];
    
    for (let i = 0; i < firstString.length; i++) {
        const char = firstString[i];
        if (strings.every(str => str[i] === char)) {
            prefix += char;
        } else {
            break;
        }
    }
    
    return prefix;
}

// Function to measure actual character dimensions
function measureCharacterDimensions() {
    const testElement = document.createElement('div');
    testElement.style.fontFamily = 'Consolas, "Courier New", monospace';
    testElement.style.fontSize = '14px';
    testElement.style.position = 'absolute';
    testElement.style.left = '-9999px';
    testElement.style.visibility = 'hidden';
    testElement.style.whiteSpace = 'pre';
    testElement.textContent = 'W'; // Use a wide character for measurement
    
    document.body.appendChild(testElement);
    const width = testElement.getBoundingClientRect().width;
    const height = testElement.getBoundingClientRect().height;
    document.body.removeChild(testElement);
    
    return { width: width || 8.4, height: height || 17 };
}

// Function to fit terminal to container
function fitTerminal() {
    const terminalElement = document.getElementById('terminal');
    const rect = terminalElement.getBoundingClientRect();
    
    // Try to get actual character dimensions from the terminal's renderer
    const core = term._core;
    let charWidth, charHeight;
    
    if (core && core._renderService && core._renderService.dimensions) {
        const dims = core._renderService.dimensions;
        charWidth = dims.actualCellWidth;
        charHeight = dims.actualCellHeight;
    } else {
        // Measure character dimensions if terminal renderer not available
        const measured = measureCharacterDimensions();
        charWidth = measured.width;
        charHeight = measured.height;
    }
    
    // Add small padding to prevent cutoff
    const cols = Math.floor((rect.width - 4) / charWidth);
    const rows = Math.floor((rect.height - 4) / charHeight);
    
    if (cols > 0 && rows > 0) {
        term.resize(cols, rows);
    }
}

// Initial fit with multiple attempts to ensure proper sizing
setTimeout(fitTerminal, 0);
setTimeout(fitTerminal, 100);
setTimeout(fitTerminal, 500);

// Welcome message
term.writeln('Red Hat Enterprise Linux 9.0 (Plow)');
term.writeln('Kernel 5.14.0-70.13.1.el9_0.x86_64 on an x86_64');
term.writeln('');
term.writeln('proddb01sim login: root');
term.writeln('Password: ');
term.writeln('Last login: ' + new Date().toLocaleString());
term.writeln('');
term.writeln('Welcome to the Oracle Installation Practice Environment');
term.writeln('Type "oracle-help" for installation guide or "help" for available commands.');
term.writeln('Type "ocp" to check your Oracle installation progress.');
term.writeln('');

// Command input handling
let currentLine = '';
let cursorPosition = 0; // Track cursor position within current line
term.write(cmdProcessor.getPrompt());

term.onData(data => {
    // Check if we're in game mode
    if (cmdProcessor.gameActive) {
        switch (data) {
            case '\r': // Enter
            case '\n':
                term.write('\r\n');
                cmdProcessor.handleGameInput(currentLine);
                currentLine = '';
                cursorPosition = 0;
                if (!cmdProcessor.gameActive) {
                    term.write(cmdProcessor.getPrompt());
                }
                break;
            case '\u0003': // Ctrl+C
                term.write('^C\r\n');
                cmdProcessor.gameActive = false;
                currentLine = '';
                cursorPosition = 0;
                term.write(cmdProcessor.getPrompt());
                break;
            case '\u007F': // Backspace
            case '\b':
                if (currentLine.length > 0) {
                    currentLine = currentLine.slice(0, -1);
                    cursorPosition = currentLine.length;
                    term.write('\b \b');
                }
                break;
            default:
                if (data >= ' ' && data <= '~') {
                    currentLine += data;
                    cursorPosition = currentLine.length;
                    term.write(data);
                }
        }
        return;
    }
    
    // Check if we're waiting for game response
    if (cmdProcessor.waitingForGameResponse) {
        switch (data) {
            case '\r': // Enter
            case '\n':
                term.write('\r\n');
                if (currentLine.toLowerCase() === 'yes') {
                    cmdProcessor.waitingForGameResponse = false;
                    cmdProcessor.cmdTicTacToe();
                } else {
                    cmdProcessor.waitingForGameResponse = false;
                    term.write(cmdProcessor.getPrompt());
                }
                currentLine = '';
                cursorPosition = 0;
                break;
            case '\u007F': // Backspace
            case '\b':
                if (currentLine.length > 0) {
                    currentLine = currentLine.slice(0, -1);
                    cursorPosition = currentLine.length;
                    term.write('\b \b');
                }
                break;
            default:
                if (data >= ' ' && data <= '~') {
                    currentLine += data;
                    cursorPosition = currentLine.length;
                    term.write(data);
                }
        }
        return;
    }
    
    // Check if we're waiting for cp confirmation
    if (cmdProcessor.waitingForCpConfirmation) {
        switch (data) {
            case '\r': // Enter
            case '\n':
                term.write('\r\n');
                cmdProcessor.handleCpConfirmation(currentLine);
                currentLine = '';
                cursorPosition = 0;
                if (!cmdProcessor.waitingForCpConfirmation) {
                    term.write(cmdProcessor.getPrompt());
                }
                break;
            case '\u007F': // Backspace
            case '\b':
                if (currentLine.length > 0) {
                    currentLine = currentLine.slice(0, -1);
                    cursorPosition = currentLine.length;
                    term.write('\b \b');
                }
                break;
            default:
                if (data >= ' ' && data <= '~') {
                    currentLine += data;
                    cursorPosition = currentLine.length;
                    term.write(data);
                }
        }
        return;
    }
    
    // Check if we're waiting for mv confirmation
    if (cmdProcessor.waitingForMvConfirmation) {
        switch (data) {
            case '\r': // Enter
            case '\n':
                term.write('\r\n');
                cmdProcessor.handleMvConfirmation(currentLine);
                currentLine = '';
                cursorPosition = 0;
                if (!cmdProcessor.waitingForMvConfirmation) {
                    term.write(cmdProcessor.getPrompt());
                }
                break;
            case '\u007F': // Backspace
            case '\b':
                if (currentLine.length > 0) {
                    currentLine = currentLine.slice(0, -1);
                    cursorPosition = currentLine.length;
                    term.write('\b \b');
                }
                break;
            default:
                if (data >= ' ' && data <= '~') {
                    currentLine += data;
                    cursorPosition = currentLine.length;
                    term.write(data);
                }
        }
        return;
    }

    // Normal command processing
    switch (data) {
        case '\r': // Enter
        case '\n':
            term.write('\r\n');
            cmdProcessor.processCommand(currentLine);
            currentLine = '';
            cursorPosition = 0;
            term.write(cmdProcessor.getPrompt());
            break;
        case '\u0003': // Ctrl+C
            term.write('^C\r\n');
            currentLine = '';
            cursorPosition = 0;
            term.write(cmdProcessor.getPrompt());
            break;
        case '\u007F': // Backspace
        case '\b':
            if (cursorPosition > 0) {
                // Remove character at cursor position - 1
                currentLine = currentLine.slice(0, cursorPosition - 1) + currentLine.slice(cursorPosition);
                cursorPosition--;
                
                // Redraw the line from cursor position
                const restOfLine = currentLine.slice(cursorPosition);
                term.write('\b' + restOfLine + ' \b');
                
                // Move cursor back to correct position
                for (let i = 0; i < restOfLine.length; i++) {
                    term.write('\b');
                }
            }
            break;
        case '\u001b[C': // Right arrow
            if (cursorPosition < currentLine.length) {
                cursorPosition++;
                term.write('\u001b[C'); // Move cursor right
            }
            break;
        case '\u001b[D': // Left arrow
            if (cursorPosition > 0) {
                cursorPosition--;
                term.write('\u001b[D'); // Move cursor left
            }
            break;
        case '\u001b[A': // Up arrow
            if (cmdProcessor.historyIndex > 0) {
                // Clear current line
                term.write('\r' + cmdProcessor.getPrompt() + ' '.repeat(currentLine.length));
                term.write('\r' + cmdProcessor.getPrompt());
                
                cmdProcessor.historyIndex--;
                currentLine = cmdProcessor.history[cmdProcessor.historyIndex];
                cursorPosition = currentLine.length; // Set cursor to end of line
                term.write(currentLine);
            }
            break;
        case '\u001b[B': // Down arrow
            if (cmdProcessor.historyIndex < cmdProcessor.history.length - 1) {
                // Clear current line
                term.write('\r' + cmdProcessor.getPrompt() + ' '.repeat(currentLine.length));
                term.write('\r' + cmdProcessor.getPrompt());
                
                cmdProcessor.historyIndex++;
                currentLine = cmdProcessor.history[cmdProcessor.historyIndex];
                cursorPosition = currentLine.length; // Set cursor to end of line
                term.write(currentLine);
            } else if (cmdProcessor.historyIndex === cmdProcessor.history.length - 1) {
                // Clear current line and go to empty line
                term.write('\r' + cmdProcessor.getPrompt() + ' '.repeat(currentLine.length));
                term.write('\r' + cmdProcessor.getPrompt());
                
                cmdProcessor.historyIndex++;
                currentLine = '';
                cursorPosition = 0;
            }
            break;
        case '\t': // Tab (autocomplete for commands and directories)
            const parts = currentLine.trim().split(/\s+/);
            
            if (parts.length === 1) {
                // Command completion
                const commands = ['ls', 'cd', 'pwd', 'mkdir', 'touch', 'rm', 'cp', 'mv', 'chmod', 'chown', 'cat', 'echo', 
                                'clear', 'hostname', 'uname', 'whoami', 'date', 'df', 
                                'free', 'ps', 'yum', 'dnf', 'systemctl', 'firewall-cmd', 
                                'setenforce', 'getenforce', 'sestatus', 'setsebool', 'set', 'unset', 'export', 'env', 
                                'groupadd', 'useradd', 'passwd', 'id', 'su', 'vim', 'vi', 'nano', 
                                'exit', 'oracle-help', 'help', 'runInstaller', './runInstaller',
                                'dbca', 'netca', 'lsnrctl', 'sqlplus', 'adrci', 'rman',
                                'srvctl', 'orapwd', 'tnsping', 'expdp', 'impdp', 'oraenv',
                                'unzip', 'sysctl', 'ps-help', './ArcGIS_Server_Setup',
                                'reboot', 'ocp', 'tictactoe', 'tic-tac-toe', 'whereis',
                                'grep', 'head', 'tail', 'sort', 'uniq', 'wc', 'ldconfig',
                                'troubleshoot', 'oracle-troubleshoot', 'service'];
                
                // Add executable files from current directory
                const files = fs.ls('.');
                if (files) {
                    files.forEach(file => {
                        if (file.type === 'file' && cmdProcessor.isExecutable(file.name)) {
                            // Add both with and without ./ prefix
                            commands.push(file.name);
                            commands.push('./' + file.name);
                        }
                    });
                }
                
                const matches = commands.filter(cmd => cmd.startsWith(currentLine));
                if (matches.length === 1) {
                    const completion = matches[0].slice(currentLine.length);
                    currentLine += completion;
                    cursorPosition = currentLine.length;
                    term.write(completion);
                } else if (matches.length > 1) {
                    // Find longest common prefix
                    const commonPrefix = getLongestCommonPrefix(matches);
                    const completion = commonPrefix.slice(currentLine.length);
                    
                    if (completion.length > 0) {
                        // Complete to common prefix
                        currentLine += completion;
                        cursorPosition = currentLine.length;
                        term.write(completion);
                    } else {
                        // Show all matches if no additional common prefix
                        term.write('\r\n');
                        term.write(matches.join('  '));
                        term.write('\r\n');
                        term.write(cmdProcessor.getPrompt() + currentLine);
                    }
                }
            } else {
                // Directory/file completion
                const lastPart = parts[parts.length - 1];
                let searchPath = '.';
                let prefix = '';
                
                // Check if the last part contains a path
                if (lastPart.includes('/')) {
                    const lastSlash = lastPart.lastIndexOf('/');
                    searchPath = lastPart.substring(0, lastSlash) || '/';
                    prefix = lastPart.substring(0, lastSlash + 1);
                    const searchTerm = lastPart.substring(lastSlash + 1);
                    
                    // Get files in the directory
                    const files = fs.ls(searchPath);
                    if (files) {
                        const matches = files
                            .map(f => f.name)
                            .filter(name => name.startsWith(searchTerm));
                        
                        if (matches.length === 1) {
                            const completion = matches[0].slice(searchTerm.length);
                            currentLine += completion;
                            cursorPosition = currentLine.length;
                            term.write(completion);
                            
                            // Add trailing slash for directories
                            const fullPath = searchPath === '/' ? `/${matches[0]}` : `${searchPath}/${matches[0]}`;
                            if (fs.isDirectory(fullPath)) {
                                currentLine += '/';
                                cursorPosition = currentLine.length;
                                term.write('/');
                            }
                        } else if (matches.length > 1) {
                            // Find longest common prefix
                            const commonPrefix = getLongestCommonPrefix(matches);
                            const completion = commonPrefix.slice(searchTerm.length);
                            
                            if (completion.length > 0) {
                                // Complete to common prefix
                                currentLine += completion;
                                cursorPosition = currentLine.length;
                                term.write(completion);
                            } else {
                                // Show all matches if no additional common prefix
                                term.write('\r\n');
                                term.write(matches.join('  '));
                                term.write('\r\n');
                                term.write(cmdProcessor.getPrompt() + currentLine);
                            }
                        }
                    }
                } else {
                    // Complete from current directory
                    const files = fs.ls('.');
                    if (files) {
                        const matches = files
                            .map(f => f.name)
                            .filter(name => name.startsWith(lastPart));
                        
                        if (matches.length === 1) {
                            const completion = matches[0].slice(lastPart.length);
                            currentLine += completion;
                            cursorPosition = currentLine.length;
                            term.write(completion);
                            
                            // Add trailing slash for directories
                            if (fs.isDirectory(matches[0])) {
                                currentLine += '/';
                                cursorPosition = currentLine.length;
                                term.write('/');
                            }
                        } else if (matches.length > 1) {
                            // Find longest common prefix
                            const commonPrefix = getLongestCommonPrefix(matches);
                            const completion = commonPrefix.slice(lastPart.length);
                            
                            if (completion.length > 0) {
                                // Complete to common prefix
                                currentLine += completion;
                                cursorPosition = currentLine.length;
                                term.write(completion);
                            } else {
                                // Show all matches if no additional common prefix
                                term.write('\r\n');
                                term.write(matches.join('  '));
                                term.write('\r\n');
                                term.write(cmdProcessor.getPrompt() + currentLine);
                            }
                        }
                    }
                }
            }
            break;
        default:
            if (data >= ' ' && data <= '~') {
                // Insert character at cursor position
                currentLine = currentLine.slice(0, cursorPosition) + data + currentLine.slice(cursorPosition);
                cursorPosition++;
                
                // Redraw line from cursor position
                const restOfLine = currentLine.slice(cursorPosition - 1);
                term.write(restOfLine);
                
                // Move cursor back to correct position
                for (let i = 0; i < restOfLine.length - 1; i++) {
                    term.write('\b');
                }
            }
    }
});

// Auto-copy selection to clipboard
term.onSelectionChange(() => {
    const selection = term.getSelection();
    if (selection && selection.trim().length > 0) {
        // Use the modern Clipboard API if available
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(selection).catch(err => {
                console.warn('Failed to copy selection to clipboard:', err);
            });
        } else {
            // Fallback for older browsers
            try {
                const textArea = document.createElement('textarea');
                textArea.value = selection;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            } catch (err) {
                console.warn('Failed to copy selection to clipboard:', err);
            }
        }
    }
});

// Debounced resize function to prevent excessive calls
let resizeTimeout;
function debouncedFitTerminal() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(fitTerminal, 100);
}

// Handle window resize
window.addEventListener('resize', debouncedFitTerminal);

// Also handle visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        setTimeout(fitTerminal, 50);
    }
});

// Handle when the page is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(fitTerminal, 100);
});

// Additional resize triggers for better compatibility
window.addEventListener('load', () => {
    setTimeout(fitTerminal, 200);
});

// Watch for changes in the terminal container size
if (window.ResizeObserver) {
    const terminalElement = document.getElementById('terminal');
    const resizeObserver = new ResizeObserver(() => {
        debouncedFitTerminal();
    });
    resizeObserver.observe(terminalElement);
}