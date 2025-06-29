// Oracle Integration - Ties all Oracle modules together

// Initialize Oracle commands when CommandProcessor is created
CommandProcessor.prototype.initOracleCommands = function() {
    // Check if Oracle user exists when terminal starts
    const passwdContent = this.fs.cat('/etc/passwd');
    if (passwdContent && passwdContent.includes('oracle:x:')) {
        oracleManager.updateState('oracleUserExists', true);
    }
    
    // Check if Oracle groups exist
    const groupContent = this.fs.cat('/etc/group');
    if (groupContent && groupContent.includes('oinstall:x:') && groupContent.includes('dba:x:')) {
        oracleManager.updateState('oracleGroupsExist', true);
    }
    
    // Check kernel parameters
    const sysctlContent = this.fs.cat('/etc/sysctl.conf');
    if (sysctlContent && sysctlContent.includes('fs.aio-max-nr')) {
        oracleManager.updateState('kernelParametersSet', true);
    }
    
    // Check resource limits
    const limitsContent = this.fs.cat('/etc/security/limits.conf');
    if (limitsContent && limitsContent.includes('oracle soft nproc')) {
        oracleManager.updateState('limitsConfigured', true);
    }
    
    // Check if Oracle software is installed
    if (this.fs.exists('/u01/app/oracle/product/19.0.0/dbhome_1/bin/sqlplus')) {
        oracleManager.updateState('softwareInstalled', true);
    }
    
    // Check installed packages from yum history
    const installedPackages = this.getInstalledPackages();
    installedPackages.forEach(pkg => {
        oracleManager.setPackageInstalled(pkg);
    });
};

// Track installed packages
CommandProcessor.prototype.getInstalledPackages = function() {
    // Simulate some pre-installed packages
    return ['gcc', 'make', 'binutils', 'glibc', 'glibc-devel'];
};

// Root script handlers
CommandProcessor.prototype.cmdOrainstRoot = function(args) {
    if (this.fs.currentUser !== 'root') {
        this.terminal.writeln('ERROR: Must be run as root user');
        return;
    }
    
    if (!oracleManager.getState('inventoryCreated')) {
        this.terminal.writeln('ERROR: Oracle inventory not found. Run runInstaller first.');
        return;
    }
    
    this.terminal.writeln('Changing permissions of /u01/app/oraInventory.');
    this.terminal.writeln('Adding read,write permissions for group.');
    this.terminal.writeln('Removing read,write,execute permissions for world.');
    this.terminal.writeln('');
    this.terminal.writeln('Changing groupname of /u01/app/oraInventory to oinstall.');
    this.terminal.writeln('The execution of the script is complete.');
    
    // Update inventory permissions
    const invPath = this.fs.resolvePath('/u01/app/oraInventory');
    const invNode = this.fs.getNode(invPath);
    if (invNode) {
        invNode.permissions = 'drwxrwx---';
        invNode.group = 'oinstall';
    }
};

CommandProcessor.prototype.cmdRootSh = function(args) {
    if (this.fs.currentUser !== 'root') {
        this.terminal.writeln('ERROR: Must be run as root user');
        return;
    }
    
    if (!oracleManager.getState('softwareInstalled')) {
        this.terminal.writeln('ERROR: Oracle software not installed. Run runInstaller first.');
        return;
    }
    
    this.terminal.writeln('Performing root user operation.');
    this.terminal.writeln('');
    this.terminal.writeln('The following environment variables are set as:');
    this.terminal.writeln('    ORACLE_OWNER= oracle');
    this.terminal.writeln('    ORACLE_HOME=  /u01/app/oracle/product/19.0.0/dbhome_1');
    this.terminal.writeln('');
    this.terminal.writeln('Enter the full pathname of the local bin directory: [/usr/local/bin]: ');
    this.terminal.writeln('   Copying dbhome to /usr/local/bin ...');
    this.terminal.writeln('   Copying oraenv to /usr/local/bin ...');
    this.terminal.writeln('   Copying coraenv to /usr/local/bin ...');
    this.terminal.writeln('');
    this.terminal.writeln('Creating /etc/oratab file...');
    this.terminal.writeln('Entries will be added to the /etc/oratab file as needed by');
    this.terminal.writeln('Database Configuration Assistant when a database is created');
    this.terminal.writeln('Finished running generic part of root script.');
    this.terminal.writeln('Now product-specific root actions will be performed.');
    this.terminal.writeln('');
    this.terminal.writeln('Oracle Trace File Analyzer (TFA) is available at :');
    this.terminal.writeln('/u01/app/oracle/product/19.0.0/dbhome_1/bin/tfactl');
    this.terminal.writeln('');
    
    oracleManager.updateState('rootScriptsRun', true);
    
    // Create oratab if it doesn't exist
    if (!this.fs.exists('/etc/oratab')) {
        this.fs.touch('/etc/oratab', '# This file is used by ORACLE utilities.  It is created by root.sh\n# and updated by either Database Configuration Assistant while creating\n# a database or ASM Configuration Assistant while creating ASM instance.\n#\n# A colon, \':\', is used as the field terminator.  A new line terminates\n# the entry.  Lines beginning with a pound sign, \'#\', are comments.\n#\n# Entries are of the form:\n#   $ORACLE_SID:$ORACLE_HOME:<N|Y>:\n#\n');
    }
    
    // Create symbolic links
    this.fs.touch('/usr/local/bin/oraenv', '#!/bin/sh\n# Oracle environment script');
    this.fs.touch('/usr/local/bin/dbhome', '#!/bin/sh\n# Oracle dbhome script');
    this.fs.touch('/usr/local/bin/coraenv', '#!/bin/sh\n# Oracle coraenv script');
};

// Unzip command for Oracle installation
CommandProcessor.prototype.cmdUnzip = function(args) {
    if (args.length === 0) {
        this.terminal.writeln('UnZip 6.00 of 20 April 2009, by Info-ZIP.');
        this.terminal.writeln('');
        this.terminal.writeln('Usage: unzip [-Z] [-opts[modifiers]] file[.zip] [list] [-x xlist] [-d exdir]');
        return;
    }
    
    const zipFile = args[0];
    
    if (zipFile === '/install/LINUX.X64_193000_db_home.zip') {
        if (!this.fs.exists('/install/LINUX.X64_193000_db_home.zip')) {
            this.terminal.writeln(`unzip: cannot find or open ${zipFile}, ${zipFile}.zip or ${zipFile}.ZIP.`);
            return;
        }
        
        // Check if in ORACLE_HOME
        if (this.fs.pwd() !== '/u01/app/oracle/product/19.0.0/dbhome_1') {
            this.terminal.writeln('Warning: Extracting Oracle software outside of ORACLE_HOME');
        }
        
        this.terminal.writeln(`Archive:  ${zipFile}`);
        this.terminal.writeln('   creating: bin/');
        this.terminal.writeln('  inflating: bin/adrci');
        this.terminal.writeln('  inflating: bin/dbca');
        this.terminal.writeln('  inflating: bin/dbua');
        this.terminal.writeln('  inflating: bin/lsnrctl');
        this.terminal.writeln('  inflating: bin/netca');
        this.terminal.writeln('  inflating: bin/orapwd');
        this.terminal.writeln('  inflating: bin/rman');
        this.terminal.writeln('  inflating: bin/sqlplus');
        this.terminal.writeln('  inflating: bin/tnsping');
        this.terminal.writeln('  inflating: bin/expdp');
        this.terminal.writeln('  inflating: bin/impdp');
        this.terminal.writeln('  inflating: bin/srvctl');
        this.terminal.writeln('   creating: network/');
        this.terminal.writeln('   creating: network/admin/');
        this.terminal.writeln('   creating: dbs/');
        this.terminal.writeln('  inflating: runInstaller');
        this.terminal.writeln('   creating: inventory/');
        this.terminal.writeln('   creating: OPatch/');
        this.terminal.writeln('');
        
        // Create the Oracle software structure
        const oracleHome = '/u01/app/oracle/product/19.0.0/dbhome_1';
        this.fs.mkdir(`${oracleHome}/bin`);
        this.fs.mkdir(`${oracleHome}/network`);
        this.fs.mkdir(`${oracleHome}/network/admin`);
        this.fs.mkdir(`${oracleHome}/dbs`);
        this.fs.mkdir(`${oracleHome}/inventory`);
        this.fs.mkdir(`${oracleHome}/OPatch`);
        
        // Create executable files
        const executables = ['adrci', 'dbca', 'dbua', 'lsnrctl', 'netca', 'orapwd', 
                           'rman', 'sqlplus', 'tnsping', 'expdp', 'impdp', 'srvctl'];
        executables.forEach(exe => {
            this.fs.touch(`${oracleHome}/bin/${exe}`, `Oracle ${exe} executable`);
        });
        
        // Create runInstaller
        this.fs.touch(`${oracleHome}/runInstaller`, '#!/bin/sh\n# Oracle Universal Installer');
        
        // Mark Oracle as installed in state
        oracleManager.updateState('softwareExtracted', true);
        
        return;
    }
    
    if (zipFile === '/install/ArcGIS_Server_Linux_109_177864.tar.gz') {
        // Handle as tar.gz
        this.terminal.writeln(`unzip:  cannot find or open ${zipFile}, ${zipFile}.zip or ${zipFile}.ZIP.`);
        this.terminal.writeln('Note: This appears to be a tar.gz file. Use: tar -xzf <filename>');
        return;
    }
    
    this.terminal.writeln(`unzip:  cannot find or open ${zipFile}, ${zipFile}.zip or ${zipFile}.ZIP.`);
};

// Override the main processCommand to handle Oracle commands
const originalProcessCommand = CommandProcessor.prototype.processCommand;
CommandProcessor.prototype.processCommand = function(input) {
    const parts = input.trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);
    
    // Check for script execution first
    if (command === '/u01/app/oraInventory/orainstRoot.sh') {
        this.cmdOrainstRoot(args);
        return;
    }
    
    if (command === '/u01/app/oracle/product/19.0.0/dbhome_1/root.sh') {
        this.cmdRootSh(args);
        return;
    }
    
    // Check for unzip command
    if (command === 'unzip') {
        this.cmdUnzip(args);
        return;
    }
    
    // Check if it's an Oracle command
    if (this.processOracleCommand(command, args)) {
        return;
    }
    
    // Otherwise use original command processor
    originalProcessCommand.call(this, input);
};

// Main Oracle command dispatcher
CommandProcessor.prototype.processOracleCommand = function(command, args) {
    switch (command) {
        // Installer commands
        case 'runInstaller':
        case './runInstaller':
            this.cmdRunInstaller(args);
            return true;
        case 'dbca':
            this.cmdDbca(args);
            return true;
        case 'netca':
            this.cmdNetca(args);
            return true;
            
        // Listener commands
        case 'lsnrctl':
            this.cmdLsnrctl(args);
            return true;
        case 'tnsping':
            this.cmdTnsping(args);
            return true;
            
        // Database commands
        case 'sqlplus':
            this.cmdSqlplus(args);
            return true;
            
        // Utility commands
        case 'adrci':
            this.cmdAdrci(args);
            return true;
        case 'rman':
            this.cmdRman(args);
            return true;
        case 'srvctl':
            this.cmdSrvctl(args);
            return true;
        case 'orapwd':
            this.cmdOrapwd(args);
            return true;
        case 'expdp':
            this.cmdExpdp(args);
            return true;
        case 'impdp':
            this.cmdImpdp(args);
            return true;
        case 'oraenv':
        case '. oraenv':
            this.cmdOraenv(args);
            return true;
            
        // PS app commands
        case 'ps-help':
            this.cmdPSHelp();
            return true;
        case './ArcGIS_Server_Setup':
        case 'ArcGIS_Server_Setup':
            this.cmdArcgisInstall(args);
            return true;
            
        default:
            return false;
    }
};

// Update the original initialization
const originalInit = CommandProcessor.prototype.initializeVimModal;
CommandProcessor.prototype.initializeVimModal = function() {
    originalInit.call(this);
    this.initOracleCommands();
};

// Create installation files
CommandProcessor.prototype.createInstallationFiles = function() {
    // Create /install directory
    if (!this.fs.exists('/install')) {
        this.fs.mkdir('/install');
    }
    
    // Create Oracle installation zip file
    this.fs.touch('/install/LINUX.X64_193000_db_home.zip', 'Oracle Database 19c Installation Archive (2.8GB)');
    
    // Create ArcGIS installation file
    this.fs.touch('/install/ArcGIS_Server_Linux_109_177864.tar.gz', 'ArcGIS Server 10.9 Installation Archive (1.2GB)');
};

// Override Yum to handle package installation tracking
const originalCmdYum = CommandProcessor.prototype.cmdYum;
CommandProcessor.prototype.cmdYum = function(args) {
    const subcommand = args[0];
    
    if (subcommand === 'install') {
        const packages = args.slice(1).filter(arg => !arg.startsWith('-'));
        
        // Track Oracle prerequisite packages
        packages.forEach(pkg => {
            if (oracleManager.state.requiredPackages.hasOwnProperty(pkg)) {
                oracleManager.setPackageInstalled(pkg);
            }
        });
    }
    
    // Call original yum command
    originalCmdYum.call(this, args);
};

// Sysctl command for kernel parameters
CommandProcessor.prototype.cmdSysctl = function(args) {
    if (args.length === 0) {
        this.terminal.writeln('usage: sysctl [-n] [-e] [-w] [-p <file>] [-a] [-A]');
        return;
    }
    
    if (args[0] === '-p') {
        // Apply kernel parameters
        const sysctlContent = this.fs.cat('/etc/sysctl.conf');
        if (sysctlContent && sysctlContent.includes('fs.aio-max-nr')) {
            this.terminal.writeln('fs.aio-max-nr = 1048576');
            this.terminal.writeln('fs.file-max = 6815744');
            this.terminal.writeln('kernel.shmall = 2097152');
            this.terminal.writeln('kernel.shmmax = 536870912');
            this.terminal.writeln('kernel.shmmni = 4096');
            this.terminal.writeln('kernel.sem = 250 32000 100 128');
            this.terminal.writeln('net.ipv4.ip_local_port_range = 9000 65500');
            this.terminal.writeln('net.core.rmem_default = 262144');
            this.terminal.writeln('net.core.rmem_max = 4194304');
            this.terminal.writeln('net.core.wmem_default = 262144');
            this.terminal.writeln('net.core.wmem_max = 1048576');
            
            oracleManager.updateState('kernelParametersSet', true);
        } else {
            this.terminal.writeln('* Applying /etc/sysctl.conf ...');
        }
    } else if (args[0] === '-a') {
        // Show all parameters
        this.terminal.writeln('abi.vsyscall32 = 1');
        this.terminal.writeln('crypto.fips_enabled = 0');
        this.terminal.writeln('fs.aio-max-nr = 1048576');
        this.terminal.writeln('fs.file-max = 6815744');
        this.terminal.writeln('kernel.hostname = proddb01sim');
        this.terminal.writeln('kernel.shmall = 2097152');
        this.terminal.writeln('kernel.shmmax = 536870912');
        this.terminal.writeln('kernel.shmmni = 4096');
        this.terminal.writeln('kernel.sem = 250 32000 100 128');
        this.terminal.writeln('net.ipv4.ip_local_port_range = 9000 65500');
        this.terminal.writeln('net.core.rmem_default = 262144');
        this.terminal.writeln('net.core.rmem_max = 4194304');
        this.terminal.writeln('net.core.wmem_default = 262144');
        this.terminal.writeln('net.core.wmem_max = 1048576');
        this.terminal.writeln('vm.swappiness = 60');
    } else {
        // Specific parameter
        const param = args[0];
        if (param === 'kernel.shmmax') {
            this.terminal.writeln('kernel.shmmax = 536870912');
        } else if (param === 'fs.file-max') {
            this.terminal.writeln('fs.file-max = 6815744');
        } else {
            this.terminal.writeln(`sysctl: cannot stat /proc/sys/${param.replace('.', '/')}: No such file or directory`);
        }
    }
};

// Add sysctl to the main command processor
const originalProcessCommandForSysctl = CommandProcessor.prototype.processCommand;
CommandProcessor.prototype.processCommand = function(input) {
    const parts = input.trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);
    
    if (command === 'sysctl') {
        this.cmdSysctl(args);
        return;
    }
    
    // Call the already modified processCommand
    originalProcessCommandForSysctl.call(this, input);
};

// Initialize installation files when terminal starts
const terminalInitOriginal = CommandProcessor.prototype.initializeVimModal;
CommandProcessor.prototype.initializeVimModal = function() {
    terminalInitOriginal.call(this);
    this.createInstallationFiles();
};