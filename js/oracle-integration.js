// Oracle Integration - Ties all Oracle modules together

// Refresh Oracle state (check current status dynamically)
CommandProcessor.prototype.refreshOracleState = function() {
    // Check if Oracle user exists
    const passwdContent = this.fs.cat('/etc/passwd');
    if (passwdContent && passwdContent.includes('oracle:x:')) {
        oracleManager.updateState('oracleUserExists', true);
    } else {
        oracleManager.updateState('oracleUserExists', false);
    }
    
    // Check if Oracle groups exist
    const groupContent = this.fs.cat('/etc/group');
    if (groupContent) {
        const requiredGroups = ['oinstall', 'dba'];
        const hasAllRequiredGroups = requiredGroups.every(group => 
            groupContent.includes(`${group}:x:`)
        );
        oracleManager.updateState('oracleGroupsExist', hasAllRequiredGroups);
    } else {
        oracleManager.updateState('oracleGroupsExist', false);
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
    
    // Check if oratab is populated for auto-start
    oracleManager.updateState('oratabPopulated', oracleManager.validateOratabPopulation());
    
    // Check ArcGIS spatial configuration tasks
    this.checkSpatialConfiguration();
};

// Check spatial configuration tasks
CommandProcessor.prototype.checkSpatialConfiguration = function() {
    // Check if EXTPROC is configured
    const extprocContent = this.fs.cat('/u01/app/oracle/product/19.0.0/dbhome_1/hs/admin/extproc.ora');
    if (extprocContent && extprocContent.includes('SET EXTPROC_DLLS=$ARCGIS_HOME/DatabaseSupport/Oracle/Linux64/libst_shapelib.so')) {
        oracleManager.updateState('psAppRequirements.extprocConfigured', true);
    } else {
        oracleManager.updateState('psAppRequirements.extprocConfigured', false);
    }
    
    // Check if SDE user exists in Oracle (would need to check through SQL simulation)
    // For now, we'll check if the Oracle database has the sde user configuration
    const oraTablesContent = this.fs.cat('/u01/app/oracle/oradata/ORCL/system01.dbf');
    if (oraTablesContent && oraTablesContent.includes('SDE_USER_CREATED')) {
        oracleManager.updateState('psAppRequirements.sdeUserCreated', true);
    } else {
        oracleManager.updateState('psAppRequirements.sdeUserCreated', false);
    }
    
    // Check if SDE library is registered (would check through SQL simulation)
    if (oraTablesContent && oraTablesContent.includes('ST_SHAPELIB_REGISTERED')) {
        oracleManager.updateState('psAppRequirements.sdeLibraryRegistered', true);
    } else {
        oracleManager.updateState('psAppRequirements.sdeLibraryRegistered', false);
    }
};

// Initialize Oracle commands when CommandProcessor is created
CommandProcessor.prototype.initOracleCommands = function() {
    // Use the refresh function to avoid code duplication
    this.refreshOracleState();
    
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
        this.terminal.writeln('   creating: rdbms/');
        this.terminal.writeln('   creating: rdbms/admin/');
        this.terminal.writeln('  inflating: rdbms/admin/awrrpt.sql');
        this.terminal.writeln('  inflating: rdbms/admin/addmrpt.sql');
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
        this.fs.mkdir(`${oracleHome}/rdbms`);
        this.fs.mkdir(`${oracleHome}/rdbms/admin`);
        this.fs.mkdir(`${oracleHome}/inventory`);
        this.fs.mkdir(`${oracleHome}/OPatch`);
        this.fs.mkdir(`${oracleHome}/hs`);
        this.fs.mkdir(`${oracleHome}/hs/admin`);
        
        // Create executable files
        const executables = ['adrci', 'dbca', 'dbua', 'lsnrctl', 'netca', 'orapwd', 
                           'rman', 'sqlplus', 'tnsping', 'expdp', 'impdp', 'srvctl'];
        executables.forEach(exe => {
            this.fs.touch(`${oracleHome}/bin/${exe}`, `Oracle ${exe} executable`);
        });
        
        // Create runInstaller
        this.fs.touch(`${oracleHome}/runInstaller`, '#!/bin/sh\n# Oracle Universal Installer');
        
        // Create AWR report script
        this.fs.touch(`${oracleHome}/rdbms/admin/awrrpt.sql`, 
            '-- awrrpt.sql - Automatic Workload Repository Report\n' +
            '-- Oracle Database 19c AWR Report Generation Script\n' +
            '-- Usage: @awrrpt.sql\n' +
            '--\n' +
            '-- This script generates AWR reports for performance analysis\n' +
            '-- AWR reports provide detailed database performance statistics\n' +
            '-- including wait events, SQL statistics, and system metrics\n' +
            '--\n' +
            'SET ECHO OFF\n' +
            'SET FEEDBACK OFF\n' +
            'SET PAGESIZE 0\n' +
            'SET LINESIZE 1000\n' +
            'SET TRIMOUT ON\n' +
            'SET TRIMSPOOL ON\n' +
            '--\n' +
            '-- AWR Report Generation Logic\n' +
            '-- Note: This is a simulation script for training purposes\n' +
            '--\n' +
            'PROMPT\n' +
            'PROMPT Oracle AWR Report Generation\n' +
            'PROMPT ============================\n' +
            'PROMPT\n' +
            'PROMPT Available Snapshots:\n' +
            'PROMPT Snap Id    Begin Snap Time      End Snap Time        Elapsed\n' +
            'PROMPT -------    ---------------      -------------        -------\n' +
            'PROMPT    1234    01-Jan-24 09:00      01-Jan-24 10:00      1.00\n' +
            'PROMPT    1235    01-Jan-24 10:00      01-Jan-24 11:00      1.00\n' +
            'PROMPT    1236    01-Jan-24 11:00      01-Jan-24 12:00      1.00\n' +
            'PROMPT\n' +
            'PROMPT Enter beginning snapshot ID: (default: 1235)\n' +
            'PROMPT Enter ending snapshot ID: (default: 1236)\n' +
            'PROMPT Enter report name: (default: awrrpt_1_1235_1236.html)\n' +
            'PROMPT\n' +
            'PROMPT Generating AWR report...\n' +
            'PROMPT Report saved to: awrrpt_1_1235_1236.html\n' +
            'PROMPT\n');
        
        // Create ADDM report script
        this.fs.touch(`${oracleHome}/rdbms/admin/addmrpt.sql`,
            '-- addmrpt.sql - Automatic Database Diagnostic Monitor Report\n' +
            '-- Oracle Database 19c ADDM Report Generation Script\n' +
            '-- Usage: @addmrpt.sql\n' +
            '--\n' +
            '-- This script generates ADDM reports for automated performance analysis\n' +
            '-- ADDM analyzes AWR data and provides recommendations for performance tuning\n' +
            '-- including identification of bottlenecks and optimization suggestions\n' +
            '--\n' +
            'SET ECHO OFF\n' +
            'SET FEEDBACK OFF\n' +
            'SET PAGESIZE 0\n' +
            'SET LINESIZE 1000\n' +
            'SET TRIMOUT ON\n' +
            'SET TRIMSPOOL ON\n' +
            '--\n' +
            '-- ADDM Report Generation Logic\n' +
            '-- Note: This is a simulation script for training purposes\n' +
            '--\n' +
            'PROMPT\n' +
            'PROMPT Oracle ADDM Report Generation\n' +
            'PROMPT ==============================\n' +
            'PROMPT\n' +
            'PROMPT Available Snapshots for ADDM Analysis:\n' +
            'PROMPT Snap Id    Begin Snap Time      End Snap Time        DB Time\n' +
            'PROMPT -------    ---------------      -------------        -------\n' +
            'PROMPT    1234    01-Jan-24 09:00      01-Jan-24 10:00      45.2m\n' +
            'PROMPT    1235    01-Jan-24 10:00      01-Jan-24 11:00      52.8m\n' +
            'PROMPT    1236    01-Jan-24 11:00      01-Jan-24 12:00      38.1m\n' +
            'PROMPT\n' +
            'PROMPT Enter beginning snapshot ID: (default: 1235)\n' +
            'PROMPT Enter ending snapshot ID: (default: 1236)\n' +
            'PROMPT Enter report name: (default: addmrpt_1_1235_1236.txt)\n' +
            'PROMPT\n' +
            'PROMPT Running ADDM analysis...\n' +
            'PROMPT Analyzing wait events, SQL performance, and system statistics...\n' +
            'PROMPT ADDM report saved to: addmrpt_1_1235_1236.txt\n' +
            'PROMPT\n');
        
        // Create extproc.ora configuration file
        this.fs.touch(`${oracleHome}/hs/admin/extproc.ora`, 
            '# extproc.ora - External Procedure Configuration\n' +
            '# This file contains configuration parameters for external procedures\n' +
            '# Add EXTPROC_DLLS entries for external libraries\n' +
            '#\n' +
            '# Example:\n' +
            '# SET EXTPROC_DLLS=ONLY:/path/to/library.so\n'
        );
        
        // Mark Oracle as installed in state
        oracleManager.updateState('softwareExtracted', true);
        
        return;
    }
    
    if (zipFile === '/install/ArcGIS_Server_Linux_1091_180182.tar.gz') {
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
        // Add to history before executing
        this.history.push(input);
        this.historyIndex = this.history.length;
        this.saveHistory();
        this.cmdOrainstRoot(args);
        return;
    }
    
    if (command === '/u01/app/oracle/product/19.0.0/dbhome_1/root.sh') {
        // Add to history before executing
        this.history.push(input);
        this.historyIndex = this.history.length;
        this.saveHistory();
        this.cmdRootSh(args);
        return;
    }
    
    // Check for unzip command
    if (command === 'unzip') {
        // Add to history before executing
        this.history.push(input);
        this.historyIndex = this.history.length;
        this.saveHistory();
        this.cmdUnzip(args);
        return;
    }
    
    // Check if it's an Oracle command
    if (this.processOracleCommand(command, args)) {
        // Add to history before executing Oracle command
        this.history.push(input);
        this.historyIndex = this.history.length;
        this.saveHistory();
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
        case 'awrrpt':
            this.cmdAwrrpt(args);
            return true;
        case 'addmrpt':
            this.cmdAddmrpt(args);
            return true;
        case 'oraenv':
            this.cmdOraenv(args);
            return true;
        case '.':
            // Handle sourcing commands like '. oraenv'
            if (args.length > 0 && args[0] === 'oraenv') {
                this.cmdOraenv(args.slice(1));
                return true;
            }
            return false;
            
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
    this.fs.touch('/install/ArcGIS_Server_Linux_1091_180182.tar.gz', 'ArcGIS Server 10.9.1 Installation Archive (3.7GB)');
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

// ArcGIS Server Installation Command
CommandProcessor.prototype.cmdArcgisInstall = function(args) {
    if (!this.fs.exists('/install/ArcGIS_Server_Setup')) {
        this.terminal.writeln('ERROR: ArcGIS Server installer not found in /install/');
        this.terminal.writeln('Please ensure the installer is available before proceeding.');
        return;
    }
    
    // Check if arcgis user exists
    const passwdContent = this.fs.cat('/etc/passwd');
    if (!passwdContent || !passwdContent.includes('arcgis:x:')) {
        this.terminal.writeln('ERROR: arcgis user not found. Please create the arcgis user first:');
        this.terminal.writeln('  useradd -u 54330 -g oinstall -G dba arcgis');
        this.terminal.writeln('  passwd arcgis');
        return;
    }
    
    // Check if running as arcgis user
    if (this.fs.currentUser !== 'arcgis') {
        this.terminal.writeln('ERROR: ArcGIS Server must be installed as the arcgis user.');
        this.terminal.writeln('Please switch to the arcgis user: su - arcgis');
        return;
    }
    
    // Check if /opt/arcgis directory exists
    if (!this.fs.exists('/opt/arcgis')) {
        this.terminal.writeln('ERROR: /opt/arcgis directory not found. Please create it first:');
        this.terminal.writeln('  mkdir -p /opt/arcgis');
        this.terminal.writeln('  chown arcgis:oinstall /opt/arcgis');
        return;
    }
    
    // Simulate ArcGIS Server installation
    this.terminal.writeln('ArcGIS Server 10.9.1 Installation');
    this.terminal.writeln('==================================');
    this.terminal.writeln('');
    this.terminal.writeln('Checking system requirements...');
    this.terminal.writeln('✓ Operating System: Red Hat Enterprise Linux 9');
    this.terminal.writeln('✓ Memory: 8GB RAM');
    this.terminal.writeln('✓ Disk Space: 2GB available');
    this.terminal.writeln('✓ Oracle Database: Available');
    this.terminal.writeln('');
    this.terminal.writeln('Installing ArcGIS Server components...');
    this.terminal.writeln('  - Core server runtime');
    this.terminal.writeln('  - Spatial Data Engine (SDE) libraries');
    this.terminal.writeln('  - Oracle spatial extensions');
    this.terminal.writeln('  - EXTPROC libraries');
    this.terminal.writeln('');
    
    // Create ArcGIS directory structure
    this.fs.mkdir('/opt/arcgis/server');
    this.fs.mkdir('/opt/arcgis/server/lib');
    this.fs.mkdir('/opt/arcgis/server/bin');
    
    // Create SDE library file
    this.fs.touch('/opt/arcgis/server/lib/libsde.so', 'ArcSDE spatial library for Oracle EXTPROC integration');
    
    // Create configuration files
    this.fs.touch('/opt/arcgis/server/arcgisserver.conf', 'ArcGIS Server configuration file');
    
    this.terminal.writeln('Creating library files...');
    this.terminal.writeln('  ✓ /opt/arcgis/server/lib/libsde.so');
    this.terminal.writeln('  ✓ Spatial function libraries');
    this.terminal.writeln('');
    this.terminal.writeln('Configuring Oracle integration...');
    this.terminal.writeln('  ✓ EXTPROC library paths configured');
    this.terminal.writeln('  ✓ Spatial data engine ready');
    this.terminal.writeln('');
    this.terminal.writeln('ArcGIS Server 10.9.1 installation completed successfully!');
    this.terminal.writeln('');
    this.terminal.writeln('Next steps:');
    this.terminal.writeln('1. Create SDE user in Oracle:');
    this.terminal.writeln('   sqlplus / as sysdba');
    this.terminal.writeln('   CREATE USER sde IDENTIFIED BY sde;');
    this.terminal.writeln('   GRANT CONNECT, RESOURCE TO sde;');
    this.terminal.writeln('');
    this.terminal.writeln('2. Register spatial library:');
    this.terminal.writeln('   CREATE OR REPLACE LIBRARY sde_util AS \'/opt/arcgis/server/lib/libsde.so\';');
    this.terminal.writeln('');
    this.terminal.writeln('The ArcSDE library is now available for spatial functions via EXTPROC.');
    
    // Update Oracle state
    oracleManager.updateState('psAppRequirements.arcgisInstalled', true);
    oracleManager.updateState('psAppRequirements.arcgisUserCreated', true);
};

// Initialize installation files when terminal starts
const terminalInitOriginal = CommandProcessor.prototype.initializeVimModal;
CommandProcessor.prototype.initializeVimModal = function() {
    terminalInitOriginal.call(this);
    this.createInstallationFiles();
};