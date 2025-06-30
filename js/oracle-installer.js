// Oracle Installer Commands
CommandProcessor.prototype.cmdRunInstaller = function(args) {
    // Check if running as oracle user
    if (this.fs.currentUser !== 'oracle') {
        this.terminal.writeln('Error: runInstaller must be run as oracle user');
        this.terminal.writeln('Please run: su - oracle');
        return;
    }
    
    // Check if installer exists
    if (!this.fs.exists('/install/LINUX.X64_193000_db_home.zip')) {
        this.terminal.writeln('Error: Oracle installation file not found.');
        this.terminal.writeln('Expected: /install/LINUX.X64_193000_db_home.zip');
        return;
    }
    
    // Check if already extracted
    if (!this.fs.exists(`${oracleManager.getState('oracleHome')}/runInstaller`)) {
        this.terminal.writeln('Error: runInstaller not found. Please extract the installation files first:');
        this.terminal.writeln(`cd ${oracleManager.getState('oracleHome')}`);
        this.terminal.writeln('unzip /install/LINUX.X64_193000_db_home.zip');
        return;
    }
    
    // Check prerequisites
    if (!oracleManager.getState('oracleGroupsExist')) {
        this.terminal.writeln('Error: Oracle groups not found. Please create oinstall and dba groups first.');
        return;
    }
    
    const uninstalledPkgs = oracleManager.getUninstalledPackages();
    if (uninstalledPkgs.length > 0) {
        this.terminal.writeln('Error: Missing required packages:');
        uninstalledPkgs.forEach(pkg => {
            this.terminal.writeln(`  - ${pkg}`);
        });
        this.terminal.writeln('\nInstall missing packages using: yum install <package-name>');
        return;
    }
    
    // Check kernel parameters
    if (!oracleManager.checkPrerequisites('kernel_parameters')) {
        this.terminal.writeln('Error: Kernel parameters not properly configured for Oracle.');
        this.terminal.writeln('Required Oracle kernel parameters missing from /etc/sysctl.conf');
        this.terminal.writeln('Run: ocp --hint-detail to see required parameters');
        return;
    }
    
    // Check resource limits
    if (!oracleManager.checkPrerequisites('resource_limits')) {
        this.terminal.writeln('Error: Resource limits not properly configured for Oracle.');
        this.terminal.writeln('Required Oracle limits missing from /etc/security/limits.conf');
        this.terminal.writeln('Run: ocp --hint-detail to see required limits');
        return;
    }
    
    // Simulate installation process
    this.terminal.writeln('Starting Oracle Universal Installer...');
    this.terminal.writeln('');
    this.terminal.writeln('Checking Temp space: must be greater than 500 MB. Actual 12288 MB    Passed');
    this.terminal.writeln('Checking swap space: must be greater than 150 MB. Actual 8192 MB    Passed');
    this.terminal.writeln('Checking monitor: must be configured to display at least 256 colors    Passed');
    this.terminal.writeln('');
    this.terminal.writeln('Preparing to launch Oracle Universal Installer from /tmp/OraInstall2025-01-15_10-23-45AM');
    this.terminal.writeln('');
    this.terminal.writeln('Oracle Database 19c Installer');
    this.terminal.writeln('==============================');
    this.terminal.writeln('');
    this.terminal.writeln('[Simulated GUI Mode]');
    this.terminal.writeln('1. Installation Option: Install database software only');
    this.terminal.writeln('2. Database Installation Options: Single instance database');
    this.terminal.writeln('3. Database Edition: Enterprise Edition');
    this.terminal.writeln('4. Installation Location:');
    this.terminal.writeln('   Oracle base: /u01/app/oracle');
    this.terminal.writeln('   Software location: /u01/app/oracle/product/19.0.0/dbhome_1');
    this.terminal.writeln('5. Create Inventory: /u01/app/oraInventory');
    this.terminal.writeln('6. Operating System Groups:');
    this.terminal.writeln('   Database Administrator (OSDBA) group: dba');
    this.terminal.writeln('   Database Operator (OSOPER) group: oper');
    this.terminal.writeln('   Database Backup and Recovery (OSBACKUPDBA) group: backupdba');
    this.terminal.writeln('   Data Guard administrative (OSDGDBA) group: dgdba');
    this.terminal.writeln('   Encryption Key Management administrative (OSKMDBA) group: kmdba');
    this.terminal.writeln('   Real Application Clusters administrative (OSRACDBA) group: racdba');
    this.terminal.writeln('');
    this.terminal.writeln('Prerequisite checks...');
    this.terminal.writeln('|||||||||||||||||||||||||||||||||||||||||||||||||| 100%');
    this.terminal.writeln('');
    this.terminal.writeln('Installing Oracle Database software...');
    this.terminal.writeln('|||||||||||||||||||||||||||||||||||||||||||||||||| 100%');
    this.terminal.writeln('');
    this.terminal.writeln('Execute Root Scripts:');
    this.terminal.writeln('1. /u01/app/oraInventory/orainstRoot.sh');
    this.terminal.writeln('2. /u01/app/oracle/product/19.0.0/dbhome_1/root.sh');
    this.terminal.writeln('');
    this.terminal.writeln('To execute the configuration scripts:');
    this.terminal.writeln('1. Open a terminal window');
    this.terminal.writeln('2. Log in as "root"');
    this.terminal.writeln('3. Run the scripts');
    this.terminal.writeln('');
    
    // Update state
    oracleManager.updateState('softwareInstalled', true);
    oracleManager.updateState('inventoryCreated', true);
    
    // Create necessary files
    this.fs.touch('/u01/app/oraInventory/orainstRoot.sh', '#!/bin/sh\necho "Changing permissions of /u01/app/oraInventory."\necho "Adding read,write permissions for group."\necho "The execution of the script is complete."');
    this.fs.touch('/u01/app/oracle/product/19.0.0/dbhome_1/root.sh', '#!/bin/sh\necho "Performing root user operation."\necho "The following environment variables are set:"\necho "    ORACLE_OWNER= oracle"\necho "    ORACLE_HOME= /u01/app/oracle/product/19.0.0/dbhome_1"\necho "Creating /etc/oratab file..."\necho "Entries will be added to the /etc/oratab file as needed by"\necho "Database Configuration Assistant when a database is created"');
    
    // Mark runInstaller as executable
    const runInstallerPath = this.fs.resolvePath(`${oracleManager.getState('oracleHome')}/runInstaller`);
    const runInstallerNode = this.fs.getNode(runInstallerPath);
    if (runInstallerNode) {
        runInstallerNode.permissions = '-rwxr-xr-x';
    }
    
    this.terminal.writeln('Installation completed successfully.');
    this.terminal.writeln('Please run the root scripts before proceeding.');
};

// DBCA (Database Configuration Assistant)
CommandProcessor.prototype.cmdDbca = function(args) {
    if (!oracleManager.checkPrerequisites('software')) {
        this.terminal.writeln('Error: Oracle software not installed. Run runInstaller first.');
        return;
    }
    
    if (!oracleManager.getState('rootScriptsRun')) {
        this.terminal.writeln('Warning: Root scripts may not have been executed.');
        this.terminal.writeln('Please ensure you have run:');
        this.terminal.writeln('  /u01/app/oraInventory/orainstRoot.sh');
        this.terminal.writeln('  /u01/app/oracle/product/19.0.0/dbhome_1/root.sh');
    }
    
    if (this.fs.currentUser !== 'oracle') {
        this.terminal.writeln('Error: dbca must be run as oracle user');
        return;
    }
    
    this.terminal.writeln('Starting Database Configuration Assistant...');
    this.terminal.writeln('');
    this.terminal.writeln('[Simulated GUI Mode]');
    this.terminal.writeln('Database Operation: Create a database');
    this.terminal.writeln('');
    this.terminal.writeln('Creation Mode: Typical configuration');
    this.terminal.writeln('Global Database Name: ORCL');
    this.terminal.writeln('SID: ORCL');
    this.terminal.writeln('Container Database: Yes');
    this.terminal.writeln('Number of PDBs: 1');
    this.terminal.writeln('PDB name: ORCLPDB');
    this.terminal.writeln('');
    this.terminal.writeln('Storage Type: File System');
    this.terminal.writeln('Database Files Location: /u01/app/oracle/oradata');
    this.terminal.writeln('Fast Recovery Area: /u01/app/oracle/recovery_area');
    this.terminal.writeln('');
    this.terminal.writeln('Memory:');
    this.terminal.writeln('  Memory Management: Automatic Memory Management');
    this.terminal.writeln('  Memory Size: 2048 MB');
    this.terminal.writeln('');
    this.terminal.writeln('Character Sets:');
    this.terminal.writeln('  Database Character Set: AL32UTF8');
    this.terminal.writeln('  National Character Set: AL16UTF16');
    this.terminal.writeln('');
    this.terminal.writeln('Creating and starting Oracle instance...');
    this.terminal.writeln('|||||||||||||||||||||| 32%');
    this.terminal.writeln('Creating database files...');
    this.terminal.writeln('|||||||||||||||||||||||||||||||| 55%');
    this.terminal.writeln('Creating data dictionary views...');
    this.terminal.writeln('|||||||||||||||||||||||||||||||||||||||| 75%');
    this.terminal.writeln('Creating default users and tablespaces...');
    this.terminal.writeln('||||||||||||||||||||||||||||||||||||||||||||||| 90%');
    this.terminal.writeln('Running post-configuration steps...');
    this.terminal.writeln('|||||||||||||||||||||||||||||||||||||||||||||||||| 100%');
    this.terminal.writeln('');
    this.terminal.writeln('Database creation completed.');
    this.terminal.writeln('');
    this.terminal.writeln('Database Information:');
    this.terminal.writeln('Global Database Name: ORCL');
    this.terminal.writeln('System Identifier(SID): ORCL');
    this.terminal.writeln('');
    
    // Update state
    oracleManager.updateState('databaseCreated', true);
    oracleManager.updateState('databaseName', 'ORCL');
    oracleManager.updateState('databaseStarted', true);
    
    // Create oratab entry
    this.fs.touch('/etc/oratab', '# This file is used by ORACLE utilities.\n# A colon, \':\', is used as the field terminator.\n# Entries are of the form:\n#   $ORACLE_SID:$ORACLE_HOME:<N|Y>:\nORCL:/u01/app/oracle/product/19.0.0/dbhome_1:N');
    
    // Create database directories
    this.fs.mkdir('/u01/app/oracle/oradata');
    this.fs.mkdir('/u01/app/oracle/oradata/ORCL');
    this.fs.mkdir('/u01/app/oracle/recovery_area');
    this.fs.mkdir('/u01/app/oracle/admin');
    this.fs.mkdir('/u01/app/oracle/admin/ORCL');
    this.fs.mkdir('/u01/app/oracle/admin/ORCL/adump');
    
    // Create database files (DBF files)
    this.fs.touch('/u01/app/oracle/oradata/ORCL/system01.dbf', '');
    this.fs.touch('/u01/app/oracle/oradata/ORCL/sysaux01.dbf', '');
    this.fs.touch('/u01/app/oracle/oradata/ORCL/undotbs01.dbf', '');
    this.fs.touch('/u01/app/oracle/oradata/ORCL/users01.dbf', '');
    
    // Create control files
    this.fs.touch('/u01/app/oracle/oradata/ORCL/control01.ctl', '');
    this.fs.touch('/u01/app/oracle/oradata/ORCL/control02.ctl', '');
    
    // Create redo log files
    this.fs.touch('/u01/app/oracle/oradata/ORCL/redo01.log', '');
    this.fs.touch('/u01/app/oracle/oradata/ORCL/redo02.log', '');
    this.fs.touch('/u01/app/oracle/oradata/ORCL/redo03.log', '');
    
    // Add background processes
    oracleManager.state.backgroundProcesses = [
        'ora_pmon_ORCL',
        'ora_psp0_ORCL',
        'ora_vktm_ORCL',
        'ora_gen0_ORCL',
        'ora_mman_ORCL',
        'ora_diag_ORCL',
        'ora_dbrm_ORCL',
        'ora_vkrm_ORCL',
        'ora_dia0_ORCL',
        'ora_dbw0_ORCL',
        'ora_lgwr_ORCL',
        'ora_ckpt_ORCL',
        'ora_lg00_ORCL',
        'ora_smon_ORCL',
        'ora_lg01_ORCL',
        'ora_reco_ORCL',
        'ora_lreg_ORCL',
        'ora_pxmn_ORCL',
        'ora_mmon_ORCL',
        'ora_mmnl_ORCL'
    ];
};

// NETCA (Network Configuration Assistant)
CommandProcessor.prototype.cmdNetca = function(args) {
    if (!oracleManager.checkPrerequisites('software')) {
        this.terminal.writeln('Error: Oracle software not installed. Run runInstaller first.');
        return;
    }
    
    if (this.fs.currentUser !== 'oracle') {
        this.terminal.writeln('Error: netca must be run as oracle user');
        return;
    }
    
    this.terminal.writeln('Oracle Net Configuration Assistant');
    this.terminal.writeln('');
    this.terminal.writeln('[Simulated GUI Mode]');
    this.terminal.writeln('Welcome to Oracle Net Configuration Assistant');
    this.terminal.writeln('');
    this.terminal.writeln('1. Listener configuration');
    this.terminal.writeln('   Action: Add');
    this.terminal.writeln('   Listener name: LISTENER');
    this.terminal.writeln('   Protocol: TCP');
    this.terminal.writeln('   Port: 1521');
    this.terminal.writeln('');
    this.terminal.writeln('Creating Listener Configuration...');
    this.terminal.writeln('|||||||||||||||||||||||||||||||||||||||||||||||||| 100%');
    this.terminal.writeln('');
    this.terminal.writeln('Listener configuration complete.');
    this.terminal.writeln('Oracle Net Listener Startup:');
    this.terminal.writeln('    Running Listener Control:');
    this.terminal.writeln('      /u01/app/oracle/product/19.0.0/dbhome_1/bin/lsnrctl start LISTENER');
    this.terminal.writeln('    Listener Control complete.');
    this.terminal.writeln('    Listener started successfully.');
    this.terminal.writeln('');
    this.terminal.writeln('Oracle Net Services configuration successful.');
    
    // Update state
    oracleManager.updateState('listenerConfigured', true);
    
    // Create network directories
    this.fs.mkdir('/u01/app/oracle/product/19.0.0/dbhome_1/network');
    this.fs.mkdir('/u01/app/oracle/product/19.0.0/dbhome_1/network/admin');
    this.fs.mkdir('/u01/app/oracle/product/19.0.0/dbhome_1/hs');
    this.fs.mkdir('/u01/app/oracle/product/19.0.0/dbhome_1/hs/admin');
    
    // Create listener.ora
    const listenerContent = `# listener.ora Network Configuration File
# Generated by Oracle Net Configuration Assistant

LISTENER =
  (DESCRIPTION_LIST =
    (DESCRIPTION =
      (ADDRESS = (PROTOCOL = TCP)(HOST = proddb01sim)(PORT = 1521))
      (ADDRESS = (PROTOCOL = IPC)(KEY = EXTPROC1521))
    )
  )

SID_LIST_LISTENER =
  (SID_LIST =
    (SID_DESC =
      (SID_NAME = ORCL)
      (ORACLE_HOME = /u01/app/oracle/product/19.0.0/dbhome_1)
    )
    (SID_DESC =
      (SID_NAME = PLSExtProc)
      (ORACLE_HOME = /u01/app/oracle/product/19.0.0/dbhome_1)
      (PROGRAM = extproc)
      (ENVS="EXTPROC_DLLS=ONLY:/u01/app/oracle/product/19.0.0/dbhome_1/bin/oraclr19.dll")
    )
  )`;
    
    this.fs.touch('/u01/app/oracle/product/19.0.0/dbhome_1/network/admin/listener.ora', listenerContent);
    
    // Create tnsnames.ora
    const tnsnamesContent = `# tnsnames.ora Network Configuration File
# Generated by Oracle Net Configuration Assistant

ORCL =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = proddb01sim)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = ORCL)
    )
  )

LISTENER_ORCL =
  (ADDRESS = (PROTOCOL = TCP)(HOST = proddb01sim)(PORT = 1521))`;
    
    this.fs.touch('/u01/app/oracle/product/19.0.0/dbhome_1/network/admin/tnsnames.ora', tnsnamesContent);
    
    // Create extproc.ora (empty initially)
    this.fs.touch('/u01/app/oracle/product/19.0.0/dbhome_1/hs/admin/extproc.ora', '# extproc.ora\n# External Procedure Configuration File\n');
};