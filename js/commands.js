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
                this.terminal.writeln('Permissive');
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
            case 'help':
                this.cmdHelp();
                break;
            default:
                this.terminal.writeln(`-bash: ${command}: command not found`);
        }
    }

    cmdLs(args) {
        const showAll = args.includes('-a') || args.includes('-la');
        const longFormat = args.includes('-l') || args.includes('-la');
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
        const path = args[0] || '~';
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

        switch (subcommand) {
            case 'install':
                const packages = args.slice(1).filter(arg => !arg.startsWith('-'));
                if (packages.length === 0) {
                    this.terminal.writeln('Error: Need to pass a list of pkgs to install');
                } else {
                    this.terminal.writeln('Last metadata expiration check: 0:15:32 ago on ' + new Date().toLocaleString());
                    this.terminal.writeln('Dependencies resolved.');
                    this.terminal.writeln('================================================================================');
                    this.terminal.writeln(' Package            Architecture    Version              Repository        Size');
                    this.terminal.writeln('================================================================================');
                    packages.forEach(pkg => {
                        this.terminal.writeln(` ${pkg.padEnd(18)} x86_64          1.0-1.el9           rhel-9-appstream  1.2 M`);
                    });
                    this.terminal.writeln('\nTransaction Summary');
                    this.terminal.writeln('================================================================================');
                    this.terminal.writeln(`Install  ${packages.length} Package${packages.length > 1 ? 's' : ''}`);
                    this.terminal.writeln('\nComplete!');
                }
                break;
            case 'update':
                this.terminal.writeln('Last metadata expiration check: 0:15:32 ago on ' + new Date().toLocaleString());
                this.terminal.writeln('Dependencies resolved.');
                this.terminal.writeln('Nothing to do.');
                this.terminal.writeln('Complete!');
                break;
            case 'list':
                if (args.includes('installed')) {
                    this.terminal.writeln('Installed Packages');
                    this.terminal.writeln('kernel.x86_64                    5.14.0-70.13.1.el9_0         @rhel-9-baseos');
                    this.terminal.writeln('systemd.x86_64                   249-7.el9                    @rhel-9-baseos');
                    this.terminal.writeln('bash.x86_64                      5.1.8-4.el9                  @rhel-9-baseos');
                    this.terminal.writeln('coreutils.x86_64                 8.32-31.el9                  @rhel-9-baseos');
                } else {
                    this.terminal.writeln('Available Packages');
                    this.terminal.writeln('oracle-database-preinstall-19c.x86_64    1.0-1.el9    rhel-9-appstream');
                    this.terminal.writeln('compat-libstdc++-33.x86_64               3.2.3-72.el9 rhel-9-appstream');
                    this.terminal.writeln('gcc.x86_64                                11.2.1-9.el9 rhel-9-appstream');
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
                this.terminal.writeln('  ports: ');
                this.terminal.writeln('  protocols: ');
                this.terminal.writeln('  masquerade: no');
                break;
            case '--permanent':
                if (args[1] && args[1].startsWith('--add-port=')) {
                    const port = args[1].split('=')[1];
                    this.terminal.writeln('success');
                }
                break;
            case '--reload':
                this.terminal.writeln('success');
                break;
            default:
                this.terminal.writeln('Usage: see firewall-cmd --help');
        }
    }

    cmdSetenforce(args) {
        if (args[0] === '0' || args[0] === 'Permissive') {
            this.terminal.writeln('');
        } else if (args[0] === '1' || args[0] === 'Enforcing') {
            this.terminal.writeln('');
        } else {
            this.terminal.writeln('usage:  setenforce [ Enforcing | Permissive | 1 | 0 ]');
        }
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
        
        if (args[0] === '-' && args[1]) {
            // su - username
            targetUser = args[1];
            this.userStack.push(targetUser);
            this.fs.currentUser = targetUser;
            this.environmentVars.USER = targetUser;
            this.environmentVars.HOME = targetUser === 'root' ? '/root' : `/home/${targetUser}`;
            this.fs.cd(this.environmentVars.HOME);
        } else if (args[0] && args[0] !== '-') {
            // su username
            targetUser = args[0];
            this.userStack.push(targetUser);
            this.fs.currentUser = targetUser;
            this.environmentVars.USER = targetUser;
            this.environmentVars.HOME = targetUser === 'root' ? '/root' : `/home/${targetUser}`;
        } else if (args.length === 0) {
            // su (no arguments - default to root)
            this.userStack.push(targetUser);
            this.fs.currentUser = targetUser;
            this.environmentVars.USER = targetUser;
            this.environmentVars.HOME = '/root';
            this.fs.cd('/root');
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
            oracleManager.clearState();
            localStorage.removeItem('fileSystemState');
            this.clearHistory();
            location.reload();
        }, 1000);
    }

    cmdOCP(args) {
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
        
        // Handle hints
        if (args.includes('--hint') || args.includes('--hint-detail')) {
            const nextTask = oracleManager.getNextTask();
            if (nextTask) {
                this.terminal.writeln('Next Task:');
                this.terminal.writeln('----------');
                this.terminal.writeln(nextTask.hint);
                this.terminal.writeln('');
                
                if (args.includes('--hint-detail')) {
                    this.terminal.writeln('Commands to execute:');
                    this.terminal.writeln('-------------------');
                    nextTask.commands.forEach(cmd => {
                        this.terminal.writeln(`  ${cmd}`);
                    });
                    this.terminal.writeln('');
                }
            }
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

    cmdTicTacToe() {
        // Initialize Tic-Tac-Toe game
        this.gameBoard = [
            [' ', ' ', ' '],
            [' ', ' ', ' '],
            [' ', ' ', ' ']
        ];
        this.currentPlayer = 'X';
        this.gameActive = true;
        
        this.terminal.writeln('');
        this.terminal.writeln('=== Tic-Tac-Toe ===');
        this.terminal.writeln('You are X, Computer is O');
        this.terminal.writeln('Enter position (1-9):');
        this.terminal.writeln('');
        this.terminal.writeln(' 1 | 2 | 3 ');
        this.terminal.writeln('-----------');
        this.terminal.writeln(' 4 | 5 | 6 ');
        this.terminal.writeln('-----------');
        this.terminal.writeln(' 7 | 8 | 9 ');
        this.terminal.writeln('');
        this.drawBoard();
        this.terminal.writeln('Your move (1-9): ');
    }

    drawBoard() {
        this.terminal.writeln('');
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
            return;
        }
        
        if (this.makeMove(position)) {
            this.drawBoard();
            
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
            this.terminal.writeln('Computer\'s move:');
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
            this.terminal.writeln('Your move (1-9): ');
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
        this.terminal.writeln('    firewall-cmd, setenforce, getenforce');
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
}