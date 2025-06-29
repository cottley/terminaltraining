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

// Function to fit terminal to container
function fitTerminal() {
    const terminalElement = document.getElementById('terminal');
    const rect = terminalElement.getBoundingClientRect();
    const cols = Math.floor(rect.width / 9);  // Approximate character width
    const rows = Math.floor(rect.height / 17); // Approximate character height
    
    if (cols > 0 && rows > 0) {
        term.resize(cols, rows);
    }
}

// Initial fit
setTimeout(fitTerminal, 0);

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
                if (!cmdProcessor.gameActive) {
                    term.write(cmdProcessor.getPrompt());
                }
                break;
            case '\u0003': // Ctrl+C
                term.write('^C\r\n');
                cmdProcessor.gameActive = false;
                currentLine = '';
                term.write(cmdProcessor.getPrompt());
                break;
            case '\u007F': // Backspace
            case '\b':
                if (currentLine.length > 0) {
                    currentLine = currentLine.slice(0, -1);
                    term.write('\b \b');
                }
                break;
            default:
                if (data >= ' ' && data <= '~') {
                    currentLine += data;
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
                break;
            case '\u007F': // Backspace
            case '\b':
                if (currentLine.length > 0) {
                    currentLine = currentLine.slice(0, -1);
                    term.write('\b \b');
                }
                break;
            default:
                if (data >= ' ' && data <= '~') {
                    currentLine += data;
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
            term.write(cmdProcessor.getPrompt());
            break;
        case '\u0003': // Ctrl+C
            term.write('^C\r\n');
            currentLine = '';
            term.write(cmdProcessor.getPrompt());
            break;
        case '\u007F': // Backspace
        case '\b':
            if (currentLine.length > 0) {
                currentLine = currentLine.slice(0, -1);
                term.write('\b \b');
            }
            break;
        case '\u001b[A': // Up arrow
            if (cmdProcessor.historyIndex > 0) {
                // Clear current line
                term.write('\r' + cmdProcessor.getPrompt() + ' '.repeat(currentLine.length));
                term.write('\r' + cmdProcessor.getPrompt());
                
                cmdProcessor.historyIndex--;
                currentLine = cmdProcessor.history[cmdProcessor.historyIndex];
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
                term.write(currentLine);
            }
            break;
        case '\t': // Tab (autocomplete for commands and directories)
            const parts = currentLine.trim().split(/\s+/);
            
            if (parts.length === 1) {
                // Command completion
                const commands = ['ls', 'cd', 'pwd', 'mkdir', 'touch', 'rm', 'cat', 'echo', 
                                'clear', 'hostname', 'uname', 'whoami', 'date', 'df', 
                                'free', 'ps', 'yum', 'dnf', 'systemctl', 'firewall-cmd', 
                                'setenforce', 'getenforce', 'set', 'unset', 'export', 'env', 
                                'groupadd', 'useradd', 'passwd', 'id', 'su', 'vim', 'vi', 
                                'exit', 'oracle-help', 'help', 'runInstaller', './runInstaller',
                                'dbca', 'netca', 'lsnrctl', 'sqlplus', 'adrci', 'rman',
                                'srvctl', 'orapwd', 'tnsping', 'expdp', 'impdp', 'oraenv',
                                'unzip', 'sysctl', 'ps-help', './ArcGIS_Server_Setup',
                                'reboot', 'ocp', 'tictactoe', 'tic-tac-toe'];
                
                const matches = commands.filter(cmd => cmd.startsWith(currentLine));
                if (matches.length === 1) {
                    const completion = matches[0].slice(currentLine.length);
                    currentLine += completion;
                    term.write(completion);
                } else if (matches.length > 1) {
                    term.write('\r\n');
                    term.write(matches.join('  '));
                    term.write('\r\n');
                    term.write(cmdProcessor.getPrompt() + currentLine);
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
                            term.write(completion);
                            
                            // Add trailing slash for directories
                            const fullPath = searchPath === '/' ? `/${matches[0]}` : `${searchPath}/${matches[0]}`;
                            if (fs.isDirectory(fullPath)) {
                                currentLine += '/';
                                term.write('/');
                            }
                        } else if (matches.length > 1) {
                            term.write('\r\n');
                            term.write(matches.join('  '));
                            term.write('\r\n');
                            term.write(cmdProcessor.getPrompt() + currentLine);
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
                            term.write(completion);
                            
                            // Add trailing slash for directories
                            if (fs.isDirectory(matches[0])) {
                                currentLine += '/';
                                term.write('/');
                            }
                        } else if (matches.length > 1) {
                            term.write('\r\n');
                            term.write(matches.join('  '));
                            term.write('\r\n');
                            term.write(cmdProcessor.getPrompt() + currentLine);
                        }
                    }
                }
            }
            break;
        default:
            if (data >= ' ' && data <= '~') {
                currentLine += data;
                term.write(data);
            }
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    fitTerminal();
});

// Also handle visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        fitTerminal();
    }
});