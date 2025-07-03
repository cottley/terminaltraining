// Initialize Terminal
const term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Consolas, "Courier New", monospace',
    disableStdin: false,
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

// Function to calculate optimal columns based on viewport width
function calculateOptimalColumns(viewportWidth) {
    // Based on reverse engineering from actual measurements:
    // 1794px viewport = 230 columns
    // 2691px viewport = 346 columns
    // This gives us a character width of approximately 7.8px
    const CHAR_WIDTH = 7.8;
    
    return Math.floor(viewportWidth / CHAR_WIDTH);
}

// Function to fit terminal to container
function fitTerminal() {
    const terminalElement = document.getElementById('terminal');
    
    // Calculate available space dynamically - use full window width
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Use full width - no buffer needed since we have 2px left padding in CSS
    const headerHeight = document.getElementById('terminal-header').offsetHeight || 40;
    const bufferHeight = 10;    // Buffer for height only
    
    // Calculate actual available dimensions - use full width
    const availableWidth = windowWidth;
    const availableHeight = windowHeight - headerHeight - bufferHeight;
    
    // Set the terminal container size to full width
    terminalElement.style.width = availableWidth + 'px';
    terminalElement.style.height = availableHeight + 'px';
    
    // Calculate optimal columns using reverse-engineered function
    const cols = calculateOptimalColumns(availableWidth);
    
    // Calculate rows using standard character height
    const charHeight = 17; // Line height for 14px Consolas
    const rows = Math.floor(availableHeight / charHeight);
    
    if (cols > 0 && rows > 0) {
        term.resize(cols, rows);
        
        // Force scrollbar positioning after xterm.js has finished
        setTimeout(() => {
            forceScrollbarPosition();
        }, 100);
    }
}

// Function to force scrollbar positioning
function forceScrollbarPosition() {
    const terminalElement = document.getElementById('terminal');
    const xtermViewport = terminalElement.querySelector('.xterm-viewport');
    
    if (xtermViewport) {
        // Override xterm.js -10px margin with 0px
        xtermViewport.style.removeProperty('margin-right');
        xtermViewport.style.setProperty('margin-right', '0px', 'important');
    }
}

// Initial fit
setTimeout(fitTerminal, 100);

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
let currentRow = 0; // Track current row (0-based relative to prompt)
let currentCol = 0; // Track current column (0-based)
let promptStartRow = 0; // Track absolute row where prompt starts
term.write(cmdProcessor.getPrompt());

// Calculate initial cursor position after prompt
const initialPrompt = cmdProcessor.getPrompt();
currentCol = initialPrompt.length;

// Helper function to update cursor position tracking
function updateCursorPosition() {
    const prompt = cmdProcessor.getPrompt();
    const terminalWidth = term.cols;
    
    // Calculate which character position the cursor is at
    const cursorAt = prompt.length + cursorPosition;
    
    // Calculate row and column based on terminal width
    currentRow = Math.floor(cursorAt / terminalWidth);
    currentCol = cursorAt % terminalWidth;
}

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
            // Reset cursor tracking for new prompt
            const newPrompt = cmdProcessor.getPrompt();
            currentCol = newPrompt.length;
            currentRow = 0;
            break;
        case '\u0003': // Ctrl+C
            term.write('^C\r\n');
            currentLine = '';
            cursorPosition = 0;
            term.write(cmdProcessor.getPrompt());
            // Reset cursor tracking for new prompt
            const ctrlCPrompt = cmdProcessor.getPrompt();
            currentCol = ctrlCPrompt.length;
            currentRow = 0;
            break;
        case '\u007F': // Backspace
        case '\b':
            if (cursorPosition > 0) {
                // Remove character at cursor position - 1
                currentLine = currentLine.slice(0, cursorPosition - 1) + currentLine.slice(cursorPosition);
                cursorPosition--;
                
                // Check cursor position BEFORE deletion to see if we were at beginning of wrapped line
                // Use early wrap logic (term.cols - 1) to match input behavior
                const prompt = cmdProcessor.getPrompt();
                const cursorAtBeforeDeletion = prompt.length + cursorPosition + 1; // +1 because we just decremented
                const wasAtBeginningOfWrappedLine = (cursorAtBeforeDeletion > 0 && cursorAtBeforeDeletion % (term.cols - 1) === 0);
                
                // Check if we're in password input mode
                if (cmdProcessor.waitingForPassword) {
                    // Don't show any visual feedback for password backspace
                    // Just silently remove the character
                    updateCursorPosition();
                    return;
                } else {
                    // Update cursor position after deletion to determine display strategy
                    updateCursorPosition();
                    
                    // Check if we need to move to previous line
                    if (wasAtBeginningOfWrappedLine) {
                        // We need to delete an additional character since we were at beginning of wrapped line
                        if (currentLine.length > cursorPosition) {
                            // Delete one more character from the current line
                            currentLine = currentLine.slice(0, cursorPosition) + currentLine.slice(cursorPosition + 1);
                        }
                        
                        // Move cursor up one line and to the position where wrapped character was
                        term.write('\u001b[A'); // Move up one line
                        term.write('\u001b[' + (term.cols - 1) + 'C'); // Move to position where wrapped character was
                        
                        // Delete the character at this position and clear the space
                        term.write('\b'); // Move back one character
                        
                        // Now write any remaining text from current position and clear the extra character
                        const restOfLine = currentLine.slice(cursorPosition);
                        term.write(restOfLine + ' '); // Add space to clear the last character visually
                        
                        // Move cursor back to correct position (where the deleted character was)
                        for (let i = 0; i < restOfLine.length + 1; i++) { // +1 for the extra space
                            term.write('\b');
                        }
                    } else {
                        // Normal backspace handling (same line)
                        const restOfLine = currentLine.slice(cursorPosition);
                        term.write('\b' + restOfLine + ' \b');
                        
                        // Move cursor back to correct position
                        for (let i = 0; i < restOfLine.length; i++) {
                            term.write('\b');
                        }
                    }
                }
            }
            break;
        case '\u001b[C': // Right arrow
            if (!cmdProcessor.waitingForPassword && cursorPosition < currentLine.length) {
                cursorPosition++;
                term.write('\u001b[C'); // Move cursor right
            }
            break;
        case '\u001b[D': // Left arrow
            if (!cmdProcessor.waitingForPassword && cursorPosition > 0) {
                cursorPosition--;
                term.write('\u001b[D'); // Move cursor left
            }
            break;
        case '\u001b[A': // Up arrow
            if (!cmdProcessor.waitingForPassword) {
                const prompt = cmdProcessor.getPrompt();
                const isSqlMode = prompt === 'SQL> ';
                const isRmanMode = prompt === 'RMAN> ';
                
                if (isSqlMode) {
                    // Use SQL history in SQL mode
                    if (cmdProcessor.sqlHistoryIndex > 0) {
                        // Clear current line
                        term.write('\r' + prompt + ' '.repeat(currentLine.length));
                        term.write('\r' + prompt);
                        
                        cmdProcessor.sqlHistoryIndex--;
                        currentLine = cmdProcessor.sqlHistory[cmdProcessor.sqlHistoryIndex];
                        cursorPosition = currentLine.length; // Set cursor to end of line
                        term.write(currentLine);
                    }
                } else if (isRmanMode) {
                    // Use RMAN history in RMAN mode
                    if (cmdProcessor.rmanHistoryIndex > 0) {
                        // Clear current line
                        term.write('\r' + prompt + ' '.repeat(currentLine.length));
                        term.write('\r' + prompt);
                        
                        cmdProcessor.rmanHistoryIndex--;
                        currentLine = cmdProcessor.rmanHistory[cmdProcessor.rmanHistoryIndex];
                        cursorPosition = currentLine.length; // Set cursor to end of line
                        term.write(currentLine);
                    }
                } else {
                    // Use bash history in bash mode
                    if (cmdProcessor.historyIndex > 0) {
                        // Clear current line
                        term.write('\r' + prompt + ' '.repeat(currentLine.length));
                        term.write('\r' + prompt);
                        
                        cmdProcessor.historyIndex--;
                        currentLine = cmdProcessor.history[cmdProcessor.historyIndex];
                        cursorPosition = currentLine.length; // Set cursor to end of line
                        term.write(currentLine);
                    }
                }
            }
            break;
        case '\u001b[B': // Down arrow
            if (!cmdProcessor.waitingForPassword) {
                const prompt = cmdProcessor.getPrompt();
                const isSqlMode = prompt === 'SQL> ';
                const isRmanMode = prompt === 'RMAN> ';
                
                if (isSqlMode) {
                    // Use SQL history in SQL mode
                    if (cmdProcessor.sqlHistoryIndex < cmdProcessor.sqlHistory.length - 1) {
                        // Clear current line
                        term.write('\r' + prompt + ' '.repeat(currentLine.length));
                        term.write('\r' + prompt);
                        
                        cmdProcessor.sqlHistoryIndex++;
                        currentLine = cmdProcessor.sqlHistory[cmdProcessor.sqlHistoryIndex];
                        cursorPosition = currentLine.length; // Set cursor to end of line
                        term.write(currentLine);
                    } else if (cmdProcessor.sqlHistoryIndex === cmdProcessor.sqlHistory.length - 1) {
                        // Clear current line and go to empty line
                        term.write('\r' + prompt + ' '.repeat(currentLine.length));
                        term.write('\r' + prompt);
                        
                        cmdProcessor.sqlHistoryIndex++;
                        currentLine = '';
                        cursorPosition = 0;
                    }
                } else if (isRmanMode) {
                    // Use RMAN history in RMAN mode
                    if (cmdProcessor.rmanHistoryIndex < cmdProcessor.rmanHistory.length - 1) {
                        // Clear current line
                        term.write('\r' + prompt + ' '.repeat(currentLine.length));
                        term.write('\r' + prompt);
                        
                        cmdProcessor.rmanHistoryIndex++;
                        currentLine = cmdProcessor.rmanHistory[cmdProcessor.rmanHistoryIndex];
                        cursorPosition = currentLine.length; // Set cursor to end of line
                        term.write(currentLine);
                    } else if (cmdProcessor.rmanHistoryIndex === cmdProcessor.rmanHistory.length - 1) {
                        // Clear current line and go to empty line
                        term.write('\r' + prompt + ' '.repeat(currentLine.length));
                        term.write('\r' + prompt);
                        
                        cmdProcessor.rmanHistoryIndex++;
                        currentLine = '';
                        cursorPosition = 0;
                    }
                } else {
                    // Use bash history in bash mode
                    if (cmdProcessor.historyIndex < cmdProcessor.history.length - 1) {
                        // Clear current line
                        term.write('\r' + prompt + ' '.repeat(currentLine.length));
                        term.write('\r' + prompt);
                        
                        cmdProcessor.historyIndex++;
                        currentLine = cmdProcessor.history[cmdProcessor.historyIndex];
                        cursorPosition = currentLine.length; // Set cursor to end of line
                        term.write(currentLine);
                    } else if (cmdProcessor.historyIndex === cmdProcessor.history.length - 1) {
                        // Clear current line and go to empty line
                        term.write('\r' + prompt + ' '.repeat(currentLine.length));
                        term.write('\r' + prompt);
                        
                        cmdProcessor.historyIndex++;
                        currentLine = '';
                        cursorPosition = 0;
                    }
                }
            }
            break;
        case '\t': // Tab (autocomplete for commands and directories)
            if (cmdProcessor.waitingForPassword) {
                // Disable tab completion during password input
                break;
            }
            const parts = currentLine.trim().split(/\s+/);
            const hasTrailingSpace = currentLine.endsWith(' ');
            
            if (parts.length === 1 && !hasTrailingSpace) {
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
                                'troubleshoot', 'oracle-troubleshoot', 'service', 'xterm'];
                
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
                let lastPart;
                if (hasTrailingSpace && parts.length === 1) {
                    // cd + space case: treat as empty string for completion
                    lastPart = '';
                } else {
                    lastPart = parts[parts.length - 1];
                }
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
                        let matches = files
                            .map(f => f.name)
                            .filter(name => name.startsWith(searchTerm));
                        
                        // For cd command, only show directories
                        const firstCommand = parts[0].toLowerCase();
                        if (firstCommand === 'cd') {
                            matches = matches.filter(name => {
                                const fullPath = searchPath === '/' ? `/${name}` : `${searchPath}/${name}`;
                                return fs.isDirectory(fullPath);
                            });
                        }
                        
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
                        let matches = files
                            .map(f => f.name)
                            .filter(name => name.startsWith(lastPart));
                        
                        // For cd command, only show directories
                        const firstCommand = parts[0].toLowerCase();
                        if (firstCommand === 'cd') {
                            matches = matches.filter(name => fs.isDirectory(name));
                        }
                        
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
                
                // Check if we're in password input mode
                if (cmdProcessor.waitingForPassword) {
                    // Don't echo the character for password input
                    // Just move the cursor forward silently
                    updateCursorPosition();
                    return;
                } else {
                    // Simple approach: just write the character
                    // Let xterm.js handle cursor positioning naturally for paste
                    term.write(data);
                    
                    // Update cursor position tracking
                    updateCursorPosition();
                    
                    // Only apply custom wrapping logic when adding at end of line
                    const restOfLine = currentLine.slice(cursorPosition);
                    if (restOfLine.length === 0) {
                        const prompt = cmdProcessor.getPrompt();
                        const totalChars = prompt.length + cursorPosition;
                        if (totalChars > 0 && totalChars % (term.cols - 1) === 0) {
                            term.write('\u001b[B'); // Move cursor down one line
                            term.write('\r'); // Move to beginning of line
                        }
                    }
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

// Handle window resize
window.addEventListener('resize', () => {
    setTimeout(() => {
        fitTerminal();
        // Force scrollbar positioning again after resize
        setTimeout(forceScrollbarPosition, 50);
    }, 100);
});

// Also handle visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        setTimeout(() => {
            fitTerminal();
            setTimeout(forceScrollbarPosition, 50);
        }, 100);
    }
});