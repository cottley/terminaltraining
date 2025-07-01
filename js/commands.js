// Terminal Command Processor
class CommandProcessor {
    constructor(terminal, fs) {
        this.terminal = terminal;
        this.fs = fs;
        this.history = [];
        this.historyIndex = -1;
        this.loadHistory();
        this.currentCommand = '';
        this.userStack = ['root']; // Stack to track user changes
        this.vimModal = null; // Reference to vim modal
        this.currentEditingFile = null; // Track currently editing file
        this.environmentVars = {
            'ORACLE_BASE': '/u01/app/oracle',
            'ORACLE_HOME': '/u01/app/oracle/product/19.0.0/dbhome_1',
            'ORACLE_SID': 'ORCL',
            'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
            'HOME': '/root',
            'USER': 'root',
            'SHELL': '/bin/bash',
            'TERM': 'xterm-256color',
            'LANG': 'en_US.UTF-8'
        };
        // SELinux state management
        this.selinuxState = {
            currentMode: 'permissive', // Current runtime mode
            configMode: 'permissive'   // Mode set in /etc/selinux/config
        };
        this.loadSelinuxState();
        
        // Package management state
        this.installedPackages = {
            // Pre-installed base system packages
            'kernel': { version: '5.14.0-70.13.1.el9_0', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'systemd': { version: '249-7.el9', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'bash': { version: '5.1.8-4.el9', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'coreutils': { version: '8.32-31.el9', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'glibc': { version: '2.34-28.el9', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'rpm': { version: '4.16.1.3-12.el9', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'yum': { version: '4.10.0-5.el9', repo: 'rhel-9-baseos', arch: 'noarch' },
            'dnf': { version: '4.10.0-5.el9', repo: 'rhel-9-baseos', arch: 'noarch' }
        };
        this.loadPackageState();
        
        // Service management state
        this.serviceStates = {
            'firewalld': { status: 'active', enabled: true },
            'sshd': { status: 'active', enabled: true },
            'chronyd': { status: 'active', enabled: true },
            'httpd': { status: 'inactive', enabled: false },
            'oracle-db': { status: 'inactive', enabled: false },
            'oracle-listener': { status: 'inactive', enabled: false }
        };
        this.loadServiceStates();
        
        // Restore preserved /root folder contents after reboot
        this.restoreRootFolder();
        
        this.initializeVimModal();
    }

    loadHistory() {
        try {
            const savedHistory = localStorage.getItem('terminalCommandHistory');
            if (savedHistory) {
                this.history = JSON.parse(savedHistory);
                this.historyIndex = this.history.length;
            }
        } catch (e) {
            // If there's an error loading history, start with empty history
            this.history = [];
            this.historyIndex = -1;
        }
    }

    saveHistory() {
        try {
            localStorage.setItem('terminalCommandHistory', JSON.stringify(this.history));
        } catch (e) {
            // Silently fail if localStorage is not available
        }
    }

    clearHistory() {
        this.history = [];
        this.historyIndex = -1;
        try {
            localStorage.removeItem('terminalCommandHistory');
        } catch (e) {
            // Silently fail if localStorage is not available
        }
    }

    initializeVimModal() {
        this.vimModal = document.getElementById('vimModal');
        const vimEditor = document.getElementById('vimEditor');
        const vimStatus = document.getElementById('vimStatus');
        
        // Handle keyboard shortcuts
        vimEditor.addEventListener('keydown', (e) => {
            // Ctrl+S - Save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveVimFile(false);
            }
            // Ctrl+Q - Save and Quit
            else if (e.ctrlKey && e.key === 'q') {
                e.preventDefault();
                this.saveVimFile(true);
            }
            // ESC - Exit without saving
            else if (e.key === 'Escape') {
                e.preventDefault();
                this.closeVimModal(false);
            }
        });
    }

    saveVimFile(shouldClose) {
        const vimEditor = document.getElementById('vimEditor');
        const vimStatus = document.getElementById('vimStatus');
        const content = vimEditor.value;
        
        if (this.currentEditingFile) {
            // Check if file exists
            if (this.fs.exists(this.currentEditingFile)) {
                // Update existing file
                this.fs.updateFile(this.currentEditingFile, content);
            } else {
                // Create new file
                this.fs.touch(this.currentEditingFile, content);
            }
            
            vimStatus.textContent = 'File saved!';
            
            // Refresh Oracle state if relevant files were modified
            if (this.currentEditingFile === '/etc/passwd' || 
                this.currentEditingFile === '/etc/group' ||
                this.currentEditingFile === '/etc/sysctl.conf' ||
                this.currentEditingFile === '/etc/security/limits.conf') {
                this.refreshOracleState();
            }
            
            if (shouldClose) {
                setTimeout(() => {
                    this.closeVimModal(true);
                }, 500);
            }
        }
    }

    closeVimModal(saved) {
        this.vimModal.style.display = 'none';
        this.currentEditingFile = null;
        
        // Refocus terminal
        this.terminal.focus();
        
        // No terminal output when exiting vi
    }

    openVimModal(filename, content = '') {
        const vimEditor = document.getElementById('vimEditor');
        const vimFileName = document.getElementById('vimFileName');
        const vimStatus = document.getElementById('vimStatus');
        
        this.currentEditingFile = filename;
        vimFileName.textContent = `VIM - ${filename}`;
        vimEditor.value = content;
        vimStatus.textContent = 'Ready';
        
        this.vimModal.style.display = 'block';
        vimEditor.focus();
    }

    processCommand(input) {
        this.history.push(input);
        this.historyIndex = this.history.length;
        this.saveHistory();
        
        // Handle pipes
        if (input.includes('|')) {
            this.processPipedCommand(input);
            return;
        }
        
        const parts = input.trim().split(/\s+/);
        const command = parts[0];
        const args = parts.slice(1);

        switch (command) {
            case '':
                break;
            case 'ls':
                this.cmdLs(args);
                break;
            case 'cd':
                this.cmdCd(args);
                break;
            case 'pwd':
                this.cmdPwd();
                break;
            case 'mkdir':
                this.cmdMkdir(args);
                break;
            case 'touch':
                this.cmdTouch(args);
                break;
            case 'rm':
                this.cmdRm(args);
                break;
            case 'cat':
                this.cmdCat(args);
                break;
            case 'grep':
                this.cmdGrep(args);
                break;
            case 'echo':
                this.cmdEcho(args);
                break;
            case 'clear':
                this.terminal.clear();
                break;
            case 'hostname':
                this.terminal.writeln('proddb01sim');
                break;
            case 'uname':
                this.cmdUname(args);
                break;
            case 'whoami':
                this.terminal.writeln(this.fs.currentUser);
                break;
            case 'date':
                this.terminal.writeln(new Date().toString());
                break;
            case 'df':
                this.cmdDf(args);
                break;
            case 'free':
                this.cmdFree(args);
                break;
            case 'ps':
                this.cmdPs(args);
                break;
            case 'yum':
            case 'dnf':
                this.cmdYum(args);
                break;
            case 'systemctl':
                this.cmdSystemctl(args);
                break;
            case 'firewall-cmd':
                this.cmdFirewall(args);
                break;
            case 'setenforce':
                this.cmdSetenforce(args);
                break;
            case 'getenforce':
                this.cmdGetenforce(args);
                break;
            case 'sestatus':
                this.cmdSestatus(args);
                break;
            case 'setsebool':
                this.cmdSetsebool(args);
                break;
            case 'set':
                this.cmdSet(args);
                break;
            case 'unset':
                this.cmdUnset(args);
                break;
            case 'export':
                this.cmdExport(args);
                break;
            case 'env':
                this.cmdEnv();
                break;
            case 'groupadd':
                this.cmdGroupadd(args);
                break;
            case 'useradd':
                this.cmdUseradd(args);
                break;
            case 'passwd':
                this.cmdPasswd(args);
                break;
            case 'id':
                this.cmdId(args);
                break;
            case 'su':
                this.cmdSu(args);
                break;
            case 'vim':
            case 'vi':
                this.cmdVim(args);
                break;
            case 'exit':
                this.cmdExit();
                break;
            case 'reboot':
                this.cmdReboot();
                break;
            case 'ocp':
                this.cmdOCP(args);
                break;
            case 'oracle-troubleshoot':
            case 'troubleshoot':
                this.cmdTroubleshoot(args);
                break;
            case 'tictactoe':
            case 'tic-tac-toe':
                this.cmdTicTacToe();
                break;
            case 'oracle-help':
                this.cmdOracleHelp();
                break;
            case 'whereis':
                this.cmdWhereis(args);
                break;
            case './ArcGIS_Server_Setup':
                this.cmdArcGISServerSetup(args);
                break;
            case 'help':
                this.cmdHelp();
                break;
            case 'ldconfig':
                this.cmdLdconfig(args);
                break;
            case 'service':
                this.cmdService(args);
                break;
            case 'cp':
                this.cmdCp(args);
                break;
            case 'mv':
                this.cmdMv(args);
                break;
            case 'chmod':
                this.cmdChmod(args);
                break;
            case 'chown':
                this.cmdChown(args);
                break;
            default:
                // Check if it's an executable script
                if (this.fs.exists(command) && this.isExecutable(command)) {
                    this.executeScript(command);
                } else if (command.startsWith('./') && this.fs.exists(command) && this.isExecutable(command)) {
                    this.executeScript(command);
                } else {
                    this.terminal.writeln(`-bash: ${command}: command not found`);
                }
        }
    }

    cmdLs(args) {
        // Parse flags - handle combined flags like -la, -al, etc.
        let showAll = false;
        let longFormat = false;
        
        args.forEach(arg => {
            if (arg.startsWith('-') && arg !== '-') {
                const flags = arg.slice(1); // Remove the '-' prefix
                if (flags.includes('a')) showAll = true;
                if (flags.includes('l')) longFormat = true;
            }
        });
        
        const path = args.find(arg => !arg.startsWith('-')) || '.';
        
        const files = this.fs.ls(path);
        if (files === null) {
            this.terminal.writeln(`ls: cannot access '${path}': No such file or directory`);
            return;
        }

        if (showAll) {
            files.unshift({ name: '.', type: 'directory', permissions: 'drwxr-xr-x' });
            files.unshift({ name: '..', type: 'directory', permissions: 'drwxr-xr-x' });
        }

        if (longFormat) {
            this.terminal.writeln(`total ${files.length * 4}`);
            files.forEach(file => {
                const date = file.modified ? this.formatDate(file.modified) : 'Jan  1 00:00';
                this.terminal.writeln(
                    `${file.permissions || 'drwxr-xr-x'} 1 ${file.owner || 'root'} ${file.group || 'root'} ${file.size || 4096} ${date} ${file.name}`
                );
            });
        } else {
            const names = files.map(f => f.name).join('  ');
            if (names) this.terminal.writeln(names);
        }
    }

    cmdCd(args) {
        let path = args[0] || '~';
        // Expand environment variables
        path = path.replace(/\$([A-Z_]+)/g, (match, varName) => {
            return this.environmentVars[varName] || match;
        });
        if (!this.fs.cd(path)) {
            this.terminal.writeln(`-bash: cd: ${path}: No such file or directory`);
        }
    }

    cmdPwd() {
        this.terminal.writeln(this.fs.pwd());
    }

    cmdMkdir(args) {
        if (args.length === 0) {
            this.terminal.writeln('mkdir: missing operand');
            return;
        }
        
        const createParents = args.includes('-p');
        const dirs = args.filter(arg => !arg.startsWith('-'));
        
        dirs.forEach(dir => {
            if (createParents) {
                const parts = this.fs.resolvePath(dir);
                let currentPath = '';
                parts.forEach(part => {
                    currentPath += '/' + part;
                    if (!this.fs.exists(currentPath)) {
                        this.fs.mkdir(currentPath);
                    }
                });
            } else {
                if (!this.fs.mkdir(dir)) {
                    this.terminal.writeln(`mkdir: cannot create directory '${dir}': File exists`);
                }
            }
        });
    }

    cmdTouch(args) {
        if (args.length === 0) {
            this.terminal.writeln('touch: missing file operand');
            return;
        }
        
        args.forEach(file => {
            if (!this.fs.touch(file)) {
                this.terminal.writeln(`touch: cannot touch '${file}': No such file or directory`);
            }
        });
    }

    cmdRm(args) {
        if (args.length === 0) {
            this.terminal.writeln('rm: missing operand');
            return;
        }
        
        const recursive = args.includes('-r') || args.includes('-rf');
        const files = args.filter(arg => !arg.startsWith('-'));
        
        files.forEach(file => {
            if (!this.fs.rm(file, recursive)) {
                this.terminal.writeln(`rm: cannot remove '${file}': No such file or directory`);
            }
        });
    }

    cmdCp(args) {
        if (args.length < 2) {
            this.terminal.writeln('cp: missing file operand');
            this.terminal.writeln('Usage: cp [OPTION] SOURCE DEST');
            this.terminal.writeln('   or: cp [OPTION] SOURCE... DIRECTORY');
            this.terminal.writeln('');
            this.terminal.writeln('Options:');
            this.terminal.writeln('  -r, -R    copy directories recursively');
            this.terminal.writeln('  -i        prompt before overwrite');
            return;
        }

        const recursive = args.includes('-r') || args.includes('-R');
        const interactive = args.includes('-i');
        const sources = args.slice(0, -1).filter(arg => !arg.startsWith('-'));
        const destination = args[args.length - 1];

        if (sources.length === 0) {
            this.terminal.writeln('cp: missing source file operand');
            return;
        }

        // Check if destination is a directory
        const destIsDir = this.fs.isDirectory(destination);
        
        if (sources.length > 1 && !destIsDir) {
            this.terminal.writeln(`cp: target '${destination}' is not a directory`);
            return;
        }

        sources.forEach(source => {
            this.copyFile(source, destination, recursive, destIsDir, interactive);
        });
    }

    copyFile(source, destination, recursive, destIsDir, interactive) {
        // Check if source exists
        if (!this.fs.exists(source)) {
            this.terminal.writeln(`cp: cannot stat '${source}': No such file or directory`);
            return;
        }

        // Determine final destination path
        let finalDest = destination;
        if (destIsDir) {
            const sourceName = source.split('/').pop();
            finalDest = destination.endsWith('/') ? destination + sourceName : destination + '/' + sourceName;
        }

        // Check if destination exists and interactive mode is enabled
        if (interactive && this.fs.exists(finalDest)) {
            this.promptOverwrite(source, finalDest, recursive, destIsDir);
            return;
        }

        // Check if source is a directory
        if (this.fs.isDirectory(source)) {
            if (!recursive) {
                this.terminal.writeln(`cp: -r not specified; omitting directory '${source}'`);
                return;
            }
            this.copyDirectoryRecursive(source, finalDest);
        } else {
            // Copy file
            const content = this.fs.cat(source);
            if (content !== null) {
                if (this.fs.touch(finalDest, content)) {
                    // Success - no output for successful copy (standard cp behavior)
                } else {
                    this.terminal.writeln(`cp: cannot create regular file '${finalDest}': No such file or directory`);
                }
            }
        }
    }

    promptOverwrite(source, destination, recursive, destIsDir) {
        // Set up confirmation prompt state
        this.cpConfirmationPending = {
            source: source,
            destination: destination,
            recursive: recursive,
            destIsDir: destIsDir
        };
        
        // Show confirmation prompt
        this.terminal.writeln(`cp: overwrite '${destination}'? (y/n) `);
        
        // Set flag to indicate we're waiting for cp confirmation
        this.waitingForCpConfirmation = true;
    }

    handleCpConfirmation(input) {
        const response = input.toLowerCase().trim();
        this.waitingForCpConfirmation = false;
        
        if (response === 'y' || response === 'yes') {
            // User confirmed, proceed with copy
            const { source, destination, recursive } = this.cpConfirmationPending;
            
            if (this.fs.isDirectory(source)) {
                if (!recursive) {
                    this.terminal.writeln(`cp: -r not specified; omitting directory '${source}'`);
                } else {
                    this.copyDirectoryRecursive(source, destination);
                }
            } else {
                const content = this.fs.cat(source);
                if (content !== null) {
                    if (this.fs.touch(destination, content)) {
                        // Success - no output for successful copy
                    } else {
                        this.terminal.writeln(`cp: cannot create regular file '${destination}': No such file or directory`);
                    }
                }
            }
        } else if (response === 'n' || response === 'no') {
            // User declined, skip this copy
            // No output (standard cp behavior)
        } else {
            // Invalid response, ask again
            this.terminal.writeln(`cp: overwrite '${this.cpConfirmationPending.destination}'? (y/n) `);
            this.waitingForCpConfirmation = true;
            return;
        }
        
        // Clean up confirmation state
        this.cpConfirmationPending = null;
    }

    copyDirectoryRecursive(source, destination) {
        // Create destination directory
        if (!this.fs.mkdir(destination)) {
            this.terminal.writeln(`cp: cannot create directory '${destination}': File exists`);
            return;
        }

        // Get source directory contents
        const files = this.fs.ls(source);
        if (files) {
            files.forEach(file => {
                if (file.name !== '.' && file.name !== '..') {
                    const sourcePath = source + '/' + file.name;
                    const destPath = destination + '/' + file.name;
                    
                    if (file.type === 'directory') {
                        this.copyDirectoryRecursive(sourcePath, destPath);
                    } else {
                        const content = this.fs.cat(sourcePath);
                        if (content !== null) {
                            this.fs.touch(destPath, content);
                        }
                    }
                }
            });
        }
    }

    cmdMv(args) {
        if (args.length < 2) {
            this.terminal.writeln('mv: missing file operand');
            this.terminal.writeln('Usage: mv [OPTION] SOURCE DEST');
            this.terminal.writeln('   or: mv [OPTION] SOURCE... DIRECTORY');
            this.terminal.writeln('');
            this.terminal.writeln('Options:');
            this.terminal.writeln('  -i        prompt before overwrite');
            this.terminal.writeln('');
            this.terminal.writeln('Examples:');
            this.terminal.writeln('  mv file1.txt file2.txt           # Rename file1.txt to file2.txt');
            this.terminal.writeln('  mv file1.txt /root/              # Move file1.txt to /root directory');
            this.terminal.writeln('  mv dir1 dir2                     # Rename directory dir1 to dir2');
            this.terminal.writeln('  mv -i file1.txt file2.txt        # Interactive move (prompts before overwrite)');
            return;
        }

        const interactive = args.includes('-i');
        const sources = args.slice(0, -1).filter(arg => !arg.startsWith('-'));
        const destination = args[args.length - 1];

        if (sources.length === 0) {
            this.terminal.writeln('mv: missing source file operand');
            return;
        }

        // Check if destination is a directory
        const destIsDir = this.fs.isDirectory(destination);
        
        if (sources.length > 1 && !destIsDir) {
            this.terminal.writeln(`mv: target '${destination}' is not a directory`);
            return;
        }

        sources.forEach(source => {
            this.moveFile(source, destination, destIsDir, interactive);
        });
    }

    moveFile(source, destination, destIsDir, interactive) {
        // Check if source exists
        if (!this.fs.exists(source)) {
            this.terminal.writeln(`mv: cannot stat '${source}': No such file or directory`);
            return;
        }

        // Determine final destination path
        let finalDest = destination;
        if (destIsDir) {
            const sourceName = source.split('/').pop();
            finalDest = destination.endsWith('/') ? destination + sourceName : destination + '/' + sourceName;
        }

        // Check for same file (moving to itself)
        if (this.fs.resolvePath(source).join('/') === this.fs.resolvePath(finalDest).join('/')) {
            this.terminal.writeln(`mv: '${source}' and '${finalDest}' are the same file`);
            return;
        }

        // Check if destination exists and interactive mode is enabled
        if (interactive && this.fs.exists(finalDest)) {
            this.promptMvOverwrite(source, finalDest);
            return;
        }

        // Perform the move operation
        this.performMove(source, finalDest);
    }

    promptMvOverwrite(source, destination) {
        // Set up confirmation prompt state
        this.mvConfirmationPending = {
            source: source,
            destination: destination
        };
        
        // Show confirmation prompt
        this.terminal.writeln(`mv: overwrite '${destination}'? (y/n) `);
        
        // Set flag to indicate we're waiting for mv confirmation
        this.waitingForMvConfirmation = true;
    }

    handleMvConfirmation(input) {
        const response = input.toLowerCase().trim();
        this.waitingForMvConfirmation = false;
        
        if (response === 'y' || response === 'yes') {
            // User confirmed, proceed with move
            const { source, destination } = this.mvConfirmationPending;
            this.performMove(source, destination);
        } else if (response === 'n' || response === 'no') {
            // User declined, skip this move
            // No output (standard mv behavior)
        } else {
            // Invalid response, ask again
            this.terminal.writeln(`mv: overwrite '${this.mvConfirmationPending.destination}'? (y/n) `);
            this.waitingForMvConfirmation = true;
            return;
        }
        
        // Clean up confirmation state
        this.mvConfirmationPending = null;
    }

    performMove(source, destination) {
        // Get the source content
        if (this.fs.isDirectory(source)) {
            // Moving a directory
            if (!this.moveDirectoryRecursive(source, destination)) {
                this.terminal.writeln(`mv: cannot move '${source}' to '${destination}': Operation failed`);
                return;
            }
        } else {
            // Moving a file
            const content = this.fs.cat(source);
            if (content === null) {
                this.terminal.writeln(`mv: cannot access '${source}': No such file or directory`);
                return;
            }

            // Create the destination file
            if (!this.fs.touch(destination, content)) {
                this.terminal.writeln(`mv: cannot create '${destination}': No such file or directory`);
                return;
            }
        }

        // Remove the source after successful copy
        if (!this.fs.rm(source, true)) {
            this.terminal.writeln(`mv: cannot remove '${source}': Operation failed`);
            // Attempt to clean up the destination if we created it
            this.fs.rm(destination, true);
        }
    }

    moveDirectoryRecursive(source, destination) {
        // Create destination directory
        if (!this.fs.mkdir(destination)) {
            return false;
        }

        // Get source directory contents
        const files = this.fs.ls(source);
        if (!files) {
            return false;
        }

        // Copy all contents recursively
        let success = true;
        files.forEach(file => {
            if (file.name !== '.' && file.name !== '..') {
                const sourcePath = source + '/' + file.name;
                const destPath = destination + '/' + file.name;
                
                if (file.type === 'directory') {
                    if (!this.moveDirectoryRecursive(sourcePath, destPath)) {
                        success = false;
                    }
                } else {
                    const content = this.fs.cat(sourcePath);
                    if (content !== null) {
                        if (!this.fs.touch(destPath, content)) {
                            success = false;
                        }
                    } else {
                        success = false;
                    }
                }
            }
        });

        return success;
    }

    cmdChmod(args) {
        if (args.length < 2) {
            this.terminal.writeln('chmod: missing operand');
            this.terminal.writeln('Usage: chmod [OPTION] MODE FILE...');
            this.terminal.writeln('       chmod [OPTION] OCTAL-MODE FILE...');
            this.terminal.writeln('       chmod [OPTION] --reference=RFILE FILE...');
            this.terminal.writeln('');
            this.terminal.writeln('Options:');
            this.terminal.writeln('  -R        change files and directories recursively');
            this.terminal.writeln('');
            this.terminal.writeln('MODE examples:');
            this.terminal.writeln('  755       rwxr-xr-x (owner: rwx, group: r-x, others: r-x)');
            this.terminal.writeln('  644       rw-r--r-- (owner: rw-, group: r--, others: r--)');
            this.terminal.writeln('  600       rw------- (owner: rw-, group: ---, others: ---)');
            this.terminal.writeln('  u+x       add execute permission for owner');
            this.terminal.writeln('  g-w       remove write permission for group');
            this.terminal.writeln('  o=r       set others permission to read only');
            this.terminal.writeln('  a+r       add read permission for all (owner, group, others)');
            this.terminal.writeln('');
            this.terminal.writeln('Examples:');
            this.terminal.writeln('  chmod 755 script.sh              # Make script executable');
            this.terminal.writeln('  chmod 644 config.txt             # Standard file permissions');
            this.terminal.writeln('  chmod u+x program                # Add execute for owner');
            this.terminal.writeln('  chmod -R 755 /path/to/directory  # Recursive permission change');
            return;
        }

        const recursive = args.includes('-R');
        const filteredArgs = args.filter(arg => arg !== '-R');
        
        if (filteredArgs.length < 2) {
            this.terminal.writeln('chmod: missing file operand');
            return;
        }

        const mode = filteredArgs[0];
        const files = filteredArgs.slice(1);

        files.forEach(file => {
            this.changePermissions(file, mode, recursive);
        });
    }

    changePermissions(path, mode, recursive) {
        // Check if file exists
        if (!this.fs.exists(path)) {
            this.terminal.writeln(`chmod: cannot access '${path}': No such file or directory`);
            return;
        }

        // Get the file node
        const pathArray = this.fs.resolvePath(path);
        const node = this.fs.getNode(pathArray);
        
        if (!node) {
            this.terminal.writeln(`chmod: cannot access '${path}': No such file or directory`);
            return;
        }

        // Convert mode to permission string
        const newPermissions = this.parsePermissionMode(mode, node.permissions);
        if (!newPermissions) {
            this.terminal.writeln(`chmod: invalid mode: '${mode}'`);
            return;
        }

        // Apply permissions to the file/directory
        node.permissions = newPermissions;

        // If recursive and it's a directory, apply to all contents
        if (recursive && node.type === 'directory') {
            this.changePermissionsRecursive(node, mode);
        }

        // Save filesystem state
        this.fs.saveState();
    }

    changePermissionsRecursive(dirNode, mode) {
        if (dirNode.children) {
            Object.values(dirNode.children).forEach(child => {
                const newPermissions = this.parsePermissionMode(mode, child.permissions);
                if (newPermissions) {
                    child.permissions = newPermissions;
                }
                
                if (child.type === 'directory') {
                    this.changePermissionsRecursive(child, mode);
                }
            });
        }
    }

    parsePermissionMode(mode, currentPermissions) {
        // Handle octal mode (e.g., 755, 644)
        if (/^\d{3}$/.test(mode)) {
            return this.octalToPermissionString(mode, currentPermissions);
        }

        // Handle symbolic mode (e.g., u+x, g-w, o=r, a+r)
        if (/^[ugoa]*[+\-=][rwx]*$/.test(mode)) {
            return this.applySymbolicMode(mode, currentPermissions);
        }

        return null; // Invalid mode
    }

    octalToPermissionString(octal, currentPermissions) {
        const digits = octal.split('').map(d => parseInt(d));
        if (digits.length !== 3 || digits.some(d => d > 7)) {
            return null;
        }

        const permissions = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
        const fileType = currentPermissions ? currentPermissions.charAt(0) : '-';
        
        return `${fileType}${permissions[digits[0]]}${permissions[digits[1]]}${permissions[digits[2]]}`;
    }

    applySymbolicMode(mode, currentPermissions) {
        // Parse symbolic mode: [ugoa]*[+\-=][rwx]*
        const match = mode.match(/^([ugoa]*)([+\-=])([rwx]*)$/);
        if (!match) return null;

        const [, who, operator, perms] = match;
        const whoChars = who || 'a'; // Default to 'all' if no who specified
        
        // Convert current permissions to array format
        let permArray = this.permissionStringToArray(currentPermissions);
        
        // Apply changes for each 'who' character
        for (const w of whoChars) {
            let indices = [];
            switch (w) {
                case 'u': indices = [0]; break; // user/owner
                case 'g': indices = [1]; break; // group
                case 'o': indices = [2]; break; // others
                case 'a': indices = [0, 1, 2]; break; // all
            }

            for (const index of indices) {
                switch (operator) {
                    case '+':
                        // Add permissions
                        if (perms.includes('r')) permArray[index] = permArray[index].substring(0, 0) + 'r' + permArray[index].substring(1);
                        if (perms.includes('w')) permArray[index] = permArray[index].substring(0, 1) + 'w' + permArray[index].substring(2);
                        if (perms.includes('x')) permArray[index] = permArray[index].substring(0, 2) + 'x';
                        break;
                    case '-':
                        // Remove permissions
                        if (perms.includes('r')) permArray[index] = '-' + permArray[index].substring(1);
                        if (perms.includes('w')) permArray[index] = permArray[index].substring(0, 1) + '-' + permArray[index].substring(2);
                        if (perms.includes('x')) permArray[index] = permArray[index].substring(0, 2) + '-';
                        break;
                    case '=':
                        // Set permissions exactly
                        let newPerm = '';
                        newPerm += perms.includes('r') ? 'r' : '-';
                        newPerm += perms.includes('w') ? 'w' : '-';
                        newPerm += perms.includes('x') ? 'x' : '-';
                        permArray[index] = newPerm;
                        break;
                }
            }
        }

        // Convert back to permission string
        const fileType = currentPermissions.charAt(0);
        return fileType + permArray.join('');
    }

    permissionStringToArray(permString) {
        // Convert "-rwxr-xr-x" to ["rwx", "r-x", "r-x"]
        const perms = permString.substring(1); // Remove file type character
        return [
            perms.substring(0, 3),  // owner
            perms.substring(3, 6),  // group
            perms.substring(6, 9)   // others
        ];
    }

    cmdChown(args) {
        if (args.length < 2) {
            this.terminal.writeln('chown: missing operand');
            this.terminal.writeln('Usage: chown [OPTION] [OWNER][:[GROUP]] FILE...');
            this.terminal.writeln('       chown [OPTION] --reference=RFILE FILE...');
            this.terminal.writeln('');
            this.terminal.writeln('Options:');
            this.terminal.writeln('  -R        operate on files and directories recursively');
            this.terminal.writeln('');
            this.terminal.writeln('OWNER and GROUP examples:');
            this.terminal.writeln('  root              change owner to root');
            this.terminal.writeln('  root:root         change owner to root and group to root');
            this.terminal.writeln('  :oinstall         change group to oinstall (owner unchanged)');
            this.terminal.writeln('  oracle:dba        change owner to oracle and group to dba');
            this.terminal.writeln('  1000:1000         change owner to UID 1000 and group to GID 1000');
            this.terminal.writeln('');
            this.terminal.writeln('Examples:');
            this.terminal.writeln('  chown oracle script.sh           # Change owner to oracle');
            this.terminal.writeln('  chown oracle:oinstall file.txt   # Change owner and group');
            this.terminal.writeln('  chown :dba database.dbf          # Change group only');
            this.terminal.writeln('  chown -R oracle:oinstall /u01/   # Recursive ownership change');
            this.terminal.writeln('');
            this.terminal.writeln('Note: Only root can change file ownership in this simulation');
            return;
        }

        // Check if user is root (only root can change ownership)
        if (this.fs.currentUser !== 'root') {
            this.terminal.writeln('chown: changing ownership: Operation not permitted');
            return;
        }

        const recursive = args.includes('-R');
        const filteredArgs = args.filter(arg => arg !== '-R');
        
        if (filteredArgs.length < 2) {
            this.terminal.writeln('chown: missing file operand');
            return;
        }

        const ownerGroup = filteredArgs[0];
        const files = filteredArgs.slice(1);

        // Parse owner:group format
        const ownership = this.parseOwnership(ownerGroup);
        if (!ownership) {
            this.terminal.writeln(`chown: invalid user: '${ownerGroup}'`);
            return;
        }

        files.forEach(file => {
            this.changeOwnership(file, ownership, recursive);
        });
    }

    parseOwnership(ownerGroup) {
        // Handle formats: user, user:group, :group, user:, uid:gid
        const parts = ownerGroup.split(':');
        
        if (parts.length === 1) {
            // Just owner: "oracle"
            return { owner: parts[0], group: null };
        } else if (parts.length === 2) {
            // owner:group, :group, owner:, etc.
            const owner = parts[0] || null;  // Empty string becomes null (no change)
            const group = parts[1] || null;  // Empty string becomes null (no change)
            return { owner, group };
        } else {
            return null; // Invalid format
        }
    }

    changeOwnership(path, ownership, recursive) {
        // Check if file exists
        if (!this.fs.exists(path)) {
            this.terminal.writeln(`chown: cannot access '${path}': No such file or directory`);
            return;
        }

        // Get the file node
        const pathArray = this.fs.resolvePath(path);
        const node = this.fs.getNode(pathArray);
        
        if (!node) {
            this.terminal.writeln(`chown: cannot access '${path}': No such file or directory`);
            return;
        }

        // Validate and apply ownership changes
        if (ownership.owner !== null) {
            if (this.isValidUser(ownership.owner)) {
                node.owner = ownership.owner;
            } else {
                this.terminal.writeln(`chown: invalid user: '${ownership.owner}'`);
                return;
            }
        }

        if (ownership.group !== null) {
            if (this.isValidGroup(ownership.group)) {
                node.group = ownership.group;
            } else {
                this.terminal.writeln(`chown: invalid group: '${ownership.group}'`);
                return;
            }
        }

        // If recursive and it's a directory, apply to all contents
        if (recursive && node.type === 'directory') {
            this.changeOwnershipRecursive(node, ownership);
        }

        // Save filesystem state
        this.fs.saveState();
    }

    changeOwnershipRecursive(dirNode, ownership) {
        if (dirNode.children) {
            Object.values(dirNode.children).forEach(child => {
                // Apply ownership changes
                if (ownership.owner !== null && this.isValidUser(ownership.owner)) {
                    child.owner = ownership.owner;
                }
                if (ownership.group !== null && this.isValidGroup(ownership.group)) {
                    child.group = ownership.group;
                }
                
                // Recurse into subdirectories
                if (child.type === 'directory') {
                    this.changeOwnershipRecursive(child, ownership);
                }
            });
        }
    }

    isValidUser(username) {
        // Check if user exists in /etc/passwd
        const passwdContent = this.fs.cat('/etc/passwd');
        if (!passwdContent) return false;

        // Handle numeric UIDs
        if (/^\d+$/.test(username)) {
            return true; // Accept any numeric UID for simplicity
        }

        // Check for username in passwd file
        const users = ['root', 'oracle', 'arcgis', 'bin', 'daemon', 'adm', 'lp', 'sync', 'shutdown', 'halt', 'mail', 'operator', 'games', 'ftp', 'nobody', 'dbus', 'systemd-network'];
        return users.includes(username) || passwdContent.includes(`${username}:`);
    }

    isValidGroup(groupname) {
        // Check if group exists in /etc/group
        const groupContent = this.fs.cat('/etc/group');
        if (!groupContent) return false;

        // Handle numeric GIDs
        if (/^\d+$/.test(groupname)) {
            return true; // Accept any numeric GID for simplicity
        }

        // Check for groupname in group file
        const groups = ['root', 'oinstall', 'dba', 'oper', 'backupdba', 'dgdba', 'kmdba', 'asmdba', 'asmoper', 'asmadmin', 'bin', 'daemon', 'sys', 'adm', 'tty', 'disk', 'lp', 'mem', 'kmem', 'wheel', 'cdrom', 'mail', 'man', 'dialout', 'floppy', 'games', 'tape', 'video', 'ftp', 'lock', 'audio', 'nobody', 'users', 'systemd-network', 'dbus'];
        return groups.includes(groupname) || groupContent.includes(`${groupname}:`);
    }

    // Script execution functionality
    executeScript(scriptPath) {
        // Check if file exists
        if (!this.fs.exists(scriptPath)) {
            this.terminal.writeln(`bash: ${scriptPath}: No such file or directory`);
            return false;
        }

        // Check if file is executable
        if (!this.isExecutable(scriptPath)) {
            this.terminal.writeln(`bash: ${scriptPath}: Permission denied`);
            return false;
        }

        // Get script content
        const content = this.fs.cat(scriptPath);
        if (!content) {
            this.terminal.writeln(`bash: ${scriptPath}: cannot execute binary file`);
            return false;
        }

        // Check if it's a shell script
        const lines = content.split('\n');
        if (lines.length === 0) {
            return true; // Empty script
        }

        const shebang = lines[0].trim();
        if (!shebang.startsWith('#!') || (!shebang.includes('/bin/sh') && !shebang.includes('/bin/bash'))) {
            this.terminal.writeln(`bash: ${scriptPath}: cannot execute binary file: Exec format error`);
            return false;
        }

        // Execute each line of the script
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines and comments
            if (line === '' || line.startsWith('#')) {
                continue;
            }
            
            // Execute the command
            this.processCommand(line);
        }

        return true;
    }

    // Check if a file is executable
    isExecutable(path) {
        const pathArray = this.fs.resolvePath(path);
        const node = this.fs.getNode(pathArray);
        
        if (!node || node.type !== 'file') {
            return false;
        }

        // Check if file has execute permission
        const permissions = node.permissions;
        if (!permissions) return false;

        // Check owner execute permission (position 3)
        if (this.fs.currentUser === node.owner && permissions[3] === 'x') {
            return true;
        }

        // Check group execute permission (position 6) 
        if (permissions[6] === 'x') {
            return true;
        }

        // Check others execute permission (position 9)
        if (permissions[9] === 'x') {
            return true;
        }

        return false;
    }

    cmdCat(args) {
        if (args.length === 0) {
            return;
        }
        
        args.forEach(file => {
            const content = this.fs.cat(file);
            if (content === null) {
                this.terminal.writeln(`cat: ${file}: No such file or directory`);
            } else {
                this.terminal.writeln(content);
            }
        });
    }

    cmdEcho(args) {
        // Handle output redirection
        let redirectIndex = -1;
        let redirectType = null;
        
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '>') {
                redirectIndex = i;
                redirectType = '>';
                break;
            } else if (args[i] === '>>') {
                redirectIndex = i;
                redirectType = '>>';
                break;
            }
        }
        
        if (redirectIndex !== -1 && redirectIndex < args.length - 1) {
            // Get text before redirection
            const textParts = args.slice(0, redirectIndex);
            let outputText = textParts.join(' ');
            
            // Process variables
            outputText = outputText.replace(/\$([A-Z_]+)/g, (match, varName) => {
                return this.environmentVars[varName] || '';
            });
            
            // Get filename
            const filename = args[redirectIndex + 1];
            let fullPath = filename;
            if (!filename.startsWith('/')) {
                fullPath = this.fs.pwd() === '/' ? `/${filename}` : `${this.fs.pwd()}/${filename}`;
            }
            
            if (redirectType === '>>') {
                // Append
                if (this.fs.exists(fullPath)) {
                    const currentContent = this.fs.cat(fullPath) || '';
                    this.fs.updateFile(fullPath, currentContent + (currentContent ? '\n' : '') + outputText);
                } else {
                    this.fs.touch(fullPath, outputText);
                }
            } else {
                // Overwrite
                if (this.fs.exists(fullPath)) {
                    this.fs.updateFile(fullPath, outputText);
                } else {
                    this.fs.touch(fullPath, outputText);
                }
            }
        } else {
            // Normal echo without redirection
            let text = args.join(' ');
            // Process variables
            text = text.replace(/\$([A-Z_]+)/g, (match, varName) => {
                return this.environmentVars[varName] || '';
            });
            this.terminal.writeln(text);
        }
    }

    cmdUname(args) {
        if (args.includes('-a')) {
            this.terminal.writeln('Linux proddb01sim 5.14.0-70.13.1.el9_0.x86_64 #1 SMP PREEMPT Thu Apr 14 12:42:38 EDT 2022 x86_64 x86_64 x86_64 GNU/Linux');
        } else if (args.includes('-r')) {
            this.terminal.writeln('5.14.0-70.13.1.el9_0.x86_64');
        } else {
            this.terminal.writeln('Linux');
        }
    }

    cmdDf(args) {
        if (args.includes('-h')) {
            this.terminal.writeln('Filesystem      Size  Used Avail Use% Mounted on');
            this.terminal.writeln('/dev/sda3        98G  4.5G   89G   5% /');
            this.terminal.writeln('/dev/sda1      1014M  258M  757M  26% /boot');
            this.terminal.writeln('/dev/sda2        20G  1.2G   18G   7% /u01');
            this.terminal.writeln('tmpfs           7.8G     0  7.8G   0% /dev/shm');
        } else {
            this.terminal.writeln('Filesystem     1K-blocks    Used Available Use% Mounted on');
            this.terminal.writeln('/dev/sda3      102685624 4718592  92725848   5% /');
            this.terminal.writeln('/dev/sda1        1038336  264192    774144  26% /boot');
            this.terminal.writeln('/dev/sda2       20961280 1258496  19702784   7% /u01');
            this.terminal.writeln('tmpfs            8173492       0   8173492   0% /dev/shm');
        }
    }

    cmdFree(args) {
        if (args.includes('-h')) {
            this.terminal.writeln('               total        used        free      shared  buff/cache   available');
            this.terminal.writeln('Mem:            15Gi       2.1Gi       8.9Gi       145Mi       4.5Gi        12Gi');
            this.terminal.writeln('Swap:          7.9Gi          0B       7.9Gi');
        } else {
            this.terminal.writeln('              total        used        free      shared  buff/cache   available');
            this.terminal.writeln('Mem:       16346984     2202616     9395252      148992     4749116    13591940');
            this.terminal.writeln('Swap:       8388604           0     8388604');
        }
    }

    cmdPs(args) {
        if (args.includes('-ef')) {
            this.terminal.writeln('UID          PID    PPID  C STIME TTY          TIME CMD');
            this.terminal.writeln('root           1       0  0 08:23 ?        00:00:02 /usr/lib/systemd/systemd');
            this.terminal.writeln('root           2       0  0 08:23 ?        00:00:00 [kthreadd]');
            this.terminal.writeln('root         845       1  0 08:23 ?        00:00:00 /usr/lib/systemd/systemd-journald');
            this.terminal.writeln('root        1156       1  0 08:23 ?        00:00:00 /usr/sbin/sshd -D');
            this.terminal.writeln('root        2451    2449  0 09:15 pts/0    00:00:00 -bash');
            this.terminal.writeln('root        2502    2451  0 09:20 pts/0    00:00:00 ps -ef');
        } else {
            this.terminal.writeln('    PID TTY          TIME CMD');
            this.terminal.writeln('   2451 pts/0    00:00:00 bash');
            this.terminal.writeln('   2502 pts/0    00:00:00 ps');
        }
    }

    cmdYum(args) {
        const subcommand = args[0];
        if (!subcommand) {
            this.terminal.writeln('Usage: yum [options] COMMAND');
            return;
        }

        // Check for root privileges for package management operations
        const privilegedOperations = ['install', 'update', 'upgrade', 'remove', 'erase', 'autoremove', 'clean', 'makecache'];
        if (privilegedOperations.includes(subcommand) && this.fs.currentUser !== 'root') {
            this.terminal.writeln('Error: This command has to be run with superuser privileges (under the root user on most systems).');
            return;
        }

        switch (subcommand) {
            case 'install':
                const packages = args.slice(1).filter(arg => !arg.startsWith('-'));
                if (packages.length === 0) {
                    this.terminal.writeln('Error: Need to pass a list of pkgs to install');
                } else {
                    // Check which packages are available and not already installed
                    const packagesToInstall = [];
                    const alreadyInstalled = [];
                    const notAvailable = [];
                    
                    packages.forEach(pkg => {
                        if (this.isPackageInstalled(pkg)) {
                            alreadyInstalled.push(pkg);
                        } else if (this.installPackage(pkg)) {
                            packagesToInstall.push(pkg);
                        } else {
                            notAvailable.push(pkg);
                        }
                    });
                    
                    if (notAvailable.length > 0) {
                        this.terminal.writeln(`No match for argument: ${notAvailable.join(', ')}`);
                        this.terminal.writeln('Error: Unable to find a match');
                        return;
                    }
                    
                    if (alreadyInstalled.length > 0) {
                        this.terminal.writeln(`Package${alreadyInstalled.length > 1 ? 's' : ''} ${alreadyInstalled.join(', ')} already installed.`);
                    }
                    
                    if (packagesToInstall.length === 0) {
                        this.terminal.writeln('Nothing to do.');
                        return;
                    }
                    
                    this.terminal.writeln('Last metadata expiration check: 0:15:32 ago on ' + new Date().toLocaleString());
                    this.terminal.writeln('Dependencies resolved.');
                    this.terminal.writeln('================================================================================');
                    this.terminal.writeln(' Package            Architecture    Version              Repository        Size');
                    this.terminal.writeln('================================================================================');
                    packagesToInstall.forEach(pkg => {
                        const pkgInfo = this.installedPackages[pkg];
                        this.terminal.writeln(` ${pkg.padEnd(18)} ${pkgInfo.arch.padEnd(11)} ${pkgInfo.version.padEnd(20)} ${pkgInfo.repo.padEnd(13)} 1.2 M`);
                    });
                    this.terminal.writeln('\nTransaction Summary');
                    this.terminal.writeln('================================================================================');
                    this.terminal.writeln(`Install  ${packagesToInstall.length} Package${packagesToInstall.length > 1 ? 's' : ''}`);
                    this.terminal.writeln('\nComplete!');
                }
                break;
            case 'update':
            case 'upgrade':
                this.terminal.writeln('Last metadata expiration check: 0:15:32 ago on ' + new Date().toLocaleString());
                this.terminal.writeln('Dependencies resolved.');
                this.terminal.writeln('Nothing to do.');
                this.terminal.writeln('Complete!');
                break;
            case 'remove':
            case 'erase':
                const removePackages = args.slice(1).filter(arg => !arg.startsWith('-'));
                if (removePackages.length === 0) {
                    this.terminal.writeln('Error: Need to pass a list of pkgs to remove');
                } else {
                    const packagesToRemove = [];
                    const notInstalled = [];
                    
                    removePackages.forEach(pkg => {
                        if (this.isPackageInstalled(pkg)) {
                            packagesToRemove.push(pkg);
                        } else {
                            notInstalled.push(pkg);
                        }
                    });
                    
                    if (notInstalled.length > 0) {
                        this.terminal.writeln(`No match for argument: ${notInstalled.join(', ')}`);
                        this.terminal.writeln('Error: No packages marked for removal');
                        return;
                    }
                    
                    this.terminal.writeln('Dependencies resolved.');
                    this.terminal.writeln('================================================================================');
                    this.terminal.writeln(' Package            Architecture    Version              Repository        Size');
                    this.terminal.writeln('================================================================================');
                    this.terminal.writeln('Removing:');
                    packagesToRemove.forEach(pkg => {
                        const pkgInfo = this.installedPackages[pkg];
                        this.terminal.writeln(` ${pkg.padEnd(18)} ${pkgInfo.arch.padEnd(11)} ${pkgInfo.version.padEnd(20)} @${pkgInfo.repo.padEnd(12)} 1.2 M`);
                        this.removePackage(pkg);
                    });
                    this.terminal.writeln('\nTransaction Summary');
                    this.terminal.writeln('================================================================================');
                    this.terminal.writeln(`Remove  ${packagesToRemove.length} Package${packagesToRemove.length > 1 ? 's' : ''}`);
                    this.terminal.writeln('\nComplete!');
                }
                break;
            case 'clean':
                const cleanArg = args[1] || 'all';
                this.terminal.writeln(`Cleaning repos: rhel-9-baseos rhel-9-appstream`);
                this.terminal.writeln(`Cleaning up list of fastest mirrors`);
                this.terminal.writeln(`Other repos take up 0 M of disk space (use --verbose for details)`);
                break;
            case 'autoremove':
                this.terminal.writeln('Dependencies resolved.');
                this.terminal.writeln('Nothing to do.');
                this.terminal.writeln('Complete!');
                break;
            case 'makecache':
                this.terminal.writeln('Updating Subscription Management repositories.');
                this.terminal.writeln('Red Hat Enterprise Linux 9 for x86_64 - BaseOS (RPMs)         12 kB/s | 4.1 kB     00:00');
                this.terminal.writeln('Red Hat Enterprise Linux 9 for x86_64 - AppStream (RPMs)     15 kB/s | 4.5 kB     00:00');
                this.terminal.writeln('Metadata cache created.');
                break;
            case 'list':
                if (args.includes('installed')) {
                    this.terminal.writeln('Installed Packages');
                    Object.entries(this.installedPackages).forEach(([pkgName, pkgInfo]) => {
                        const fullName = `${pkgName}.${pkgInfo.arch}`;
                        const version = pkgInfo.version;
                        const repo = `@${pkgInfo.repo}`;
                        this.terminal.writeln(`${fullName.padEnd(33)} ${version.padEnd(25)} ${repo}`);
                    });
                } else {
                    this.terminal.writeln('Available Packages');
                    // Show packages that are available but not installed
                    const availablePackages = [
                        { name: 'oracle-database-preinstall-19c', arch: 'x86_64', version: '1.0-1.el9', repo: 'rhel-9-appstream' },
                        { name: 'compat-libstdc++-33', arch: 'x86_64', version: '3.2.3-72.el9', repo: 'rhel-9-appstream' },
                        { name: 'gcc', arch: 'x86_64', version: '11.2.1-9.el9', repo: 'rhel-9-appstream' },
                        { name: 'gcc-c++', arch: 'x86_64', version: '11.2.1-9.el9', repo: 'rhel-9-appstream' },
                        { name: 'make', arch: 'x86_64', version: '4.3-7.el9', repo: 'rhel-9-baseos' },
                        { name: 'vim', arch: 'x86_64', version: '8.2.2637-16.el9', repo: 'rhel-9-appstream' },
                        { name: 'wget', arch: 'x86_64', version: '1.21.1-7.el9', repo: 'rhel-9-appstream' },
                        { name: 'unzip', arch: 'x86_64', version: '6.0-56.el9', repo: 'rhel-9-baseos' }
                    ];
                    
                    availablePackages.forEach(pkg => {
                        if (!this.isPackageInstalled(pkg.name)) {
                            const fullName = `${pkg.name}.${pkg.arch}`;
                            this.terminal.writeln(`${fullName.padEnd(33)} ${pkg.version.padEnd(12)} ${pkg.repo}`);
                        }
                    });
                }
                break;
            default:
                this.terminal.writeln(`No such command: ${subcommand}. Please use /usr/bin/yum --help`);
        }
    }

    cmdSystemctl(args) {
        const subcommand = args[0];
        const service = args[1];

        switch (subcommand) {
            case 'status':
                if (!service) {
                    this.terminal.writeln('Too few arguments.');
                } else if (service === 'firewalld') {
                    this.terminal.writeln('● firewalld.service - firewalld - dynamic firewall daemon');
                    this.terminal.writeln('   Loaded: loaded (/usr/lib/systemd/system/firewalld.service; enabled; vendor preset: enabled)');
                    this.terminal.writeln('   Active: active (running) since ' + new Date().toLocaleString());
                    this.terminal.writeln('   Main PID: 1234 (firewalld)');
                } else {
                    this.terminal.writeln(`Unit ${service}.service could not be found.`);
                }
                break;
            case 'start':
            case 'stop':
            case 'restart':
                if (!service) {
                    this.terminal.writeln('Too few arguments.');
                } else {
                    this.terminal.writeln(`[  OK  ] ${subcommand}ed ${service}.service`);
                }
                break;
            case 'enable':
            case 'disable':
                if (!service) {
                    this.terminal.writeln('Too few arguments.');
                } else {
                    this.terminal.writeln(`Created symlink /etc/systemd/system/multi-user.target.wants/${service}.service → /usr/lib/systemd/system/${service}.service`);
                }
                break;
            default:
                this.terminal.writeln('Usage: systemctl [OPTIONS...] {COMMAND} ...');
        }
    }

    cmdFirewall(args) {
        const option = args[0];
        
        switch (option) {
            case '--list-all':
                this.terminal.writeln('public (active)');
                this.terminal.writeln('  target: default');
                this.terminal.writeln('  icmp-block-inversion: no');
                this.terminal.writeln('  interfaces: eth0');
                this.terminal.writeln('  sources: ');
                this.terminal.writeln('  services: dhcpv6-client ssh');
                const allPorts = [];
                if (oracleManager.getState('firewallConfigured')) {
                    allPorts.push('1521/tcp');
                }
                this.terminal.writeln('  ports: ' + allPorts.join(' '));
                this.terminal.writeln('  protocols: ');
                this.terminal.writeln('  masquerade: no');
                break;
            case '--permanent':
                if (args[1] && args[1].startsWith('--add-port=')) {
                    const port = args[1].split('=')[1];
                    this.terminal.writeln('success');
                    
                    // Track if Oracle port 1521 was opened
                    if (port === '1521/tcp') {
                        oracleManager.updateState('firewallConfigured', true);
                    }
                }
                break;
            case '--reload':
                this.terminal.writeln('success');
                break;
            case '--list-ports':
                const ports = [];
                if (oracleManager.getState('firewallConfigured')) {
                    ports.push('1521/tcp');
                }
                this.terminal.writeln(ports.join(' '));
                break;
            default:
                this.terminal.writeln('Usage: see firewall-cmd --help');
        }
    }

    // SELinux state management methods
    loadSelinuxState() {
        try {
            const savedState = localStorage.getItem('selinuxState');
            if (savedState) {
                this.selinuxState = JSON.parse(savedState);
            } else {
                // Initialize from config file
                this.parseSelinuxConfig();
            }
        } catch (e) {
            // Use default state if loading fails
            console.warn('Failed to load SELinux state:', e);
        }
    }

    saveSelinuxState() {
        try {
            localStorage.setItem('selinuxState', JSON.stringify(this.selinuxState));
        } catch (e) {
            console.warn('Failed to save SELinux state:', e);
        }
    }

    parseSelinuxConfig() {
        const configContent = this.fs.cat('/etc/selinux/config');
        if (configContent) {
            const lines = configContent.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('SELINUX=')) {
                    const value = trimmed.split('=')[1].toLowerCase();
                    this.selinuxState.configMode = value;
                    // If not overridden by runtime, set current mode from config
                    if (!localStorage.getItem('selinuxRuntimeOverride')) {
                        this.selinuxState.currentMode = value;
                    }
                    break;
                }
            }
        }
        this.saveSelinuxState();
    }

    updateSelinuxConfig(newMode) {
        const configContent = this.fs.cat('/etc/selinux/config');
        if (configContent) {
            const lines = configContent.split('\n');
            const updatedLines = lines.map(line => {
                if (line.trim().startsWith('SELINUX=')) {
                    return `SELINUX=${newMode}`;
                }
                return line;
            });
            this.fs.updateFile('/etc/selinux/config', updatedLines.join('\n'));
            this.selinuxState.configMode = newMode;
            this.saveSelinuxState();
        }
    }

    cmdSetenforce(args) {
        if (args.length === 0) {
            this.terminal.writeln('usage:  setenforce [ Enforcing | Permissive | 1 | 0 ]');
            return;
        }

        // Check if running as root
        if (this.fs.currentUser !== 'root') {
            this.terminal.writeln('setenforce: SELinux is disabled');
            return;
        }

        const arg = args[0].toLowerCase();
        let newMode = null;

        if (arg === '0' || arg === 'permissive') {
            newMode = 'permissive';
        } else if (arg === '1' || arg === 'enforcing') {
            newMode = 'enforcing';
        } else {
            this.terminal.writeln('usage:  setenforce [ Enforcing | Permissive | 1 | 0 ]');
            return;
        }

        // Check if SELinux is disabled in config
        if (this.selinuxState.configMode === 'disabled') {
            this.terminal.writeln('setenforce: SELinux is disabled');
            return;
        }

        // Set the runtime mode
        this.selinuxState.currentMode = newMode;
        this.saveSelinuxState();
        
        // Mark that runtime mode has been overridden
        localStorage.setItem('selinuxRuntimeOverride', 'true');

        // setenforce typically doesn't produce output on success
        if (newMode === 'enforcing') {
            // In a real system, switching to enforcing might show warnings
            // if there are policy violations
            this.terminal.writeln('');
        }
    }

    cmdGetenforce(args) {
        // Check if SELinux is disabled
        if (this.selinuxState.configMode === 'disabled') {
            this.terminal.writeln('Disabled');
            return;
        }

        // Return current runtime mode
        const mode = this.selinuxState.currentMode;
        this.terminal.writeln(mode.charAt(0).toUpperCase() + mode.slice(1));
    }

    cmdSestatus(args) {
        if (args.includes('-h') || args.includes('--help')) {
            this.terminal.writeln('Usage: sestatus [OPTION...]');
            this.terminal.writeln('  -v, --verbose         Verbose check of process and file contexts');
            this.terminal.writeln('  -b, --boolean         Display current state of booleans');
            this.terminal.writeln('  -h, --help           Display this help and exit');
            return;
        }

        // Basic SELinux status
        this.terminal.writeln('SELinux status:                 enabled');
        this.terminal.writeln(`SELinuxfs mount:                /sys/fs/selinux`);
        this.terminal.writeln(`SELinux root directory:         /etc/selinux`);
        this.terminal.writeln(`Loaded policy name:             targeted`);
        
        if (this.selinuxState.configMode === 'disabled') {
            this.terminal.writeln('Current mode:                   disabled');
            this.terminal.writeln('Mode from config file:          disabled');
        } else {
            this.terminal.writeln(`Current mode:                   ${this.selinuxState.currentMode}`);
            this.terminal.writeln(`Mode from config file:          ${this.selinuxState.configMode}`);
        }
        
        this.terminal.writeln('Policy MLS status:              enabled');
        this.terminal.writeln('Policy deny_unknown status:     allowed');
        this.terminal.writeln('Memory protection checking:     actual (secure)');
        this.terminal.writeln('Max kernel policy version:      33');

        if (args.includes('-v') || args.includes('--verbose')) {
            this.terminal.writeln('');
            this.terminal.writeln('Process contexts:');
            this.terminal.writeln('Current context:                unconfined_u:unconfined_r:unconfined_t:s0-s0:c0.c1023');
            this.terminal.writeln('Init context:                   system_u:system_r:init_t:s0');
            this.terminal.writeln('');
            this.terminal.writeln('File contexts:');
            this.terminal.writeln('Controlling terminal:           unconfined_u:object_r:user_devpts_t:s0');
            this.terminal.writeln('/etc/passwd                     system_u:object_r:passwd_file_t:s0');
            this.terminal.writeln('/etc/shadow                     system_u:object_r:shadow_t:s0');
        }

        if (args.includes('-b') || args.includes('--boolean')) {
            this.terminal.writeln('');
            this.terminal.writeln('Policy booleans:');
            this.terminal.writeln('abrt_anon_write                 off');
            this.terminal.writeln('abrt_handle_event               off');
            this.terminal.writeln('httpd_can_network_connect       off');
            this.terminal.writeln('httpd_enable_cgi                on');
            this.terminal.writeln('oracle_port_access              on');
            this.terminal.writeln('ssh_chroot_rw_homedirs          off');
        }
    }

    cmdSetsebool(args) {
        if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
            this.terminal.writeln('Usage: setsebool [ -P ] boolean value | bool1=val1 bool2=val2 ...');
            this.terminal.writeln('');
            this.terminal.writeln('Change the current state of a SELinux boolean.');
            this.terminal.writeln('');
            this.terminal.writeln('Options:');
            this.terminal.writeln('  -P   Make the change persistent (survives reboot)');
            this.terminal.writeln('');
            this.terminal.writeln('Examples:');
            this.terminal.writeln('  setsebool httpd_can_network_connect on');
            this.terminal.writeln('  setsebool -P oracle_port_access on');
            this.terminal.writeln('  setsebool httpd_enable_cgi=on ssh_chroot_rw_homedirs=off');
            return;
        }

        // Check if running as root
        if (this.fs.currentUser !== 'root') {
            this.terminal.writeln('setsebool: You must be root to set booleans.');
            return;
        }

        // Check if SELinux is disabled
        if (this.selinuxState.configMode === 'disabled') {
            this.terminal.writeln('setsebool: SELinux is disabled');
            return;
        }

        const persistent = args.includes('-P');
        const boolArgs = args.filter(arg => arg !== '-P');

        if (boolArgs.length < 2) {
            this.terminal.writeln('Usage: setsebool [ -P ] boolean value | bool1=val1 bool2=val2 ...');
            return;
        }

        // Handle boolean=value format
        for (const arg of boolArgs) {
            if (arg.includes('=')) {
                const [bool, value] = arg.split('=');
                this.setBooleanValue(bool, value, persistent);
            }
        }

        // Handle boolean value format
        if (boolArgs.length >= 2 && !boolArgs[0].includes('=')) {
            const bool = boolArgs[0];
            const value = boolArgs[1];
            this.setBooleanValue(bool, value, persistent);
        }
    }

    setBooleanValue(boolean, value, persistent) {
        const validValues = ['on', 'off', '1', '0', 'true', 'false'];
        if (!validValues.includes(value.toLowerCase())) {
            this.terminal.writeln(`setsebool: Invalid value ${value} for boolean ${boolean}`);
            return;
        }

        // Simulate setting the boolean
        const isOn = ['on', '1', 'true'].includes(value.toLowerCase());
        const statusText = isOn ? 'on' : 'off';
        
        if (persistent) {
            this.terminal.writeln(`libsemanage.semanage_set_default_priority: Setting default priority for ${boolean} to ${statusText}`);
        }
        
        // For Oracle-related booleans, provide relevant feedback
        if (boolean.includes('oracle')) {
            this.terminal.writeln(`Oracle SELinux boolean ${boolean} set to ${statusText}`);
        }
        
        // setsebool typically runs silently on success
    }

    // Package management state methods
    loadPackageState() {
        try {
            const savedState = localStorage.getItem('installedPackages');
            if (savedState) {
                const loadedPackages = JSON.parse(savedState);
                // Merge with default packages to ensure base system packages exist
                this.installedPackages = { ...this.installedPackages, ...loadedPackages };
            }
        } catch (e) {
            console.warn('Failed to load package state:', e);
        }
    }

    savePackageState() {
        try {
            localStorage.setItem('installedPackages', JSON.stringify(this.installedPackages));
        } catch (e) {
            console.warn('Failed to save package state:', e);
        }
    }

    installPackage(packageName) {
        // Define available packages with their metadata
        const availablePackages = {
            'gcc': { version: '11.2.1-9.el9', repo: 'rhel-9-appstream', arch: 'x86_64' },
            'gcc-c++': { version: '11.2.1-9.el9', repo: 'rhel-9-appstream', arch: 'x86_64' },
            'make': { version: '4.3-7.el9', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'binutils': { version: '2.35.2-17.el9', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'glibc-devel': { version: '2.34-28.el9', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'ksh': { version: '20120801-255.el9', repo: 'rhel-9-appstream', arch: 'x86_64' },
            'libaio': { version: '0.3.111-13.el9', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'libaio-devel': { version: '0.3.111-13.el9', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'libgcc': { version: '11.2.1-9.el9', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'libstdc++': { version: '11.2.1-9.el9', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'libstdc++-devel': { version: '11.2.1-9.el9', repo: 'rhel-9-appstream', arch: 'x86_64' },
            'libxcb': { version: '1.13.1-9.el9', repo: 'rhel-9-appstream', arch: 'x86_64' },
            'libX11': { version: '1.7.0-7.el9', repo: 'rhel-9-appstream', arch: 'x86_64' },
            'libXau': { version: '1.0.9-8.el9', repo: 'rhel-9-appstream', arch: 'x86_64' },
            'libXi': { version: '1.7.10-8.el9', repo: 'rhel-9-appstream', arch: 'x86_64' },
            'libXtst': { version: '1.2.3-16.el9', repo: 'rhel-9-appstream', arch: 'x86_64' },
            'libXrender': { version: '0.9.10-16.el9', repo: 'rhel-9-appstream', arch: 'x86_64' },
            'libXrender-devel': { version: '0.9.10-16.el9', repo: 'rhel-9-appstream', arch: 'x86_64' },
            'net-tools': { version: '2.0-0.62.20160912git.el9', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'nfs-utils': { version: '2.5.4-10.el9', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'smartmontools': { version: '7.2-6.el9', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'sysstat': { version: '12.5.4-2.el9', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'unixODBC': { version: '2.3.9-5.el9', repo: 'rhel-9-appstream', arch: 'x86_64' },
            'unixODBC-devel': { version: '2.3.9-5.el9', repo: 'rhel-9-appstream', arch: 'x86_64' },
            'oracle-database-preinstall-19c': { version: '1.0-1.el9', repo: 'rhel-9-appstream', arch: 'x86_64' },
            'compat-libstdc++-33': { version: '3.2.3-72.el9', repo: 'rhel-9-appstream', arch: 'x86_64' },
            'vim': { version: '8.2.2637-16.el9', repo: 'rhel-9-appstream', arch: 'x86_64' },
            'wget': { version: '1.21.1-7.el9', repo: 'rhel-9-appstream', arch: 'x86_64' },
            'curl': { version: '7.76.1-14.el9', repo: 'rhel-9-baseos', arch: 'x86_64' },
            'unzip': { version: '6.0-56.el9', repo: 'rhel-9-baseos', arch: 'x86_64' }
        };

        if (availablePackages[packageName]) {
            this.installedPackages[packageName] = availablePackages[packageName];
            this.savePackageState();
            return true;
        }
        return false;
    }

    removePackage(packageName) {
        if (this.installedPackages[packageName]) {
            delete this.installedPackages[packageName];
            this.savePackageState();
            return true;
        }
        return false;
    }

    isPackageInstalled(packageName) {
        return this.installedPackages.hasOwnProperty(packageName);
    }

    // Service state management
    loadServiceStates() {
        try {
            const saved = localStorage.getItem('systemdServiceStates');
            if (saved) {
                this.serviceStates = { ...this.serviceStates, ...JSON.parse(saved) };
            }
        } catch (e) {
            // Use default states if loading fails
        }
    }

    saveServiceStates() {
        try {
            localStorage.setItem('systemdServiceStates', JSON.stringify(this.serviceStates));
        } catch (e) {
            // Silently fail if localStorage is not available
        }
    }

    getServiceStatus(serviceName) {
        // Remove .service suffix if present
        const name = serviceName.replace(/\.service$/, '');
        return this.serviceStates[name] || { status: 'not-found', enabled: false };
    }

    setServiceStatus(serviceName, status, enabled = null) {
        const name = serviceName.replace(/\.service$/, '');
        if (!this.serviceStates[name]) {
            this.serviceStates[name] = { status: 'inactive', enabled: false };
        }
        this.serviceStates[name].status = status;
        if (enabled !== null) {
            this.serviceStates[name].enabled = enabled;
        }
        this.saveServiceStates();
    }

    cmdSet(args) {
        if (args.length === 0) {
            // Show all environment variables
            Object.entries(this.environmentVars).forEach(([key, value]) => {
                this.terminal.writeln(`${key}=${value}`);
            });
        } else {
            // Set variable
            const expr = args.join(' ');
            const match = expr.match(/^([A-Z_]+)=(.*)$/);
            if (match) {
                this.environmentVars[match[1]] = match[2];
            } else {
                this.terminal.writeln(`-bash: set: ${expr}: invalid assignment`);
            }
        }
    }

    cmdUnset(args) {
        if (args.length === 0) {
            this.terminal.writeln('unset: usage: unset [-v] [name ...]');
        } else {
            args.forEach(varName => {
                if (this.environmentVars.hasOwnProperty(varName)) {
                    delete this.environmentVars[varName];
                }
            });
        }
    }

    cmdExport(args) {
        if (args.length === 0) {
            Object.entries(this.environmentVars).forEach(([key, value]) => {
                this.terminal.writeln(`declare -x ${key}="${value}"`);
            });
        } else {
            const expr = args.join(' ');
            const match = expr.match(/^([A-Z_]+)=(.*)$/);
            if (match) {
                this.environmentVars[match[1]] = match[2];
            }
        }
    }

    cmdEnv() {
        Object.entries(this.environmentVars).forEach(([key, value]) => {
            this.terminal.writeln(`${key}=${value}`);
        });
    }

    cmdGroupadd(args) {
        if (args.length === 0) {
            this.terminal.writeln('Usage: groupadd [options] GROUP');
        } else {
            const group = args[args.length - 1];
            
            // Check if group already exists
            const groupContent = this.fs.cat('/etc/group');
            if (groupContent && groupContent.includes(`${group}:x:`)) {
                this.terminal.writeln(`groupadd: group '${group}' already exists`);
                return;
            }
            
            // Get next available GID
            const gid = this.fs.getNextGid();
            
            // Add group to /etc/group
            const newGroupLine = `${group}:x:${gid}:`;
            const updatedContent = groupContent ? groupContent + '\n' + newGroupLine : newGroupLine;
            this.fs.updateFile('/etc/group', updatedContent);
            
            this.terminal.writeln(`Group '${group}' added successfully.`);
            
            // Refresh Oracle state to update OCP status
            this.refreshOracleState();
        }
    }

    cmdUseradd(args) {
        if (args.length === 0) {
            this.terminal.writeln('Usage: useradd [options] LOGIN');
            return;
        }
        
        let groups = [];
        let shell = '/bin/bash';
        let homeDir = null;
        let createHome = true;
        let i = 0;
        
        // Parse options
        while (i < args.length - 1) {
            if (args[i] === '-g') {
                groups.push(args[i + 1]);
                i += 2;
            } else if (args[i] === '-G') {
                groups = groups.concat(args[i + 1].split(','));
                i += 2;
            } else if (args[i] === '-s') {
                shell = args[i + 1];
                i += 2;
            } else if (args[i] === '-d') {
                homeDir = args[i + 1];
                i += 2;
            } else if (args[i] === '-M') {
                createHome = false;
                i++;
            } else {
                i++;
            }
        }
        
        const user = args[args.length - 1];
        
        // Check if user already exists
        const passwdContent = this.fs.cat('/etc/passwd');
        if (passwdContent && passwdContent.includes(`${user}:x:`)) {
            this.terminal.writeln(`useradd: user '${user}' already exists`);
            return;
        }
        
        // Get next available UID
        const uid = this.fs.getNextUid();
        
        // Determine primary group (create if not specified)
        let primaryGid = uid;
        const groupContent = this.fs.cat('/etc/group');
        
        if (groups.length > 0) {
            // Find the GID of the first group
            const groupLines = groupContent.split('\n');
            for (const line of groupLines) {
                const parts = line.split(':');
                if (parts[0] === groups[0]) {
                    primaryGid = parts[2];
                    break;
                }
            }
        } else {
            // Create a new group with the same name as the user
            const newGroupLine = `${user}:x:${uid}:`;
            const updatedGroupContent = groupContent ? groupContent + '\n' + newGroupLine : newGroupLine;
            this.fs.updateFile('/etc/group', updatedGroupContent);
        }
        
        // Set home directory
        if (!homeDir) {
            homeDir = `/home/${user}`;
        }
        
        // Add user to /etc/passwd
        const newUserLine = `${user}:x:${uid}:${primaryGid}:${user}:${homeDir}:${shell}`;
        const updatedPasswdContent = passwdContent ? passwdContent + '\n' + newUserLine : newUserLine;
        this.fs.updateFile('/etc/passwd', updatedPasswdContent);
        
        // Add user to additional groups
        if (groups.length > 1 || (groups.length === 1 && groups[0] !== user)) {
            let updatedGroupContent = this.fs.cat('/etc/group');
            const groupLines = updatedGroupContent.split('\n');
            
            for (let i = 0; i < groupLines.length; i++) {
                const parts = groupLines[i].split(':');
                if (groups.includes(parts[0])) {
                    // Add user to this group
                    if (parts[3]) {
                        groupLines[i] = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]},${user}`;
                    } else {
                        groupLines[i] = `${parts[0]}:${parts[1]}:${parts[2]}:${user}`;
                    }
                }
            }
            
            this.fs.updateFile('/etc/group', groupLines.join('\n'));
        }
        
        // Create home directory
        if (createHome && !this.fs.exists(homeDir)) {
            const homeParts = homeDir.split('/').filter(p => p);
            let currentPath = '';
            
            // Create parent directories if needed
            for (let i = 0; i < homeParts.length - 1; i++) {
                currentPath += '/' + homeParts[i];
                if (!this.fs.exists(currentPath)) {
                    this.fs.mkdir(currentPath);
                }
            }
            
            // Create the home directory
            this.fs.mkdir(homeDir);
            
            // Update ownership of the home directory
            const pathArray = this.fs.resolvePath(homeDir);
            const node = this.fs.getNode(pathArray);
            if (node) {
                node.owner = user;
                node.group = groups[0] || user;
                node.permissions = 'drwx------';
            }
        }
        
        this.terminal.writeln(`User '${user}' added successfully.`);
        
        // Refresh Oracle state to update OCP status
        this.refreshOracleState();
    }

    cmdPasswd(args) {
        const user = args[0] || this.fs.currentUser;
        this.terminal.writeln(`Changing password for user ${user}.`);
        this.terminal.writeln('New password: ');
        this.terminal.writeln('Retype new password: ');
        this.terminal.writeln('passwd: all authentication tokens updated successfully.');
    }

    cmdId(args) {
        const user = args[0] || this.fs.currentUser;
        
        // Read passwd file to get user info
        const passwdContent = this.fs.cat('/etc/passwd');
        if (!passwdContent) {
            this.terminal.writeln(`id: '${user}': no such user`);
            return;
        }
        
        const passwdLines = passwdContent.split('\n');
        let uid = null;
        let gid = null;
        let username = null;
        
        for (const line of passwdLines) {
            const parts = line.split(':');
            if (parts[0] === user) {
                username = parts[0];
                uid = parts[2];
                gid = parts[3];
                break;
            }
        }
        
        if (!uid) {
            this.terminal.writeln(`id: '${user}': no such user`);
            return;
        }
        
        // Read group file to get group info
        const groupContent = this.fs.cat('/etc/group');
        const groupLines = groupContent.split('\n');
        let groups = [];
        let primaryGroup = null;
        
        for (const line of groupLines) {
            const parts = line.split(':');
            if (parts[2] === gid) {
                primaryGroup = parts[0];
            }
            // Check if user is in this group
            const members = parts[3] ? parts[3].split(',') : [];
            if (members.includes(user) || parts[2] === gid) {
                groups.push(`${parts[2]}(${parts[0]})`);
            }
        }
        
        const output = `uid=${uid}(${username}) gid=${gid}(${primaryGroup}) groups=${groups.join(',')}`;
        this.terminal.writeln(output);
    }

    cmdSu(args) {
        let targetUser = 'root'; // Default to root if no user specified
        let loginShell = false; // Whether to use login shell (with -)
        
        // Parse arguments
        if (args[0] === '-' && args[1]) {
            // su - username
            targetUser = args[1];
            loginShell = true;
        } else if (args[0] && args[0] !== '-') {
            // su username
            targetUser = args[0];
        } else if (args.length === 0) {
            // su (no arguments - default to root)
            targetUser = 'root';
        }
        
        // Validate user exists by checking /etc/passwd
        const passwdContent = this.fs.cat('/etc/passwd');
        if (!passwdContent) {
            this.terminal.writeln('su: Authentication failure');
            return;
        }
        
        // Check if target user exists in passwd file
        const userExists = passwdContent.split('\n').some(line => {
            if (line.trim() === '') return false;
            const username = line.split(':')[0];
            return username === targetUser;
        });
        
        if (!userExists) {
            this.terminal.writeln(`su: user ${targetUser} does not exist`);
            return;
        }
        
        // Special handling for oracle user - check if home directory exists
        if (targetUser === 'oracle') {
            if (!this.fs.exists('/home/oracle')) {
                this.terminal.writeln(`su: warning: cannot change directory to /home/oracle: No such file or directory`);
                this.terminal.writeln(`su: user ${targetUser} does not exist or no home directory`);
                return;
            }
        }
        
        // If we get here, user is valid - proceed with user switch
        this.userStack.push(targetUser);
        this.fs.currentUser = targetUser;
        this.environmentVars.USER = targetUser;
        
        if (loginShell || args.length === 0) {
            // Login shell - change to user's home directory and set full environment
            if (targetUser === 'root') {
                this.environmentVars.HOME = '/root';
                this.fs.cd('/root');
            } else {
                this.environmentVars.HOME = `/home/${targetUser}`;
                if (this.fs.exists(`/home/${targetUser}`)) {
                    this.fs.cd(`/home/${targetUser}`);
                } else {
                    // Fallback to root if home doesn't exist
                    this.fs.cd('/');
                }
            }
            
            // Set additional environment variables for login shell
            if (targetUser === 'oracle') {
                this.environmentVars.ORACLE_BASE = '/u01/app/oracle';
                this.environmentVars.ORACLE_HOME = '/u01/app/oracle/product/19.0.0/dbhome_1';
                this.environmentVars.ORACLE_SID = 'ORCL';
                this.environmentVars.PATH = this.environmentVars.PATH + ':/u01/app/oracle/product/19.0.0/dbhome_1/bin';
            }
        } else {
            // Non-login shell - keep current directory and minimal environment changes
            this.environmentVars.HOME = targetUser === 'root' ? '/root' : `/home/${targetUser}`;
        }
    }

    cmdExit() {
        if (this.userStack.length > 1) {
            // Pop current user
            this.userStack.pop();
            // Get previous user
            const previousUser = this.userStack[this.userStack.length - 1];
            this.fs.currentUser = previousUser;
            this.environmentVars.USER = previousUser;
            this.environmentVars.HOME = previousUser === 'root' ? '/root' : `/home/${previousUser}`;
            this.terminal.writeln('exit');
        } else {
            this.terminal.writeln('logout');
            this.terminal.writeln('Connection to proddb01sim closed.');
        }
    }

    cmdVim(args) {
        if (args.length === 0) {
            this.terminal.writeln('VIM - Vi IMproved 8.2');
            this.terminal.writeln('');
            this.terminal.writeln('Usage: vim [file]');
            return;
        }
        
        const filename = args[0];
        let content = '';
        let fullPath = filename;
        
        // Resolve the full path
        if (!filename.startsWith('/')) {
            fullPath = this.fs.pwd() === '/' ? `/${filename}` : `${this.fs.pwd()}/${filename}`;
        }
        
        // Check if file exists and get content
        if (this.fs.exists(fullPath)) {
            if (this.fs.isDirectory(fullPath)) {
                this.terminal.writeln(`vim: ${filename}: is a directory`);
                return;
            }
            content = this.fs.cat(fullPath) || '';
        } else {
            // Check if parent directory exists
            const pathParts = fullPath.split('/');
            pathParts.pop(); // Remove filename
            const parentPath = pathParts.join('/') || '/';
            
            if (!this.fs.exists(parentPath)) {
                this.terminal.writeln(`vim: ${filename}: No such file or directory`);
                return;
            }
        }
        
        // Open the vim modal with the file
        this.openVimModal(fullPath, content);
    }

    preserveRootFolder() {
        try {
            // Get the current /root folder contents
            const rootPath = this.fs.resolvePath('/root');
            const rootNode = this.fs.getNode(rootPath);
            
            if (rootNode && rootNode.type === 'directory' && rootNode.children) {
                // Save the /root folder contents to a separate localStorage key
                localStorage.setItem('preservedRootFolder', JSON.stringify(rootNode.children));
                console.log('Preserved /root folder contents for reboot');
            }
        } catch (e) {
            console.warn('Failed to preserve /root folder contents:', e);
        }
    }

    restoreRootFolder() {
        try {
            const preserved = localStorage.getItem('preservedRootFolder');
            if (preserved) {
                const rootContents = JSON.parse(preserved);
                
                // Get the /root folder node in the fresh filesystem
                const rootPath = this.fs.resolvePath('/root');
                const rootNode = this.fs.getNode(rootPath);
                
                if (rootNode && rootNode.type === 'directory') {
                    // Restore the preserved contents
                    rootNode.children = { ...rootNode.children, ...rootContents };
                    
                    // Save the filesystem state to persist the restored files
                    this.fs.saveState();
                    console.log('Restored /root folder contents after reboot');
                }
            }
        } catch (e) {
            console.warn('Failed to restore /root folder contents:', e);
        }
    }

    cmdReboot() {
        if (this.fs.currentUser !== 'root') {
            this.terminal.writeln('reboot: must be superuser.');
            return;
        }
        
        this.terminal.writeln('');
        this.terminal.writeln('Broadcast message from root@proddb01sim');
        this.terminal.writeln('\t(/dev/pts/0) at ' + new Date().toTimeString().slice(0, 5) + ' ...');
        this.terminal.writeln('');
        this.terminal.writeln('The system is going down for reboot NOW!');
        this.terminal.writeln('');
        
        // Clear localStorage and reload
        setTimeout(() => {
            // Preserve /root folder contents before reboot
            this.preserveRootFolder();
            
            oracleManager.clearState();
            localStorage.removeItem('fileSystemState');
            localStorage.removeItem('installedPackages');
            localStorage.removeItem('systemdServiceStates');
            localStorage.removeItem('selinuxState');
            this.clearHistory();
            location.reload();
        }, 1000);
    }

    cmdOCP(args) {
        // Handle help flag
        if (args.includes('--help') || args.includes('-h')) {
            this.terminal.writeln('');
            this.terminal.writeln('\x1b[33m=== Oracle Certification Practice (OCP) Command Help ===\x1b[0m');
            this.terminal.writeln('');
            this.terminal.writeln('\x1b[36mUSAGE:\x1b[0m');
            this.terminal.writeln('  ocp [OPTIONS]');
            this.terminal.writeln('');
            this.terminal.writeln('\x1b[36mDESCRIPTION:\x1b[0m');
            this.terminal.writeln('  The OCP command provides comprehensive Oracle Database Administration');
            this.terminal.writeln('  training and progress tracking for Oracle Certified Professional exam');
            this.terminal.writeln('  preparation. It guides students through installation, configuration,');
            this.terminal.writeln('  administration, and troubleshooting scenarios.');
            this.terminal.writeln('');
            this.terminal.writeln('\x1b[36mOPTIONS:\x1b[0m');
            this.terminal.writeln('  \x1b[32m--help, -h\x1b[0m          Show this help message and exit');
            this.terminal.writeln('  \x1b[32m--hint\x1b[0m              Show hint for next task');
            this.terminal.writeln('  \x1b[32m--hint-detail\x1b[0m       Show detailed hints with commands and explanations');
            this.terminal.writeln('  \x1b[32m--learn\x1b[0m             Show comprehensive learning materials for next task');
            this.terminal.writeln('  \x1b[32m--scenarios\x1b[0m         List available practice scenarios');
            this.terminal.writeln('  \x1b[32m--simulate <type>\x1b[0m   Run specific troubleshooting scenario');
            this.terminal.writeln('');
            this.terminal.writeln('\x1b[36mSIMULATION TYPES:\x1b[0m');
            this.terminal.writeln('  \x1b[32mperformance\x1b[0m         Database performance troubleshooting');
            this.terminal.writeln('  \x1b[32mrecovery\x1b[0m            Backup and recovery scenarios');
            this.terminal.writeln('  \x1b[32msecurity\x1b[0m            Security configuration and user management');
            this.terminal.writeln('  \x1b[32mnetwork\x1b[0m             Network connectivity and listener issues');
            this.terminal.writeln('  \x1b[32mstorage\x1b[0m             Storage and tablespace management');
            this.terminal.writeln('');
            this.terminal.writeln('\x1b[36mAVAILABLE ORACLE COMMANDS:\x1b[0m');
            this.terminal.writeln('  \x1b[33mInstallation & Setup:\x1b[0m');
            this.terminal.writeln('    runInstaller        Oracle Database software installation');
            this.terminal.writeln('    dbca                Database Configuration Assistant');
            this.terminal.writeln('    netca               Network Configuration Assistant');
            this.terminal.writeln('    opatch              Oracle patch management utility');
            this.terminal.writeln('');
            this.terminal.writeln('  \x1b[33mDatabase Administration:\x1b[0m');
            this.terminal.writeln('    sqlplus             SQL*Plus interactive SQL interface');
            this.terminal.writeln('    lsnrctl             Listener control utility');
            this.terminal.writeln('    srvctl              Server control utility (RAC/Grid)');
            this.terminal.writeln('    adrci               Automatic Diagnostic Repository interface');
            this.terminal.writeln('    orapwd              Oracle password file utility');
            this.terminal.writeln('    tnsping             TNS connectivity test utility');
            this.terminal.writeln('');
            this.terminal.writeln('  \x1b[33mBackup & Recovery:\x1b[0m');
            this.terminal.writeln('    rman                Recovery Manager for backup/recovery');
            this.terminal.writeln('    expdp               Data Pump export utility');
            this.terminal.writeln('    impdp               Data Pump import utility');
            this.terminal.writeln('');
            this.terminal.writeln('  \x1b[33mPerformance Monitoring:\x1b[0m');
            this.terminal.writeln('    awrrpt              Automatic Workload Repository reports');
            this.terminal.writeln('    addmrpt             Automatic Database Diagnostic Monitor');
            this.terminal.writeln('');
            this.terminal.writeln('\x1b[36mSQL*PLUS ENHANCED COMMANDS:\x1b[0m');
            this.terminal.writeln('  \x1b[33mPerformance Views:\x1b[0m');
            this.terminal.writeln('    SELECT * FROM V$SGA;              Show System Global Area info');
            this.terminal.writeln('    SELECT * FROM V$PROCESS;          Show database processes');
            this.terminal.writeln('    SELECT * FROM V$SESSION;          Show active sessions');
            this.terminal.writeln('    SELECT * FROM V$PARAMETER;        Show database parameters');
            this.terminal.writeln('');
            this.terminal.writeln('  \x1b[33mParameter Management:\x1b[0m');
            this.terminal.writeln('    SHOW PARAMETER <name>             Show specific parameter');
            this.terminal.writeln('    ALTER SYSTEM SET <param>=<value>  Change parameter dynamically');
            this.terminal.writeln('');
            this.terminal.writeln('\x1b[36mRMAN ENHANCED COMMANDS:\x1b[0m');
            this.terminal.writeln('  \x1b[33mBackup Types:\x1b[0m');
            this.terminal.writeln('    BACKUP DATABASE;                  Full database backup');
            this.terminal.writeln('    BACKUP INCREMENTAL LEVEL 0 DATABASE;  Level 0 incremental');
            this.terminal.writeln('    BACKUP INCREMENTAL LEVEL 1 DATABASE;  Level 1 incremental');
            this.terminal.writeln('    BACKUP AS COMPRESSED BACKUPSET DATABASE;  Compressed backup');
            this.terminal.writeln('');
            this.terminal.writeln('  \x1b[33mBackup Management:\x1b[0m');
            this.terminal.writeln('    LIST BACKUP;                      List all backups');
            this.terminal.writeln('    VALIDATE BACKUPSET;               Validate backup integrity');
            this.terminal.writeln('    VALIDATE DATABASE;                Validate database files');
            this.terminal.writeln('');
            this.terminal.writeln('  \x1b[33mRestore & Recovery:\x1b[0m');
            this.terminal.writeln('    RESTORE DATABASE;                 Restore database from backup');
            this.terminal.writeln('    RECOVER DATABASE;                 Apply redo logs for recovery');
            this.terminal.writeln('');
            this.terminal.writeln('\x1b[36mEXAMPLE WORKFLOWS:\x1b[0m');
            this.terminal.writeln('  \x1b[33m1. Check installation progress:\x1b[0m');
            this.terminal.writeln('     ocp');
            this.terminal.writeln('');
            this.terminal.writeln('  \x1b[33m2. Get detailed guidance:\x1b[0m');
            this.terminal.writeln('     ocp --learn');
            this.terminal.writeln('');
            this.terminal.writeln('  \x1b[33m3. Practice performance troubleshooting:\x1b[0m');
            this.terminal.writeln('     ocp --simulate performance');
            this.terminal.writeln('     awrrpt');
            this.terminal.writeln('     sqlplus / as sysdba');
            this.terminal.writeln('     SQL> SELECT * FROM V$SGA;');
            this.terminal.writeln('');
            this.terminal.writeln('  \x1b[33m4. Practice backup procedures:\x1b[0m');
            this.terminal.writeln('     ocp --simulate recovery');
            this.terminal.writeln('     rman target /');
            this.terminal.writeln('     RMAN> BACKUP INCREMENTAL LEVEL 1 DATABASE;');
            this.terminal.writeln('');
            this.terminal.writeln('  \x1b[33m5. Check patch status:\x1b[0m');
            this.terminal.writeln('     opatch lsinventory');
            this.terminal.writeln('');
            this.terminal.writeln('\x1b[36mNOTES:\x1b[0m');
            this.terminal.writeln('  • This simulator provides realistic Oracle DBA training scenarios');
            this.terminal.writeln('  • All commands simulate real Oracle behavior without actual database files');
            this.terminal.writeln('  • Perfect for OCP certification exam preparation');
            this.terminal.writeln('  • Use colored output for better learning experience');
            this.terminal.writeln('  • Progress is tracked automatically as you complete tasks');
            this.terminal.writeln('');
            this.terminal.writeln('\x1b[32mFor more help on specific commands, try:\x1b[0m');
            this.terminal.writeln('  sqlplus --help        (SQL*Plus help)');
            this.terminal.writeln('  rman --help           (RMAN help)');
            this.terminal.writeln('  opatch --help         (OPatch help)');
            this.terminal.writeln('');
            return;
        }
        
        this.refreshOracleState();
        const progress = oracleManager.calculateProgress();
        
        this.terminal.writeln('');
        this.terminal.writeln('Oracle Installation Progress Check');
        this.terminal.writeln('==================================');
        this.terminal.writeln('');
        this.terminal.writeln(`Completed: ${progress.completed} of ${progress.total} tasks (${progress.percentage}%)`);
        this.terminal.writeln('');
        
        // Progress bar
        const barLength = 50;
        const filled = Math.round((progress.percentage / 100) * barLength);
        const empty = barLength - filled;
        this.terminal.writeln('[' + '█'.repeat(filled) + '░'.repeat(empty) + ']');
        this.terminal.writeln('');
        
        // Show individual task status
        this.terminal.writeln('Task Status:');
        this.terminal.writeln('------------');
        Object.entries(progress.tasks).forEach(([taskName, isComplete]) => {
            const status = isComplete ? '✓' : '✗';
            const color = isComplete ? '\x1b[32m' : '\x1b[31m'; // Green for complete, red for incomplete
            this.terminal.writeln(`${color}${status}\x1b[0m ${taskName}`);
        });
        this.terminal.writeln('');
        
        // Handle hints and learning guidance
        if (args.includes('--hint') || args.includes('--hint-detail') || args.includes('--learn')) {
            const nextTask = oracleManager.getNextTask();
            if (nextTask) {
                this.terminal.writeln('Next Task:');
                this.terminal.writeln('----------');
                this.terminal.writeln(`\x1b[33m${nextTask.title}\x1b[0m`);
                this.terminal.writeln(nextTask.hint);
                this.terminal.writeln('');
                
                if (args.includes('--hint-detail') || args.includes('--learn')) {
                    this.terminal.writeln('Commands to execute:');
                    this.terminal.writeln('-------------------');
                    nextTask.commands.forEach(cmd => {
                        this.terminal.writeln(`  \x1b[36m${cmd}\x1b[0m`);
                    });
                    this.terminal.writeln('');
                    
                    if (nextTask.explanation) {
                        this.terminal.writeln('Why this is important:');
                        this.terminal.writeln('---------------------');
                        this.terminal.writeln(nextTask.explanation);
                        this.terminal.writeln('');
                    }
                    
                    if (nextTask.troubleshooting) {
                        this.terminal.writeln('Common Issues & Solutions:');
                        this.terminal.writeln('-------------------------');
                        nextTask.troubleshooting.forEach(issue => {
                            this.terminal.writeln(`\x1b[31mProblem:\x1b[0m ${issue.problem}`);
                            this.terminal.writeln(`\x1b[32mSolution:\x1b[0m ${issue.solution}`);
                            this.terminal.writeln('');
                        });
                    }
                }
            } else {
                this.terminal.writeln('\x1b[32mAll primary tasks completed!\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('Advanced Practice Tasks:');
                this.terminal.writeln('------------------------');
                this.terminal.writeln('1. Performance Tuning: Run "awrrpt" to generate AWR report');
                this.terminal.writeln('2. ADDM Analysis: Run "addmrpt" for database diagnostics');
                this.terminal.writeln('3. Patch Management: Use "opatch lsinventory" to check patches');
                this.terminal.writeln('4. Backup Strategy: Practice RMAN backup scenarios');
                this.terminal.writeln('5. Troubleshooting: Run "ocp --scenarios" for error simulations');
                this.terminal.writeln('');
            }
        }
        
        // Show available scenarios for practice
        if (args.includes('--scenarios')) {
            this.terminal.writeln('Practice Scenarios Available:');
            this.terminal.writeln('============================');
            this.terminal.writeln('');
            this.terminal.writeln('1. \x1b[33mDatabase Performance Issues\x1b[0m');
            this.terminal.writeln('   Command: ocp --simulate performance');
            this.terminal.writeln('   Practice SQL tuning, AWR analysis, and memory optimization');
            this.terminal.writeln('');
            this.terminal.writeln('2. \x1b[33mBackup and Recovery Scenarios\x1b[0m');
            this.terminal.writeln('   Command: ocp --simulate recovery');
            this.terminal.writeln('   Practice RMAN backups, point-in-time recovery, and corruption handling');
            this.terminal.writeln('');
            this.terminal.writeln('3. \x1b[33mSecurity Configuration\x1b[0m');
            this.terminal.writeln('   Command: ocp --simulate security');
            this.terminal.writeln('   Practice user management, auditing, and encryption setup');
            this.terminal.writeln('');
            this.terminal.writeln('4. \x1b[33mNetwork and Connectivity Issues\x1b[0m');
            this.terminal.writeln('   Command: ocp --simulate network');
            this.terminal.writeln('   Practice listener troubleshooting and TNS configuration');
            this.terminal.writeln('');
            this.terminal.writeln('5. \x1b[33mStorage Management\x1b[0m');
            this.terminal.writeln('   Command: ocp --simulate storage');
            this.terminal.writeln('   Practice tablespace management and space optimization');
            this.terminal.writeln('');
        }
        
        // Simulate specific scenarios
        if (args.includes('--simulate')) {
            const scenario = args[args.indexOf('--simulate') + 1];
            this.simulateScenario(scenario);
        }
        
        // Check if all tasks are complete
        if (progress.percentage === 100) {
            this.terminal.writeln('\x1b[32m✓ Congratulations! All Oracle installation tasks are complete!\x1b[0m');
            this.terminal.writeln('');
            this.terminal.writeln('Would you like to play a game? (yes/no)');
            
            // Set up a flag to track if we're waiting for game response
            this.waitingForGameResponse = true;
        }
    }

    // Simulate practice scenarios
    simulateScenario(scenario) {
        switch(scenario) {
            case 'performance':
                this.terminal.writeln('\x1b[33m=== Performance Troubleshooting Scenario ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('Scenario: Database performance has degraded significantly.');
                this.terminal.writeln('Users are complaining about slow response times.');
                this.terminal.writeln('');
                this.terminal.writeln('Your tasks:');
                this.terminal.writeln('1. Generate AWR report: awrrpt');
                this.terminal.writeln('2. Check current sessions: sqlplus / as sysdba');
                this.terminal.writeln('   Then run: SELECT * FROM V$SESSION;');
                this.terminal.writeln('3. Check SGA usage: SELECT * FROM V$SGA;');
                this.terminal.writeln('4. Generate ADDM report: addmrpt');
                this.terminal.writeln('5. Check database parameters: SHOW PARAMETER sga');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[32mHint: Start with AWR report to identify top wait events\x1b[0m');
                break;
                
            case 'recovery':
                this.terminal.writeln('\x1b[33m=== Backup & Recovery Scenario ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('Scenario: Critical datafile corruption detected!');
                this.terminal.writeln('You need to restore the database from backup.');
                this.terminal.writeln('');
                this.terminal.writeln('Your tasks:');
                this.terminal.writeln('1. Connect to RMAN: rman target /');
                this.terminal.writeln('2. Check backup status: LIST BACKUP;');
                this.terminal.writeln('3. Validate backups: VALIDATE BACKUPSET;');
                this.terminal.writeln('4. Practice full backup: BACKUP DATABASE;');
                this.terminal.writeln('5. Practice incremental backup: BACKUP INCREMENTAL LEVEL 1 DATABASE;');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[32mHint: Always validate backups before attempting recovery\x1b[0m');
                break;
                
            case 'security':
                this.terminal.writeln('\x1b[33m=== Security Configuration Scenario ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('Scenario: Configure database security for production deployment.');
                this.terminal.writeln('Implement user management and auditing.');
                this.terminal.writeln('');
                this.terminal.writeln('Your tasks:');
                this.terminal.writeln('1. Connect as SYSDBA: sqlplus / as sysdba');
                this.terminal.writeln('2. Create user: CREATE USER testuser IDENTIFIED BY password123;');
                this.terminal.writeln('3. Grant privileges: GRANT CONNECT, RESOURCE TO testuser;');
                this.terminal.writeln('4. Enable auditing: ALTER SYSTEM SET audit_trail=DB SCOPE=SPFILE;');
                this.terminal.writeln('5. Create role: CREATE ROLE app_role;');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[32mHint: Follow principle of least privilege for user access\x1b[0m');
                break;
                
            case 'network':
                this.terminal.writeln('\x1b[33m=== Network Troubleshooting Scenario ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('Scenario: Applications cannot connect to the database.');
                this.terminal.writeln('TNS and listener issues need to be resolved.');
                this.terminal.writeln('');
                this.terminal.writeln('Your tasks:');
                this.terminal.writeln('1. Check listener status: lsnrctl status');
                this.terminal.writeln('2. Start listener if needed: lsnrctl start');
                this.terminal.writeln('3. Test connectivity: tnsping ORCL');
                this.terminal.writeln('4. Check listener services: lsnrctl services');
                this.terminal.writeln('5. Test SQL*Plus connection: sqlplus hr/hr@ORCL');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[32mHint: Listener must be running for remote connections\x1b[0m');
                break;
                
            case 'storage':
                this.terminal.writeln('\x1b[33m=== Storage Management Scenario ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('Scenario: Tablespace is running out of space.');
                this.terminal.writeln('Applications are failing with space-related errors.');
                this.terminal.writeln('');
                this.terminal.writeln('Your tasks:');
                this.terminal.writeln('1. Check tablespace usage: sqlplus / as sysdba');
                this.terminal.writeln('2. Query space usage: SELECT TABLESPACE_NAME FROM DBA_TABLESPACES;');
                this.terminal.writeln('3. Check datafile sizes: SELECT * FROM V$DATAFILE;');
                this.terminal.writeln('4. Add datafile: ALTER TABLESPACE USERS ADD DATAFILE \'/u01/app/oracle/oradata/ORCL/users02.dbf\' SIZE 100M;');
                this.terminal.writeln('5. Monitor space usage: SELECT * FROM DBA_FREE_SPACE;');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[32mHint: Monitor tablespace usage proactively to prevent outages\x1b[0m');
                break;
                
            default:
                this.terminal.writeln('Available scenarios: performance, recovery, security, network, storage');
                this.terminal.writeln('Usage: ocp --simulate <scenario_name>');
        }
        this.terminal.writeln('');
    }

    cmdTroubleshoot(args) {
        if (args.length === 0) {
            this.terminal.writeln('\x1b[31m=== Oracle Database Troubleshooting Guide ===\x1b[0m');
            this.terminal.writeln('');
            this.terminal.writeln('Available troubleshooting scenarios:');
            this.terminal.writeln('');
            this.terminal.writeln('\x1b[33mCommon Database Issues:\x1b[0m');
            this.terminal.writeln('  troubleshoot startup         - Database won\'t start');
            this.terminal.writeln('  troubleshoot listener        - Listener connection issues');
            this.terminal.writeln('  troubleshoot tablespace      - Tablespace full errors');
            this.terminal.writeln('  troubleshoot performance     - Slow query performance');
            this.terminal.writeln('  troubleshoot archive         - Archive log issues');
            this.terminal.writeln('  troubleshoot network         - TNS and connectivity problems');
            this.terminal.writeln('');
            this.terminal.writeln('\x1b[33mSystem Issues:\x1b[0m');
            this.terminal.writeln('  troubleshoot memory          - Out of memory errors');
            this.terminal.writeln('  troubleshoot disk            - Disk space problems');
            this.terminal.writeln('  troubleshoot permissions     - File permission issues');
            this.terminal.writeln('  troubleshoot environment     - Environment variable problems');
            this.terminal.writeln('');
            this.terminal.writeln('\x1b[33mInstallation Issues:\x1b[0m');
            this.terminal.writeln('  troubleshoot installation    - Installation failures');
            this.terminal.writeln('  troubleshoot prerequisites   - Missing prerequisites');
            this.terminal.writeln('  troubleshoot patches         - Patch application issues');
            this.terminal.writeln('');
            this.terminal.writeln('Usage: troubleshoot <issue_type>');
            this.terminal.writeln('Example: troubleshoot startup');
            return;
        }

        const issue = args[0].toLowerCase();
        
        switch (issue) {
            case 'startup':
                this.terminal.writeln('\x1b[31m=== Database Startup Issues ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[33mCommon Error: ORA-01034: ORACLE not available\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[91mSymptoms:\x1b[0m');
                this.terminal.writeln('• Cannot connect to database');
                this.terminal.writeln('• sqlplus shows "ORA-01034: ORACLE not available"');
                this.terminal.writeln('• Application connections fail');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[92mDiagnostic Steps:\x1b[0m');
                this.terminal.writeln('1. Check if database processes are running:');
                this.terminal.writeln('   ps -ef | grep pmon');
                this.terminal.writeln('');
                this.terminal.writeln('2. Check ORACLE_SID environment:');
                this.terminal.writeln('   echo $ORACLE_SID');
                this.terminal.writeln('   export ORACLE_SID=ORCL');
                this.terminal.writeln('');
                this.terminal.writeln('3. Try to start database:');
                this.terminal.writeln('   sqlplus / as sysdba');
                this.terminal.writeln('   startup');
                this.terminal.writeln('');
                this.terminal.writeln('4. Check alert log for errors:');
                this.terminal.writeln('   cd $ORACLE_BASE/diag/rdbms/orcl/ORCL/trace');
                this.terminal.writeln('   tail -50 alert_ORCL.log');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[94mCommon Causes & Solutions:\x1b[0m');
                this.terminal.writeln('• Database not started: Run "startup" in SQL*Plus');
                this.terminal.writeln('• Wrong ORACLE_SID: Set correct SID');
                this.terminal.writeln('• Instance crashed: Check alert log for errors');
                this.terminal.writeln('• Insufficient memory: Reduce SGA size');
                this.terminal.writeln('• Corrupt control files: Restore from backup');
                break;
                
            case 'listener':
                this.terminal.writeln('\x1b[31m=== Listener Connection Issues ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[33mCommon Error: TNS-12541: TNS:no listener\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[91mSymptoms:\x1b[0m');
                this.terminal.writeln('• Remote connections fail');
                this.terminal.writeln('• TNS-12541, TNS-12514, TNS-12505 errors');
                this.terminal.writeln('• Applications cannot connect');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[92mDiagnostic Steps:\x1b[0m');
                this.terminal.writeln('1. Check listener status:');
                this.terminal.writeln('   lsnrctl status');
                this.terminal.writeln('');
                this.terminal.writeln('2. Check if listener process is running:');
                this.terminal.writeln('   ps -ef | grep tnslsnr');
                this.terminal.writeln('');
                this.terminal.writeln('3. Test local connectivity:');
                this.terminal.writeln('   tnsping ORCL');
                this.terminal.writeln('');
                this.terminal.writeln('4. Check listener configuration:');
                this.terminal.writeln('   cat $ORACLE_HOME/network/admin/listener.ora');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[94mCommon Solutions:\x1b[0m');
                this.terminal.writeln('• Start listener: lsnrctl start');
                this.terminal.writeln('• Check port 1521: netstat -an | grep 1521');
                this.terminal.writeln('• Verify hostname resolution');
                this.terminal.writeln('• Register database: ALTER SYSTEM REGISTER;');
                this.terminal.writeln('• Check firewall settings: firewall-cmd --list-ports');
                break;
                
            case 'tablespace':
                this.terminal.writeln('\x1b[31m=== Tablespace Full Errors ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[33mCommon Error: ORA-01653: unable to extend table\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[91mSymptoms:\x1b[0m');
                this.terminal.writeln('• INSERT/UPDATE operations fail');
                this.terminal.writeln('• ORA-01653, ORA-01654, ORA-01655 errors');
                this.terminal.writeln('• Database performance degradation');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[92mDiagnostic Commands:\x1b[0m');
                this.terminal.writeln('1. Check tablespace usage:');
                this.terminal.writeln('   sqlplus / as sysdba');
                this.terminal.writeln('   SELECT tablespace_name, bytes/1024/1024 MB FROM dba_data_files;');
                this.terminal.writeln('');
                this.terminal.writeln('2. Find free space:');
                this.terminal.writeln('   SELECT tablespace_name, SUM(bytes)/1024/1024 FREE_MB');
                this.terminal.writeln('   FROM dba_free_space GROUP BY tablespace_name;');
                this.terminal.writeln('');
                this.terminal.writeln('3. Check autoextend status:');
                this.terminal.writeln('   SELECT file_name, autoextensible FROM dba_data_files;');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[94mSolutions:\x1b[0m');
                this.terminal.writeln('• Add datafile: ALTER TABLESPACE USERS ADD DATAFILE');
                this.terminal.writeln('  \'/u01/app/oracle/oradata/ORCL/users02.dbf\' SIZE 100M;');
                this.terminal.writeln('• Enable autoextend: ALTER DATABASE DATAFILE \'/path/file.dbf\'');
                this.terminal.writeln('  AUTOEXTEND ON NEXT 10M MAXSIZE 1G;');
                this.terminal.writeln('• Resize existing datafile: ALTER DATABASE DATAFILE \'/path/file.dbf\'');
                this.terminal.writeln('  RESIZE 500M;');
                break;
                
            case 'performance':
                this.terminal.writeln('\x1b[31m=== Query Performance Issues ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[33mCommon Issue: Slow running queries\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[91mSymptoms:\x1b[0m');
                this.terminal.writeln('• Queries taking longer than expected');
                this.terminal.writeln('• High CPU or I/O usage');
                this.terminal.writeln('• Application timeouts');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[92mDiagnostic Steps:\x1b[0m');
                this.terminal.writeln('1. Identify slow queries:');
                this.terminal.writeln('   sqlplus / as sysdba');
                this.terminal.writeln('   SELECT sql_id, elapsed_time, cpu_time FROM v$sql');
                this.terminal.writeln('   ORDER BY elapsed_time DESC;');
                this.terminal.writeln('');
                this.terminal.writeln('2. Check active sessions:');
                this.terminal.writeln('   SELECT sid, serial#, username, status, program');
                this.terminal.writeln('   FROM v$session WHERE status = \'ACTIVE\';');
                this.terminal.writeln('');
                this.terminal.writeln('3. Generate AWR report:');
                this.terminal.writeln('   awrrpt');
                this.terminal.writeln('');
                this.terminal.writeln('4. Check wait events:');
                this.terminal.writeln('   SELECT event, total_waits, time_waited');
                this.terminal.writeln('   FROM v$system_event ORDER BY time_waited DESC;');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[94mOptimization Techniques:\x1b[0m');
                this.terminal.writeln('• Add indexes for frequently queried columns');
                this.terminal.writeln('• Update table statistics: EXEC DBMS_STATS.GATHER_TABLE_STATS');
                this.terminal.writeln('• Check execution plans: EXPLAIN PLAN FOR <sql>');
                this.terminal.writeln('• Consider partitioning for large tables');
                this.terminal.writeln('• Tune SGA parameters based on AWR recommendations');
                break;
                
            case 'archive':
                this.terminal.writeln('\x1b[31m=== Archive Log Issues ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[33mCommon Error: ORA-00257: archiver error\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[91mSymptoms:\x1b[0m');
                this.terminal.writeln('• Database hangs during transactions');
                this.terminal.writeln('• ORA-00257: archiver error. Connect internal only');
                this.terminal.writeln('• Archive destination full');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[92mDiagnostic Commands:\x1b[0m');
                this.terminal.writeln('1. Check archive log destination:');
                this.terminal.writeln('   sqlplus / as sysdba');
                this.terminal.writeln('   SHOW PARAMETER log_archive_dest_1;');
                this.terminal.writeln('');
                this.terminal.writeln('2. Check archive log status:');
                this.terminal.writeln('   SELECT dest_name, status, error FROM v$archive_dest;');
                this.terminal.writeln('');
                this.terminal.writeln('3. Check disk space:');
                this.terminal.writeln('   df -h /u01/app/oracle/oradata');
                this.terminal.writeln('');
                this.terminal.writeln('4. List archive log files:');
                this.terminal.writeln('   ls -la $ORACLE_BASE/fast_recovery_area/ORCL/archivelog/');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[94mSolutions:\x1b[0m');
                this.terminal.writeln('• Free up disk space in archive destination');
                this.terminal.writeln('• Backup and remove old archive logs with RMAN');
                this.terminal.writeln('• Change archive destination: ALTER SYSTEM SET log_archive_dest_1=...');
                this.terminal.writeln('• Increase fast_recovery_area size');
                this.terminal.writeln('• Set up archive log deletion policy in RMAN');
                break;
                
            case 'memory':
                this.terminal.writeln('\x1b[31m=== Memory Issues ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[33mCommon Error: ORA-04031: unable to allocate memory\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[91mSymptoms:\x1b[0m');
                this.terminal.writeln('• ORA-04031 shared memory errors');
                this.terminal.writeln('• Database startup fails');
                this.terminal.writeln('• System appears slow or unresponsive');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[92mDiagnostic Steps:\x1b[0m');
                this.terminal.writeln('1. Check system memory:');
                this.terminal.writeln('   free -h');
                this.terminal.writeln('   cat /proc/meminfo');
                this.terminal.writeln('');
                this.terminal.writeln('2. Check Oracle memory usage:');
                this.terminal.writeln('   sqlplus / as sysdba');
                this.terminal.writeln('   SHOW PARAMETER sga_target;');
                this.terminal.writeln('   SHOW PARAMETER pga_aggregate_target;');
                this.terminal.writeln('');
                this.terminal.writeln('3. Check shared pool usage:');
                this.terminal.writeln('   SELECT pool, name, bytes/1024/1024 MB FROM v$sgastat');
                this.terminal.writeln('   WHERE pool = \'shared pool\';');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[94mSolutions:\x1b[0m');
                this.terminal.writeln('• Reduce SGA size: ALTER SYSTEM SET sga_target=512M;');
                this.terminal.writeln('• Increase system memory or swap');
                this.terminal.writeln('• Flush shared pool: ALTER SYSTEM FLUSH SHARED_POOL;');
                this.terminal.writeln('• Enable Automatic Memory Management (AMM)');
                this.terminal.writeln('• Check for memory leaks in applications');
                break;
                
            case 'installation':
                this.terminal.writeln('\x1b[31m=== Installation Issues ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[33mCommon Issues: Prerequisites and installation failures\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[92mPre-Installation Checklist:\x1b[0m');
                this.terminal.writeln('1. Check OS requirements:');
                this.terminal.writeln('   cat /etc/redhat-release');
                this.terminal.writeln('   uname -r');
                this.terminal.writeln('');
                this.terminal.writeln('2. Verify required packages:');
                this.terminal.writeln('   yum list installed | grep -E "gcc|make|binutils"');
                this.terminal.writeln('');
                this.terminal.writeln('3. Check kernel parameters:');
                this.terminal.writeln('   sysctl -a | grep -E "shmmax|shmall|sem"');
                this.terminal.writeln('');
                this.terminal.writeln('4. Verify resource limits:');
                this.terminal.writeln('   cat /etc/security/limits.conf | grep oracle');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[94mCommon Installation Fixes:\x1b[0m');
                this.terminal.writeln('• Install missing packages: yum install gcc make binutils');
                this.terminal.writeln('• Set kernel parameters in /etc/sysctl.conf');
                this.terminal.writeln('• Configure resource limits for oracle user');
                this.terminal.writeln('• Ensure sufficient disk space: df -h');
                this.terminal.writeln('• Check /tmp space for installation files');
                this.terminal.writeln('• Verify oracle user and oinstall group exist');
                break;
                
            case 'network':
                this.terminal.writeln('\x1b[31m=== Network Connectivity Issues ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[33mCommon Errors: TNS-12514, TNS-12505, TNS-12543\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[92mNetwork Diagnostics:\x1b[0m');
                this.terminal.writeln('1. Test basic connectivity:');
                this.terminal.writeln('   ping database_server');
                this.terminal.writeln('   telnet database_server 1521');
                this.terminal.writeln('');
                this.terminal.writeln('2. Check TNS configuration:');
                this.terminal.writeln('   cat $ORACLE_HOME/network/admin/tnsnames.ora');
                this.terminal.writeln('   tnsping ORCL');
                this.terminal.writeln('');
                this.terminal.writeln('3. Verify listener configuration:');
                this.terminal.writeln('   cat $ORACLE_HOME/network/admin/listener.ora');
                this.terminal.writeln('   lsnrctl status');
                this.terminal.writeln('');
                this.terminal.writeln('4. Check firewall settings:');
                this.terminal.writeln('   firewall-cmd --list-ports');
                this.terminal.writeln('   iptables -L -n');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[94mCommon Solutions:\x1b[0m');
                this.terminal.writeln('• Open firewall port: firewall-cmd --add-port=1521/tcp --permanent');
                this.terminal.writeln('• Update /etc/hosts with correct hostname/IP mapping');
                this.terminal.writeln('• Restart listener after configuration changes');
                this.terminal.writeln('• Check service names: lsnrctl services');
                this.terminal.writeln('• Verify database is registered with listener');
                break;
                
            case 'disk':
                this.terminal.writeln('\x1b[31m=== Disk Space Issues ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[33mCommon Issues: Disk full, I/O errors\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[92mDisk Space Analysis:\x1b[0m');
                this.terminal.writeln('1. Check overall disk usage:');
                this.terminal.writeln('   df -h');
                this.terminal.writeln('');
                this.terminal.writeln('2. Find large files:');
                this.terminal.writeln('   find /u01 -type f -size +100M -exec ls -lh {} \\;');
                this.terminal.writeln('');
                this.terminal.writeln('3. Check Oracle file sizes:');
                this.terminal.writeln('   ls -lh /u01/app/oracle/oradata/ORCL/*.dbf');
                this.terminal.writeln('');
                this.terminal.writeln('4. Check archive log space:');
                this.terminal.writeln('   du -sh /u01/app/oracle/fast_recovery_area');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[94mSpace Recovery Actions:\x1b[0m');
                this.terminal.writeln('• Remove old archive logs with RMAN');
                this.terminal.writeln('• Clean up trace files: find $ORACLE_BASE -name "*.trc" -mtime +7');
                this.terminal.writeln('• Remove old backup files');
                this.terminal.writeln('• Compress or move non-critical files');
                this.terminal.writeln('• Add storage to filesystem');
                break;
                
            case 'permissions':
                this.terminal.writeln('\x1b[31m=== File Permission Issues ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[33mCommon Issues: Permission denied errors\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[92mPermission Diagnostics:\x1b[0m');
                this.terminal.writeln('1. Check Oracle file ownership:');
                this.terminal.writeln('   ls -la /u01/app/oracle');
                this.terminal.writeln('');
                this.terminal.writeln('2. Verify executable permissions:');
                this.terminal.writeln('   ls -la $ORACLE_HOME/bin/sqlplus');
                this.terminal.writeln('');
                this.terminal.writeln('3. Check directory permissions:');
                this.terminal.writeln('   ls -ld /u01/app/oracle/oradata/ORCL');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[94mPermission Fixes:\x1b[0m');
                this.terminal.writeln('• Fix Oracle ownership: chown -R oracle:oinstall /u01/app/oracle');
                this.terminal.writeln('• Set correct permissions: chmod 755 $ORACLE_HOME/bin/*');
                this.terminal.writeln('• Fix datafile permissions: chmod 640 /u01/app/oracle/oradata/ORCL/*.dbf');
                this.terminal.writeln('• Set directory permissions: chmod 755 /u01/app/oracle/oradata/ORCL');
                break;
                
            case 'environment':
                this.terminal.writeln('\x1b[31m=== Environment Variable Issues ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[33mCommon Issues: Missing or incorrect environment variables\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[92mEnvironment Diagnostics:\x1b[0m');
                this.terminal.writeln('1. Check Oracle environment:');
                this.terminal.writeln('   env | grep ORACLE');
                this.terminal.writeln('');
                this.terminal.writeln('2. Verify required variables:');
                this.terminal.writeln('   echo $ORACLE_HOME');
                this.terminal.writeln('   echo $ORACLE_SID');
                this.terminal.writeln('   echo $PATH');
                this.terminal.writeln('');
                this.terminal.writeln('3. Check profile settings:');
                this.terminal.writeln('   cat ~/.bash_profile | grep ORACLE');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[94mEnvironment Setup:\x1b[0m');
                this.terminal.writeln('• Set ORACLE_HOME: export ORACLE_HOME=/u01/app/oracle/product/19.0.0/dbhome_1');
                this.terminal.writeln('• Set ORACLE_SID: export ORACLE_SID=ORCL');
                this.terminal.writeln('• Update PATH: export PATH=$ORACLE_HOME/bin:$PATH');
                this.terminal.writeln('• Source oraenv: . oraenv');
                this.terminal.writeln('• Add to .bash_profile for persistence');
                break;
                
            case 'prerequisites':
                this.terminal.writeln('\x1b[31m=== Missing Prerequisites ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[33mCommon Issue: Installation prerequisites not met\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[92mPrerequisite Verification:\x1b[0m');
                this.terminal.writeln('1. Check required packages:');
                this.terminal.writeln('   yum list installed | grep -E "gcc|make|binutils|glibc|libaio"');
                this.terminal.writeln('');
                this.terminal.writeln('2. Verify kernel parameters:');
                this.terminal.writeln('   sysctl kernel.shmmax');
                this.terminal.writeln('   sysctl fs.file-max');
                this.terminal.writeln('');
                this.terminal.writeln('3. Check user limits:');
                this.terminal.writeln('   ulimit -a');
                this.terminal.writeln('');
                this.terminal.writeln('4. Verify swap space:');
                this.terminal.writeln('   free -h');
                this.terminal.writeln('   swapon -s');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[94mInstall Prerequisites:\x1b[0m');
                this.terminal.writeln('• Install packages: yum install oracle-database-preinstall-19c');
                this.terminal.writeln('• Or manually: yum install gcc make binutils glibc-devel libaio');
                this.terminal.writeln('• Configure kernel parameters in /etc/sysctl.conf');
                this.terminal.writeln('• Set user limits in /etc/security/limits.conf');
                this.terminal.writeln('• Create oracle user and oinstall group');
                break;
                
            case 'patches':
                this.terminal.writeln('\x1b[31m=== Patch Application Issues ===\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[33mCommon Issues: OPatch failures and conflicts\x1b[0m');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[92mPatch Diagnostics:\x1b[0m');
                this.terminal.writeln('1. Check OPatch version:');
                this.terminal.writeln('   cd $ORACLE_HOME/OPatch');
                this.terminal.writeln('   ./opatch version');
                this.terminal.writeln('');
                this.terminal.writeln('2. List applied patches:');
                this.terminal.writeln('   ./opatch lsinventory');
                this.terminal.writeln('');
                this.terminal.writeln('3. Check patch conflicts:');
                this.terminal.writeln('   ./opatch prereq CheckConflictAgainstOHWithDetail -ph /path/to/patch');
                this.terminal.writeln('');
                this.terminal.writeln('4. Verify patch space requirements:');
                this.terminal.writeln('   ./opatch prereq CheckSystemSpace -ph /path/to/patch');
                this.terminal.writeln('');
                this.terminal.writeln('\x1b[94mPatch Application Best Practices:\x1b[0m');
                this.terminal.writeln('• Always backup ORACLE_HOME before patching');
                this.terminal.writeln('• Stop all Oracle processes before applying patches');
                this.terminal.writeln('• Update OPatch utility first if needed');
                this.terminal.writeln('• Run prereq checks before applying patches');
                this.terminal.writeln('• Test patches in development environment first');
                this.terminal.writeln('• Apply patches during maintenance windows');
                break;
                
            default:
                this.terminal.writeln(`\x1b[91mUnknown issue type: ${issue}\x1b[0m`);
                this.terminal.writeln('');
                this.terminal.writeln('Available troubleshooting topics:');
                this.terminal.writeln('startup, listener, tablespace, performance, archive, memory,');
                this.terminal.writeln('disk, permissions, environment, installation, prerequisites,');
                this.terminal.writeln('patches, network');
                this.terminal.writeln('');
                this.terminal.writeln('Usage: troubleshoot <issue_type>');
        }
        
        this.terminal.writeln('');
        this.terminal.writeln('\x1b[96mFor more help, try: ocp --hint-detail\x1b[0m');
    }

    cmdService(args) {
        if (args.length === 0) {
            this.terminal.writeln('Usage: service <service_name> <action>');
            this.terminal.writeln('');
            this.terminal.writeln('Actions:');
            this.terminal.writeln('  start    - Start the service');
            this.terminal.writeln('  stop     - Stop the service');
            this.terminal.writeln('  restart  - Restart the service');
            this.terminal.writeln('  reload   - Reload service configuration');
            this.terminal.writeln('  status   - Show service status');
            this.terminal.writeln('  enable   - Enable service to start at boot');
            this.terminal.writeln('  disable  - Disable service from starting at boot');
            this.terminal.writeln('');
            this.terminal.writeln('Available services:');
            this.terminal.writeln('  firewalld, sshd, chronyd, httpd, oracle-db, oracle-listener');
            this.terminal.writeln('');
            this.terminal.writeln('Examples:');
            this.terminal.writeln('  service firewalld status');
            this.terminal.writeln('  service httpd start');
            this.terminal.writeln('  service oracle-db enable');
            return;
        }

        if (args.length < 2) {
            this.terminal.writeln('service: missing action');
            this.terminal.writeln('Usage: service <service_name> <action>');
            return;
        }

        const serviceName = args[0];
        const action = args[1];
        const serviceStatus = this.getServiceStatus(serviceName);

        // Check if service exists
        if (serviceStatus.status === 'not-found') {
            this.terminal.writeln(`service: ${serviceName}: unrecognized service`);
            return;
        }

        // Check if user has root privileges for most actions
        if (['start', 'stop', 'restart', 'reload', 'enable', 'disable'].includes(action) && 
            this.fs.currentUser !== 'root') {
            this.terminal.writeln(`service: ${serviceName}: permission denied (you must be root)`);
            return;
        }

        switch (action) {
            case 'start':
                if (serviceStatus.status === 'active') {
                    this.terminal.writeln(`service: ${serviceName}: is already running`);
                } else {
                    this.terminal.writeln(`Starting ${serviceName}:                                        [  OK  ]`);
                    this.setServiceStatus(serviceName, 'active');
                    
                    // Special handling for Oracle services
                    if (serviceName === 'oracle-db') {
                        this.terminal.writeln('Oracle Database 19c started.');
                    } else if (serviceName === 'oracle-listener') {
                        this.terminal.writeln('Oracle Net Listener started.');
                    }
                }
                break;

            case 'stop':
                if (serviceStatus.status === 'inactive') {
                    this.terminal.writeln(`service: ${serviceName}: is already stopped`);
                } else {
                    this.terminal.writeln(`Shutting down ${serviceName}:                                   [  OK  ]`);
                    this.setServiceStatus(serviceName, 'inactive');
                    
                    // Special handling for Oracle services
                    if (serviceName === 'oracle-db') {
                        this.terminal.writeln('Oracle Database 19c stopped.');
                    } else if (serviceName === 'oracle-listener') {
                        this.terminal.writeln('Oracle Net Listener stopped.');
                    }
                }
                break;

            case 'restart':
                this.terminal.writeln(`Shutting down ${serviceName}:                                   [  OK  ]`);
                this.terminal.writeln(`Starting ${serviceName}:                                        [  OK  ]`);
                this.setServiceStatus(serviceName, 'active');
                
                if (serviceName === 'oracle-db') {
                    this.terminal.writeln('Oracle Database 19c restarted.');
                } else if (serviceName === 'oracle-listener') {
                    this.terminal.writeln('Oracle Net Listener restarted.');
                }
                break;

            case 'reload':
                if (serviceStatus.status === 'active') {
                    this.terminal.writeln(`Reloading ${serviceName}:                                       [  OK  ]`);
                } else {
                    this.terminal.writeln(`service: ${serviceName}: is not running`);
                }
                break;

            case 'status':
                const statusText = serviceStatus.status === 'active' ? 'running' : 'stopped';
                const enabledText = serviceStatus.enabled ? 'enabled' : 'disabled';
                
                this.terminal.writeln(`${serviceName} (pid  12345) is ${statusText}...`);
                this.terminal.writeln(`${serviceName} is ${enabledText}`);
                
                // Enhanced status for Oracle services
                if (serviceName === 'oracle-db' && serviceStatus.status === 'active') {
                    this.terminal.writeln('Database Status: OPEN');
                    this.terminal.writeln('Instance Status: STARTED');
                } else if (serviceName === 'oracle-listener' && serviceStatus.status === 'active') {
                    this.terminal.writeln('Listener Status: READY');
                    this.terminal.writeln('Listening on port: 1521');
                }
                break;

            case 'enable':
                this.setServiceStatus(serviceName, serviceStatus.status, true);
                this.terminal.writeln(`${serviceName} enabled for auto-start at boot time`);
                break;

            case 'disable':
                this.setServiceStatus(serviceName, serviceStatus.status, false);
                this.terminal.writeln(`${serviceName} disabled for auto-start at boot time`);
                break;

            default:
                this.terminal.writeln(`service: ${serviceName}: unrecognized action: ${action}`);
                this.terminal.writeln('Valid actions are: start, stop, restart, reload, status, enable, disable');
        }
    }

    cmdTicTacToe() {
        // Initialize Tic-Tac-Toe game
        this.gameBoard = [
            [' ', ' ', ' '],
            [' ', ' ', ' '],
            [' ', ' ', ' ']
        ];
        this.currentPlayer = 'X';
        this.gameActive = true;
        
        this.drawBoard();
        this.terminal.writeln('Your move (1-9):');
    }

    drawBoard() {
        // Clear previous board display and redraw everything in one place
        this.terminal.clear();
        this.terminal.writeln('=== Tic-Tac-Toe ===');
        this.terminal.writeln('You are X, Computer is O');
        this.terminal.writeln('');
        this.terminal.writeln('Position reference:');
        this.terminal.writeln(' 1 | 2 | 3 ');
        this.terminal.writeln('-----------');
        this.terminal.writeln(' 4 | 5 | 6 ');
        this.terminal.writeln('-----------');
        this.terminal.writeln(' 7 | 8 | 9 ');
        this.terminal.writeln('');
        this.terminal.writeln('Current board:');
        for (let i = 0; i < 3; i++) {
            let row = ' ' + this.gameBoard[i][0] + ' | ' + this.gameBoard[i][1] + ' | ' + this.gameBoard[i][2] + ' ';
            this.terminal.writeln(row);
            if (i < 2) this.terminal.writeln('-----------');
        }
        this.terminal.writeln('');
    }

    makeMove(position) {
        const row = Math.floor((position - 1) / 3);
        const col = (position - 1) % 3;
        
        if (this.gameBoard[row][col] !== ' ') {
            this.terminal.writeln('Position already taken! Try again.');
            return false;
        }
        
        this.gameBoard[row][col] = this.currentPlayer;
        return true;
    }

    checkWinner() {
        // Check rows
        for (let i = 0; i < 3; i++) {
            if (this.gameBoard[i][0] !== ' ' && 
                this.gameBoard[i][0] === this.gameBoard[i][1] && 
                this.gameBoard[i][1] === this.gameBoard[i][2]) {
                return this.gameBoard[i][0];
            }
        }
        
        // Check columns
        for (let i = 0; i < 3; i++) {
            if (this.gameBoard[0][i] !== ' ' && 
                this.gameBoard[0][i] === this.gameBoard[1][i] && 
                this.gameBoard[1][i] === this.gameBoard[2][i]) {
                return this.gameBoard[0][i];
            }
        }
        
        // Check diagonals
        if (this.gameBoard[0][0] !== ' ' && 
            this.gameBoard[0][0] === this.gameBoard[1][1] && 
            this.gameBoard[1][1] === this.gameBoard[2][2]) {
            return this.gameBoard[0][0];
        }
        
        if (this.gameBoard[0][2] !== ' ' && 
            this.gameBoard[0][2] === this.gameBoard[1][1] && 
            this.gameBoard[1][1] === this.gameBoard[2][0]) {
            return this.gameBoard[0][2];
        }
        
        // Check for draw
        let isDraw = true;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (this.gameBoard[i][j] === ' ') {
                    isDraw = false;
                    break;
                }
            }
        }
        
        return isDraw ? 'draw' : null;
    }

    computerMove() {
        // Simple AI: Try to win, then block, then take center, then random
        const moves = [];
        
        // Collect all empty positions
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (this.gameBoard[i][j] === ' ') {
                    moves.push({row: i, col: j});
                }
            }
        }
        
        // Try to win
        for (const move of moves) {
            this.gameBoard[move.row][move.col] = 'O';
            if (this.checkWinner() === 'O') {
                return;
            }
            this.gameBoard[move.row][move.col] = ' ';
        }
        
        // Try to block
        for (const move of moves) {
            this.gameBoard[move.row][move.col] = 'X';
            if (this.checkWinner() === 'X') {
                this.gameBoard[move.row][move.col] = 'O';
                return;
            }
            this.gameBoard[move.row][move.col] = ' ';
        }
        
        // Take center if available
        if (this.gameBoard[1][1] === ' ') {
            this.gameBoard[1][1] = 'O';
            return;
        }
        
        // Take a corner
        const corners = [{row: 0, col: 0}, {row: 0, col: 2}, {row: 2, col: 0}, {row: 2, col: 2}];
        for (const corner of corners) {
            if (this.gameBoard[corner.row][corner.col] === ' ') {
                this.gameBoard[corner.row][corner.col] = 'O';
                return;
            }
        }
        
        // Take any available space
        if (moves.length > 0) {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            this.gameBoard[randomMove.row][randomMove.col] = 'O';
        }
    }

    handleGameInput(input) {
        const position = parseInt(input);
        if (isNaN(position) || position < 1 || position > 9) {
            this.terminal.writeln('Invalid input! Please enter a number between 1 and 9.');
            this.terminal.writeln('Your move (1-9):');
            return;
        }
        
        if (this.makeMove(position)) {           
            const winner = this.checkWinner();
            if (winner) {
                this.gameActive = false;
                if (winner === 'draw') {
                    this.terminal.writeln('It\'s a draw!');
                } else if (winner === 'X') {
                    this.terminal.writeln('Congratulations! You win!');
                } else {
                    this.terminal.writeln('Computer wins! Better luck next time.');
                }
                this.terminal.writeln('');
                return;
            }
            
            // Computer's turn
            this.currentPlayer = 'O';
            this.computerMove();
            this.drawBoard();
            
            const winnerAfterComputer = this.checkWinner();
            if (winnerAfterComputer) {
                this.gameActive = false;
                if (winnerAfterComputer === 'draw') {
                    this.terminal.writeln('It\'s a draw!');
                } else if (winnerAfterComputer === 'X') {
                    this.terminal.writeln('Congratulations! You win!');
                } else {
                    this.terminal.writeln('Computer wins! Better luck next time.');
                }
                this.terminal.writeln('');
                return;
            }
            
            this.currentPlayer = 'X';
            this.terminal.writeln('Your move (1-9):');
        } else {
            // Position was already taken, prompt for another move
            this.terminal.writeln('Your move (1-9):');
        }
    }

    cmdHelp() {
        this.terminal.writeln('Available commands:');
        this.terminal.writeln('  File System:');
        this.terminal.writeln('    ls, cd, pwd, mkdir, touch, rm, cat, echo');
        this.terminal.writeln('  System Info:');
        this.terminal.writeln('    hostname, uname, date, df, free, ps');
        this.terminal.writeln('  Package Management:');
        this.terminal.writeln('    yum/dnf install|update|list');
        this.terminal.writeln('  Service Management:');
        this.terminal.writeln('    systemctl start|stop|restart|enable|disable|status');
        this.terminal.writeln('  Security:');
        this.terminal.writeln('    firewall-cmd, setenforce, getenforce, sestatus, setsebool');
        this.terminal.writeln('  User Management:');
        this.terminal.writeln('    useradd, groupadd, passwd, id, su, whoami, exit');
        this.terminal.writeln('  Environment:');
        this.terminal.writeln('    set, unset, export, env');
        this.terminal.writeln('  Editor:');
        this.terminal.writeln('    vim/vi <filename> - Opens modal editor');
        this.terminal.writeln('  Oracle Help:');
        this.terminal.writeln('    oracle-help - Complete Oracle 19c installation guide');
        this.terminal.writeln('    ocp - Check Oracle installation progress');
        this.terminal.writeln('    ocp --hint - Get hint for next task');
        this.terminal.writeln('    ocp --hint-detail - Get detailed commands for next task');
        this.terminal.writeln('  System:');
        this.terminal.writeln('    reboot - Reboot the system (clears state)');
        this.terminal.writeln('    ldconfig - Configure dynamic linker run-time bindings');
        this.terminal.writeln('  Other:');
        this.terminal.writeln('    clear, help, whereis');
        this.terminal.writeln('');
        this.terminal.writeln('Tips:');
        this.terminal.writeln('  • Use Tab for command and path completion');
        this.terminal.writeln('  • Use arrow keys for command history');
        this.terminal.writeln('  • Files and progress are saved automatically');
        this.terminal.writeln('  • This is a simulated RHEL 9 environment for Oracle 19c practice');
    }

    getPrompt() {
        const user = this.fs.currentUser;
        const host = 'proddb01sim';
        const path = this.fs.pwd();
        const displayPath = path === `/home/${user}` ? '~' : path;
        const promptChar = user === 'root' ? '#' : '$';
        
        return `[${user}@${host} ${displayPath}]${promptChar} `;
    }

    cmdWhereis(args) {
        if (args.length === 0) {
            this.terminal.writeln('whereis: missing operand');
            this.terminal.writeln('Try \'whereis --help\' for more information.');
            return;
        }

        if (args[0] === '--help') {
            this.terminal.writeln('Usage: whereis [options] name...');
            this.terminal.writeln('Locate the binary, source, and manual page files for a command.');
            this.terminal.writeln('');
            this.terminal.writeln('Options:');
            this.terminal.writeln('  -b    search only for binaries');
            this.terminal.writeln('  -m    search only for manuals');
            this.terminal.writeln('  -s    search only for sources');
            return;
        }

        // Parse options
        const searchBinaries = args.includes('-b') || (!args.includes('-m') && !args.includes('-s'));
        const searchManuals = args.includes('-m') || (!args.includes('-b') && !args.includes('-s'));
        const searchSources = args.includes('-s') || (!args.includes('-b') && !args.includes('-m'));
        
        // Get command names (filter out options)
        const commands = args.filter(arg => !arg.startsWith('-'));
        
        if (commands.length === 0) {
            this.terminal.writeln('whereis: missing operand');
            return;
        }

        // Standard binary directories
        const binaryPaths = ['/bin', '/sbin', '/usr/bin', '/usr/sbin', '/usr/local/bin', '/usr/local/sbin'];
        // Standard manual page directories
        const manualPaths = ['/usr/share/man', '/usr/local/share/man'];
        // Standard source directories
        const sourcePaths = ['/usr/src', '/usr/local/src'];

        for (const command of commands) {
            const results = [];
            
            // Search for binaries
            if (searchBinaries) {
                for (const binPath of binaryPaths) {
                    const fullPath = `${binPath}/${command}`;
                    if (this.fs.exists(fullPath)) {
                        results.push(fullPath);
                    }
                }
            }

            // Search for manual pages
            if (searchManuals) {
                for (const manPath of manualPaths) {
                    // Check common manual sections
                    for (const section of ['1', '2', '3', '4', '5', '6', '7', '8']) {
                        const manFile = `${manPath}/man${section}/${command}.${section}`;
                        const manFileGz = `${manFile}.gz`;
                        if (this.fs.exists(manFile)) {
                            results.push(manFile);
                        } else if (this.fs.exists(manFileGz)) {
                            results.push(manFileGz);
                        }
                    }
                }
            }

            // Search for sources
            if (searchSources) {
                for (const srcPath of sourcePaths) {
                    const srcDir = `${srcPath}/${command}`;
                    if (this.fs.exists(srcDir)) {
                        results.push(srcDir);
                    }
                }
            }

            // Output results
            if (results.length > 0) {
                this.terminal.writeln(`${command}: ${results.join(' ')}`);
            } else {
                this.terminal.writeln(`${command}:`);
            }
        }
    }

    formatDate(date) {
        try {
            if (!date || !(date instanceof Date)) {
                return 'Jan  1 00:00';
            }
            
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            const month = months[date.getMonth()];
            const day = date.getDate().toString().padStart(2, ' ');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            
            return `${month} ${day} ${hours}:${minutes}`;
        } catch (e) {
            return 'Jan  1 00:00';
        }
    }

    // Process piped commands
    processPipedCommand(input) {
        const commands = input.split('|').map(cmd => cmd.trim());
        let output = '';
        
        for (let i = 0; i < commands.length; i++) {
            const cmd = commands[i];
            const parts = cmd.split(/\s+/);
            const command = parts[0];
            const args = parts.slice(1);
            
            if (i === 0) {
                // First command - capture its output
                output = this.executeCommandAndCapture(command, args);
            } else {
                // Subsequent commands - process with input from previous command
                output = this.executeCommandWithInput(command, args, output);
            }
            
            // If any command fails or returns empty, break the pipe
            if (output === null) {
                return;
            }
        }
        
        // Display final output
        if (output && output.trim()) {
            this.terminal.writeln(output.trim());
        }
    }

    // Execute a command and capture its output instead of displaying it
    executeCommandAndCapture(command, args) {
        // Save original terminal.writeln to capture output
        const originalWriteln = this.terminal.writeln;
        const originalWrite = this.terminal.write;
        let capturedOutput = '';
        
        // Override terminal output methods to capture
        this.terminal.writeln = (text) => {
            capturedOutput += (text || '') + '\n';
        };
        this.terminal.write = (text) => {
            capturedOutput += (text || '');
        };
        
        try {
            // Execute the command
            switch (command) {
                case 'cat':
                    this.cmdCat(args);
                    break;
                case 'ls':
                    this.cmdLs(args);
                    break;
                case 'echo':
                    this.cmdEcho(args);
                    break;
                case 'ps':
                    this.cmdPs(args);
                    break;
                case 'df':
                    this.cmdDf(args);
                    break;
                case 'free':
                    this.cmdFree(args);
                    break;
                case 'date':
                    capturedOutput += new Date().toString() + '\n';
                    break;
                case 'whoami':
                    capturedOutput += this.fs.currentUser + '\n';
                    break;
                case 'hostname':
                    capturedOutput += 'proddb01sim\n';
                    break;
                case 'id':
                    this.cmdId(args);
                    break;
                case 'env':
                    this.cmdEnv();
                    break;
                case 'yum':
                case 'dnf':
                    this.cmdYum(args);
                    break;
                default:
                    // Restore original methods
                    this.terminal.writeln = originalWriteln;
                    this.terminal.write = originalWrite;
                    this.terminal.writeln(`bash: ${command}: command not found`);
                    return null;
            }
        } catch (error) {
            // Restore original methods
            this.terminal.writeln = originalWriteln;
            this.terminal.write = originalWrite;
            this.terminal.writeln(`Error executing ${command}: ${error.message}`);
            return null;
        }
        
        // Restore original methods
        this.terminal.writeln = originalWriteln;
        this.terminal.write = originalWrite;
        
        return capturedOutput;
    }

    // Execute a command with input from previous command in pipe
    executeCommandWithInput(command, args, input) {
        switch (command) {
            case 'grep':
                return this.grepFromInput(args, input);
            case 'head':
                return this.headFromInput(args, input);
            case 'tail':
                return this.tailFromInput(args, input);
            case 'sort':
                return this.sortFromInput(args, input);
            case 'uniq':
                return this.uniqFromInput(args, input);
            case 'wc':
                return this.wcFromInput(args, input);
            default:
                this.terminal.writeln(`bash: ${command}: command not found`);
                return null;
        }
    }

    // Grep command implementation
    cmdGrep(args) {
        if (args.length === 0) {
            this.terminal.writeln('Usage: grep [OPTION]... PATTERN [FILE]...');
            return;
        }
        
        let caseInsensitive = false;
        let invert = false;
        let lineNumber = false;
        let pattern = '';
        let files = [];
        
        // Parse arguments
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg.startsWith('-')) {
                if (arg.includes('i')) caseInsensitive = true;
                if (arg.includes('v')) invert = true;
                if (arg.includes('n')) lineNumber = true;
            } else if (!pattern) {
                pattern = arg;
            } else {
                files.push(arg);
            }
        }
        
        if (!pattern) {
            this.terminal.writeln('grep: no pattern specified');
            return;
        }
        
        if (files.length === 0) {
            this.terminal.writeln('Usage: grep [OPTION]... PATTERN [FILE]...');
            return;
        }
        
        // Process each file
        for (const file of files) {
            const content = this.fs.cat(file);
            if (content === null) {
                this.terminal.writeln(`grep: ${file}: No such file or directory`);
                continue;
            }
            
            this.grepInContent(pattern, content, caseInsensitive, invert, lineNumber, files.length > 1 ? file : null);
        }
    }

    // Grep from input (for pipes)
    grepFromInput(args, input) {
        if (args.length === 0) {
            return null;
        }
        
        let caseInsensitive = false;
        let invert = false;
        let lineNumber = false;
        let pattern = '';
        
        // Parse arguments
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg.startsWith('-')) {
                if (arg.includes('i')) caseInsensitive = true;
                if (arg.includes('v')) invert = true;
                if (arg.includes('n')) lineNumber = true;
            } else if (!pattern) {
                pattern = arg;
            }
        }
        
        if (!pattern) {
            return null;
        }
        
        return this.grepInContent(pattern, input, caseInsensitive, invert, lineNumber, null, true);
    }

    // Core grep functionality
    grepInContent(pattern, content, caseInsensitive, invert, lineNumber, filename, returnOutput = false) {
        const lines = content.split('\n');
        const results = [];
        
        // Create regex pattern
        const flags = caseInsensitive ? 'i' : '';
        let regex;
        try {
            regex = new RegExp(pattern, flags);
        } catch (e) {
            // If pattern is not valid regex, treat as literal string
            const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            regex = new RegExp(escapedPattern, flags);
        }
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const matches = regex.test(line);
            
            if ((matches && !invert) || (!matches && invert)) {
                let output = '';
                
                if (filename) {
                    output += filename + ':';
                }
                if (lineNumber) {
                    output += (i + 1) + ':';
                }
                output += line;
                
                if (returnOutput) {
                    results.push(output);
                } else {
                    this.terminal.writeln(output);
                }
            }
        }
        
        if (returnOutput) {
            return results.join('\n');
        }
    }

    // Additional pipe-friendly commands
    headFromInput(args, input) {
        const lines = input.split('\n');
        const numLines = args.length > 0 && args[0].startsWith('-') ? 
            parseInt(args[0].substring(1)) || 10 : 10;
        
        return lines.slice(0, numLines).join('\n');
    }

    tailFromInput(args, input) {
        const lines = input.split('\n');
        const numLines = args.length > 0 && args[0].startsWith('-') ? 
            parseInt(args[0].substring(1)) || 10 : 10;
        
        return lines.slice(-numLines).join('\n');
    }

    sortFromInput(args, input) {
        const lines = input.split('\n').filter(line => line.trim() !== '');
        const reverse = args.includes('-r');
        
        lines.sort();
        if (reverse) {
            lines.reverse();
        }
        
        return lines.join('\n');
    }

    uniqFromInput(args, input) {
        const lines = input.split('\n');
        const unique = [];
        let lastLine = '';
        
        for (const line of lines) {
            if (line !== lastLine) {
                unique.push(line);
                lastLine = line;
            }
        }
        
        return unique.join('\n');
    }

    wcFromInput(args, input) {
        const lines = input.split('\n');
        const lineCount = lines.length;
        const wordCount = input.split(/\s+/).filter(word => word.length > 0).length;
        const charCount = input.length;
        
        if (args.includes('-l')) {
            return lineCount.toString();
        } else if (args.includes('-w')) {
            return wordCount.toString();
        } else if (args.includes('-c')) {
            return charCount.toString();
        } else {
            return `${lineCount} ${wordCount} ${charCount}`;
        }
    }

    // ArcGIS Server Setup Command
    cmdArcGISServerSetup(args) {
        // Check if running in correct directory
        if (!this.fs.pwd().includes('/install')) {
            this.terminal.writeln('ArcGIS Server Setup: Please run from /install directory');
            this.terminal.writeln('Usage: cd /install && ./ArcGIS_Server_Setup');
            return;
        }

        // Check if running as arcgis user
        if (this.fs.currentUser !== 'arcgis') {
            this.terminal.writeln('ArcGIS Server Setup: Must be run as arcgis user');
            this.terminal.writeln('Usage: su - arcgis');
            return;
        }

        // Check if Oracle is available (prerequisite)
        if (!oracleManager.getState('databaseStarted')) {
            this.terminal.writeln('ArcGIS Server Setup: Oracle Database must be running');
            this.terminal.writeln('Please start Oracle Database first with: sqlplus / as sysdba');
            return;
        }

        this.terminal.writeln('');
        this.terminal.writeln('ArcGIS Server 10.9.1 Setup');
        this.terminal.writeln('===========================');
        this.terminal.writeln('');
        this.terminal.writeln('Welcome to the ArcGIS Server Installation Wizard');
        this.terminal.writeln('');
        this.terminal.writeln('Checking system requirements...');
        this.terminal.writeln('✓ Operating System: Red Hat Enterprise Linux 9.0');
        this.terminal.writeln('✓ Available disk space: 15 GB');
        this.terminal.writeln('✓ Available memory: 8 GB');
        this.terminal.writeln('✓ Oracle Database: Available');
        this.terminal.writeln('');
        this.terminal.writeln('Installing ArcGIS Server...');
        this.terminal.writeln('');
        this.terminal.writeln('[▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓] 100% Complete');
        this.terminal.writeln('');
        this.terminal.writeln('Installing ArcSDE components...');
        this.terminal.writeln('✓ SDE libraries installed to /opt/arcgis/server/lib/');
        this.terminal.writeln('✓ Spatial data engine configured');
        this.terminal.writeln('✓ Oracle spatial extensions enabled');
        this.terminal.writeln('');
        this.terminal.writeln('Configuring EXTPROC integration...');
        this.terminal.writeln('✓ libsde.so library registered');
        this.terminal.writeln('✓ Spatial function wrappers created');
        this.terminal.writeln('✓ Oracle EXTPROC configuration updated');
        this.terminal.writeln('');
        this.terminal.writeln('Installation completed successfully!');
        this.terminal.writeln('');
        this.terminal.writeln('Next steps:');
        this.terminal.writeln('1. Create SDE user in Oracle Database');
        this.terminal.writeln('2. Register spatial libraries with Oracle');
        this.terminal.writeln('3. Test spatial functions via EXTPROC');
        this.terminal.writeln('');
        this.terminal.writeln('For Oracle integration, run as oracle user:');
        this.terminal.writeln('  sqlplus / as sysdba');
        this.terminal.writeln('  CREATE USER sde IDENTIFIED BY sde;');
        this.terminal.writeln('  GRANT CONNECT, RESOURCE TO sde;');
        this.terminal.writeln("  CREATE OR REPLACE LIBRARY sde_util AS '/opt/arcgis/server/lib/libsde.so';");
        this.terminal.writeln('');

        // Create ArcGIS directory structure
        this.fs.mkdir('/opt/arcgis');
        this.fs.mkdir('/opt/arcgis/server');
        this.fs.mkdir('/opt/arcgis/server/lib');
        this.fs.mkdir('/opt/arcgis/server/bin');
        this.fs.mkdir('/opt/arcgis/server/framework');
        
        // Create SDE library file (simulated)
        this.fs.touch('/opt/arcgis/server/lib/libsde.so', '# ArcSDE Library for Oracle Spatial Integration');
        this.fs.touch('/opt/arcgis/server/lib/libsde_util.so', '# ArcSDE Utility Library');
        this.fs.touch('/opt/arcgis/server/bin/sdeconfig', '#!/bin/bash\n# SDE Configuration Tool');
        
        // Create configuration files
        this.fs.touch('/opt/arcgis/server/framework/server.properties', 
            'server.name=arcgis-server\n' +
            'server.port=6080\n' +
            'database.type=oracle\n' +
            'spatial.engine=sde\n' +
            'extproc.enabled=true\n');

        // Update Oracle state
        oracleManager.updateState('psAppRequirements.arcgisInstalled', true);
        oracleManager.updateState('psAppRequirements.arcgisUserCreated', true);

        this.terminal.writeln('ArcGIS Server installation logged to: /opt/arcgis/server/logs/install.log');
        this.terminal.writeln('');
    }

    // ldconfig - Configure dynamic linker run-time bindings
    cmdLdconfig(args) {
        // Check if running as root (ldconfig typically requires root privileges)
        if (this.fs.currentUser !== 'root') {
            this.terminal.writeln('ldconfig: /etc/ld.so.cache: Permission denied');
            this.terminal.writeln('ldconfig: Can\'t create temporary cache file /etc/ld.so.cache~: Permission denied');
            return;
        }

        // Handle help option
        if (args.includes('--help') || args.includes('-h')) {
            this.terminal.writeln('Usage: ldconfig [OPTION...]');
            this.terminal.writeln('Configure dynamic linker run-time bindings.');
            this.terminal.writeln('');
            this.terminal.writeln('  -p, --print-cache        Print cache');
            this.terminal.writeln('  -v, --verbose           Verbose');
            this.terminal.writeln('  -N, --nolinks           Don\'t build cache');
            this.terminal.writeln('  -X, --no-links          Don\'t update links');
            this.terminal.writeln('  -c FORMAT, --format=FORMAT   Format to use: old, new or compat');
            this.terminal.writeln('  -C CACHE                 Use CACHE as cache file');
            this.terminal.writeln('  -r ROOT                  Change to and use ROOT as root directory');
            this.terminal.writeln('  -n                       Process only directories specified on command line');
            this.terminal.writeln('  -l                       Manual link');
            this.terminal.writeln('  -f CONF                  Use CONF as configuration file');
            this.terminal.writeln('  -?, --help              Give this help list');
            this.terminal.writeln('      --usage             Give a short usage message');
            this.terminal.writeln('  -V, --version           Print program version');
            this.terminal.writeln('');
            return;
        }

        // Handle version option
        if (args.includes('--version') || args.includes('-V')) {
            this.terminal.writeln('ldconfig (GNU libc) 2.34');
            this.terminal.writeln('Copyright (C) 2021 Free Software Foundation, Inc.');
            this.terminal.writeln('This is free software; see the source for copying conditions.');
            this.terminal.writeln('There is NO warranty; not even for MERCHANTABILITY or FITNESS FOR A');
            this.terminal.writeln('PARTICULAR PURPOSE.');
            this.terminal.writeln('Written by Andreas Jaeger.');
            return;
        }

        // Handle print cache option
        if (args.includes('-p') || args.includes('--print-cache')) {
            this.terminal.writeln('        libc.so.6 (libc6,x86-64) => /lib64/libc.so.6');
            this.terminal.writeln('        libpthread.so.0 (libc6,x86-64) => /lib64/libpthread.so.0');
            this.terminal.writeln('        libdl.so.2 (libc6,x86-64) => /lib64/libdl.so.2');
            this.terminal.writeln('        libm.so.6 (libc6,x86-64) => /lib64/libm.so.6');
            this.terminal.writeln('        librt.so.1 (libc6,x86-64) => /lib64/librt.so.1');
            this.terminal.writeln('        libresolv.so.2 (libc6,x86-64) => /lib64/libresolv.so.2');
            this.terminal.writeln('        libnss_files.so.2 (libc6,x86-64) => /lib64/libnss_files.so.2');
            this.terminal.writeln('        libnss_dns.so.2 (libc6,x86-64) => /lib64/libnss_dns.so.2');
            
            // Show Oracle libraries if Oracle is installed
            if (oracleManager.getState('softwareInstalled')) {
                this.terminal.writeln('        libclntsh.so.19.1 (libc6,x86-64) => /u01/app/oracle/product/19.0.0/dbhome_1/lib/libclntsh.so.19.1');
                this.terminal.writeln('        libclntshcore.so.19.1 (libc6,x86-64) => /u01/app/oracle/product/19.0.0/dbhome_1/lib/libclntshcore.so.19.1');
                this.terminal.writeln('        libociei.so (libc6,x86-64) => /u01/app/oracle/product/19.0.0/dbhome_1/lib/libociei.so');
                this.terminal.writeln('        libons.so (libc6,x86-64) => /u01/app/oracle/product/19.0.0/dbhome_1/lib/libons.so');
                this.terminal.writeln('        libocci.so.19.1 (libc6,x86-64) => /u01/app/oracle/product/19.0.0/dbhome_1/lib/libocci.so.19.1');
            }
            
            // Show ArcGIS libraries if ArcGIS is installed
            if (oracleManager.getState('psAppRequirements.arcgisInstalled')) {
                this.terminal.writeln('        libsde.so (libc6,x86-64) => /opt/arcgis/server/lib/libsde.so');
                this.terminal.writeln('        libsde_util.so (libc6,x86-64) => /opt/arcgis/server/lib/libsde_util.so');
            }
            
            this.terminal.writeln('');
            this.terminal.writeln('8192 libs found in cache `/etc/ld.so.cache\'');
            return;
        }

        // Handle verbose option
        const verbose = args.includes('-v') || args.includes('--verbose');
        
        if (verbose) {
            this.terminal.writeln('/sbin/ldconfig: Can\'t stat /lib: No such file or directory');
            this.terminal.writeln('/sbin/ldconfig: Can\'t stat /usr/lib: No such file or directory');
            this.terminal.writeln('/sbin/ldconfig: Checking /lib64');
            this.terminal.writeln('/sbin/ldconfig: Checking /usr/lib64');
            
            // Check Oracle library paths if Oracle is installed
            if (oracleManager.getState('softwareInstalled')) {
                this.terminal.writeln('/sbin/ldconfig: Checking /u01/app/oracle/product/19.0.0/dbhome_1/lib');
                this.terminal.writeln('        libclntsh.so.19.1 -> libclntsh.so.19.1');
                this.terminal.writeln('        libclntshcore.so.19.1 -> libclntshcore.so.19.1');
                this.terminal.writeln('        libociei.so -> libociei.so');
            }
            
            // Check ArcGIS library paths if ArcGIS is installed
            if (oracleManager.getState('psAppRequirements.arcgisInstalled')) {
                this.terminal.writeln('/sbin/ldconfig: Checking /opt/arcgis/server/lib');
                this.terminal.writeln('        libsde.so -> libsde.so');
                this.terminal.writeln('        libsde_util.so -> libsde_util.so');
            }
            
            this.terminal.writeln('/sbin/ldconfig: Creating cache file /etc/ld.so.cache');
        }

        // Create/update the ld.so.cache file simulation
        const cacheContent = '# Dynamic linker cache (automatically generated)\n' +
                           '# This file contains a cache of the libraries found in the directories\n' +
                           '# specified in /etc/ld.so.conf and /etc/ld.so.conf.d/\n' +
                           '# Generated by ldconfig\n';
        
        this.fs.touch('/etc/ld.so.cache', cacheContent);

        // Also create/update ld.so.conf if it doesn't exist
        if (!this.fs.exists('/etc/ld.so.conf')) {
            let ldConfContent = 'include /etc/ld.so.conf.d/*.conf\n';
            
            // Add Oracle library paths if Oracle is installed
            if (oracleManager.getState('softwareInstalled')) {
                ldConfContent += '/u01/app/oracle/product/19.0.0/dbhome_1/lib\n';
            }
            
            // Add ArcGIS library paths if ArcGIS is installed
            if (oracleManager.getState('psAppRequirements.arcgisInstalled')) {
                ldConfContent += '/opt/arcgis/server/lib\n';
            }
            
            this.fs.touch('/etc/ld.so.conf', ldConfContent);
        }

        // Create ld.so.conf.d directory if it doesn't exist
        if (!this.fs.exists('/etc/ld.so.conf.d')) {
            this.fs.mkdir('/etc/ld.so.conf.d');
        }

        // Silent execution (default behavior)
        if (!verbose && !args.includes('-p') && !args.includes('--print-cache')) {
            // ldconfig runs silently by default when rebuilding cache
            // No output unless there are warnings or errors
        }
    }
}