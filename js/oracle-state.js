// Oracle State Management with localStorage support
class OracleManager {
    constructor() {
        this.state = {
            // Installation tracking
            softwareInstalled: false,
            inventoryCreated: false,
            rootScriptsRun: false,
            
            // Database tracking
            databaseCreated: false,
            databaseName: 'ORCL',
            databaseStarted: false,
            
            // Listener tracking
            listenerConfigured: false,
            listenerStarted: false,
            listenerPort: 1521,
            
            // Environment tracking
            oracleUserExists: false,
            oracleGroupsExist: false,
            oracleEnvironmentSet: false,
            kernelParametersSet: false,
            limitsConfigured: false,
            oratabPopulated: false,
            firewallConfigured: false,
            
            // Installation paths
            oracleBase: '/u01/app/oracle',
            oracleHome: '/u01/app/oracle/product/19.0.0/dbhome_1',
            oraInventory: '/u01/app/oraInventory',
            
            // Process tracking
            backgroundProcesses: [],
            sessions: [],
            
            // Prerequisites tracking
            requiredPackages: {
                'binutils': false,
                'gcc': false,
                'gcc-c++': false,
                'glibc': false,
                'glibc-devel': false,
                'ksh': false,
                'libaio': false,
                'libaio-devel': false,
                'libgcc': false,
                'libstdc++': false,
                'libstdc++-devel': false,
                'libxcb': false,
                'libX11': false,
                'libXau': false,
                'libXi': false,
                'libXtst': false,
                'libXrender': false,
                'libXrender-devel': false,
                'make': false,
                'net-tools': false,
                'nfs-utils': false,
                'smartmontools': false,
                'sysstat': false,
                'unixODBC': false,
                'unixODBC-devel': false
            },
            
            // PS App requirements
            psAppRequirements: {
                oradataPartitionCreated: false,
                tablespaces: {
                    SDS_TABLE: { created: false, size: 512, autoExtend: 128 },
                    SDS_INDEX: { created: false, size: 512, autoExtend: 128 },
                    SDS_LOB: { created: false, size: 128, autoExtend: 128 },
                    SDS_SMALL_LOB: { created: false, size: 16, autoExtend: 1 },
                    SDS_MEDIUM_LOB: { created: false, size: 64, autoExtend: 16 },
                    SDS_LARGE_LOB: { created: false, size: 1024, autoExtend: 256 }
                },
                arcgisInstalled: false,
                arcgisUserCreated: false,
                extprocConfigured: false,
                sdeUserCreated: false,
                sdeLibraryRegistered: false
            },
            
            // Database user tracking
            databaseUsers: {
                'SYS': { password: 'change_on_install', privileges: ['SYSDBA'], locked: false, created: true },
                'SYSTEM': { password: 'manager', privileges: ['DBA'], locked: false, created: true },
                'DBSNMP': { password: 'dbsnmp', privileges: [], locked: false, created: true },
                'SCOTT': { password: 'tiger', privileges: ['CONNECT', 'RESOURCE'], locked: true, created: true },
                'PUBLIC': { password: null, privileges: [], locked: false, created: true, isRole: true },
                'CONNECT': { password: null, privileges: [], locked: false, created: true, isRole: true },
                'RESOURCE': { password: null, privileges: [], locked: false, created: true, isRole: true },
                'DBA': { password: null, privileges: [], locked: false, created: true, isRole: true }
            },
            
            // Flashback restore points tracking
            restorePoints: {
                // Example format:
                // 'RESTORE_POINT_NAME': {
                //     scn: 1234567,
                //     time: '2024-01-01 10:30:15',
                //     guarantee: false,
                //     storage_size: 0
                // }
            },
            
            // RMAN backup tracking
            rmanBackups: [
                // Default backup for demonstration
                {
                    backupSet: 1,
                    type: 'Full',
                    level: null,
                    size: '800.00M',
                    deviceType: 'DISK',
                    elapsedTime: '00:00:25',
                    completionTime: new Date().toLocaleDateString(),
                    status: 'AVAILABLE',
                    compressed: false,
                    tag: 'TAG' + Date.now(),
                    pieceName: '/u01/app/oracle/recovery_area/ORCL/backupset/backup_ORCL_set1.bkp',
                    datafiles: [
                        {file: 1, type: 'Full', ckpSCN: 2194304, ckpTime: new Date().toLocaleDateString(), name: '/u01/app/oracle/oradata/ORCL/system01.dbf'},
                        {file: 3, type: 'Full', ckpSCN: 2194304, ckpTime: new Date().toLocaleDateString(), name: '/u01/app/oracle/oradata/ORCL/sysaux01.dbf'},
                        {file: 4, type: 'Full', ckpSCN: 2194304, ckpTime: new Date().toLocaleDateString(), name: '/u01/app/oracle/oradata/ORCL/undotbs01.dbf'},
                        {file: 7, type: 'Full', ckpSCN: 2194304, ckpTime: new Date().toLocaleDateString(), name: '/u01/app/oracle/oradata/ORCL/users01.dbf'}
                    ]
                }
            ]
        };
        
        // Load state from localStorage on initialization
        this.loadState();
    }

    checkPrerequisites(requirement) {
        switch (requirement) {
            case 'software':
                return this.state.softwareInstalled;
            case 'database':
                return this.state.softwareInstalled && this.state.databaseCreated;
            case 'listener':
                return this.state.softwareInstalled && this.state.listenerConfigured;
            case 'running_database':
                return this.state.databaseCreated && this.state.databaseStarted;
            case 'running_listener':
                return this.state.listenerConfigured && this.state.listenerStarted;
            case 'all_packages':
                return Object.values(this.state.requiredPackages).every(installed => installed);
            case 'kernel_parameters':
                return this.validateKernelParameters();
            case 'resource_limits':
                return this.validateResourceLimits();
            default:
                return true;
        }
    }

    validateKernelParameters() {
        // Check if actual kernel parameters are correctly set in /etc/sysctl.conf
        if (typeof fs === 'undefined') return false;
        
        const sysctlContent = fs.cat('/etc/sysctl.conf');
        if (!sysctlContent) return false;
        
        const requiredParams = {
            'fs.aio-max-nr': '1048576',
            'fs.file-max': '6815744', 
            'kernel.shmall': '2097152',
            'kernel.shmmax': '536870912',
            'kernel.shmmni': '4096',
            'kernel.sem': '250 32000 100 128',
            'net.ipv4.ip_local_port_range': '9000 65500',
            'net.core.rmem_default': '262144',
            'net.core.rmem_max': '4194304',
            'net.core.wmem_default': '262144',
            'net.core.wmem_max': '1048576'
        };
        
        // Parse the sysctl.conf content to extract parameter values
        const lines = sysctlContent.split('\n');
        const actualParams = {};
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const match = trimmed.match(/^([^=]+?)\s*=\s*(.+)$/);
                if (match) {
                    const key = match[1].trim();
                    const value = match[2].trim();
                    actualParams[key] = value;
                }
            }
        }
        
        // Check if all required parameters are present with correct values
        return Object.entries(requiredParams).every(([key, expectedValue]) => {
            return actualParams[key] === expectedValue;
        });
    }

    validateResourceLimits() {
        // Check if actual resource limits are correctly set in /etc/security/limits.conf
        if (typeof fs === 'undefined') return false;
        
        const limitsContent = fs.cat('/etc/security/limits.conf');
        if (!limitsContent) return false;
        
        const requiredLimits = [
            'oracle soft nproc 2047',
            'oracle hard nproc 16384',
            'oracle soft nofile 1024',
            'oracle hard nofile 65536',
            'oracle soft stack 10240',
            'oracle hard stack 32768'
        ];
        
        return requiredLimits.every(limit => limitsContent.includes(limit));
    }

    validateOratabPopulation() {
        // Check if oratab has the database configured for automatic startup
        if (typeof fs === 'undefined') return false;
        
        const oratabContent = fs.cat('/etc/oratab');
        if (!oratabContent) return false;
        
        // Look for ORCL entry with Y flag for auto-start
        return oratabContent.includes('ORCL:/u01/app/oracle/product/19.0.0/dbhome_1:Y');
    }

    updateState(key, value) {
        if (key.includes('.')) {
            // Handle nested properties
            const keys = key.split('.');
            let obj = this.state;
            for (let i = 0; i < keys.length - 1; i++) {
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = value;
        } else {
            this.state[key] = value;
        }
        this.saveState();
    }

    getState(key) {
        if (key.includes('.')) {
            // Handle nested properties
            const keys = key.split('.');
            let obj = this.state;
            for (const k of keys) {
                obj = obj[k];
                if (obj === undefined) return undefined;
            }
            return obj;
        }
        return this.state[key];
    }
    
    setPackageInstalled(packageName) {
        if (this.state.requiredPackages.hasOwnProperty(packageName)) {
            this.state.requiredPackages[packageName] = true;
            this.saveState();
        }
    }
    
    getUninstalledPackages() {
        return Object.entries(this.state.requiredPackages)
            .filter(([pkg, installed]) => !installed)
            .map(([pkg]) => pkg);
    }
    
    saveState() {
        try {
            localStorage.setItem('oracleManagerState', JSON.stringify(this.state));
        } catch (e) {
            console.error('Failed to save state to localStorage:', e);
        }
    }
    
    loadState() {
        try {
            const savedState = localStorage.getItem('oracleManagerState');
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                // Merge saved state with default state to handle new properties
                this.state = { ...this.state, ...parsedState };
                // Ensure nested objects are properly merged
                if (parsedState.requiredPackages) {
                    this.state.requiredPackages = { ...this.state.requiredPackages, ...parsedState.requiredPackages };
                }
                if (parsedState.psAppRequirements) {
                    this.state.psAppRequirements = { ...this.state.psAppRequirements, ...parsedState.psAppRequirements };
                    if (parsedState.psAppRequirements.tablespaces) {
                        this.state.psAppRequirements.tablespaces = { 
                            ...this.state.psAppRequirements.tablespaces, 
                            ...parsedState.psAppRequirements.tablespaces 
                        };
                    }
                }
                if (parsedState.databaseUsers) {
                    this.state.databaseUsers = { ...this.state.databaseUsers, ...parsedState.databaseUsers };
                }
            }
        } catch (e) {
            console.error('Failed to load state from localStorage:', e);
            // Start fresh if there's an error
            this.state = this.constructor.prototype.constructor().state;
        }
    }
    
    clearState() {
        try {
            localStorage.removeItem('oracleManagerState');
            // Keep fileSystemState to preserve file contents across reboots
            // localStorage.removeItem('fileSystemState');
        } catch (e) {
            console.error('Failed to clear localStorage:', e);
        }
    }
    
    // Calculate progress for OCP command
    calculateProgress() {
        const tasks = {
            // Prerequisites
            'Oracle Groups Created': this.state.oracleGroupsExist,
            'Oracle User Created': this.state.oracleUserExists,
            'Required Packages Installed': this.checkPrerequisites('all_packages'),
            'Kernel Parameters Set': this.checkPrerequisites('kernel_parameters'),
            'Resource Limits Configured': this.checkPrerequisites('resource_limits'),
            'Firewall Port 1521 Opened': this.state.firewallConfigured,
            
            // Installation
            'Oracle Software Installed': this.state.softwareInstalled,
            'Root Scripts Executed': this.state.rootScriptsRun,
            'Oracle Environment Set': this.state.oracleEnvironmentSet,
            
            // Database & Network
            'Database Created': this.state.databaseCreated,
            'Listener Configured': this.state.listenerConfigured,
            'Database Started': this.state.databaseStarted,
            'Listener Started': this.state.listenerStarted,
            'Oratab Populated for Auto-Start': this.state.oratabPopulated,
            
            // ArcGIS Server for Spatial Extensions
            'ArcGIS Server Installed': this.state.psAppRequirements.arcgisInstalled,
            'EXTPROC Configuration Updated': this.state.psAppRequirements.extprocConfigured,
            'SDE User Created': this.state.psAppRequirements.sdeUserCreated,
            'SDE Library Registered': this.state.psAppRequirements.sdeLibraryRegistered
        };
        
        const completed = Object.values(tasks).filter(Boolean).length;
        const total = Object.keys(tasks).length;
        const percentage = Math.round((completed / total) * 100);
        
        return { tasks, completed, total, percentage };
    }
    
    getNextTask() {
        const progress = this.calculateProgress();
        
        // Find first incomplete task
        for (const [taskName, isComplete] of Object.entries(progress.tasks)) {
            if (!isComplete) {
                return this.getTaskHint(taskName);
            }
        }
        
        return null;
    }
    
    getTaskHint(taskName) {
        const hints = {
            'Oracle Groups Created': {
                title: 'Create Oracle Installation Groups',
                hint: 'Create Oracle installation groups (oinstall, dba, etc.)',
                commands: [
                    'groupadd -g 54321 oinstall',
                    'groupadd -g 54322 dba',
                    'groupadd -g 54323 oper',
                    'groupadd -g 54324 backupdba',
                    'groupadd -g 54325 dgdba',
                    'groupadd -g 54326 kmdba',
                    'groupadd -g 54327 racdba'
                ],
                explanation: 'Oracle requires specific system groups for security and administration. The oinstall group owns Oracle software, while dba group provides SYSDBA privileges.',
                troubleshooting: [
                    {
                        problem: 'Group already exists error',
                        solution: 'Check existing groups with "cat /etc/group" and skip existing ones'
                    },
                    {
                        problem: 'Permission denied',
                        solution: 'Must run as root user. Use "su -" to switch to root'
                    }
                ]
            },
            'Oracle User Created': {
                title: 'Create Oracle User Account',
                hint: 'Create the oracle user with appropriate groups',
                commands: [
                    'useradd -u 54321 -g oinstall -G dba,oper,backupdba,dgdba,kmdba,racdba oracle',
                    'passwd oracle'
                ],
                explanation: 'The oracle user is the software owner for Oracle Database. It must belong to oinstall (primary) and dba groups for proper installation and administration.',
                troubleshooting: [
                    {
                        problem: 'User already exists',
                        solution: 'Use "id oracle" to check. If exists, modify with "usermod" instead'
                    },
                    {
                        problem: 'Groups not found',
                        solution: 'Create Oracle groups first before creating the user'
                    }
                ]
            },
            'Required Packages Installed': {
                title: 'Install Required Packages',
                hint: 'Install all required packages for Oracle 19c',
                commands: [
                    'yum install -y binutils gcc gcc-c++ glibc glibc-devel ksh libaio libaio-devel',
                    'yum install -y libgcc libstdc++ libstdc++-devel libxcb libX11 libXau libXi',
                    'yum install -y libXtst libXrender libXrender-devel make net-tools nfs-utils',
                    'yum install -y smartmontools sysstat unixODBC unixODBC-devel'
                ],
                explanation: 'Oracle Database requires specific system libraries and development tools for compilation and runtime operation.',
                troubleshooting: [
                    {
                        problem: 'Package not found',
                        solution: 'Check repository configuration or use alternatives like "yum search <package>"'
                    },
                    {
                        problem: 'Dependency conflicts',
                        solution: 'Use "yum clean all" and retry, or install packages individually'
                    }
                ]
            },
            'Kernel Parameters Set': {
                title: 'Configure Kernel Parameters',
                hint: 'Configure kernel parameters for Oracle',
                commands: [
                    'vim /etc/sysctl.conf',
                    '# Add these Oracle parameters:',
                    '# fs.aio-max-nr = 1048576',
                    '# fs.file-max = 6815744',
                    '# kernel.shmall = 2097152',
                    '# kernel.shmmax = 536870912',
                    '# kernel.shmmni = 4096',
                    '# kernel.sem = 250 32000 100 128',
                    '# net.ipv4.ip_local_port_range = 9000 65500',
                    '# net.core.rmem_default = 262144',
                    '# net.core.rmem_max = 4194304',
                    '# net.core.wmem_default = 262144',
                    '# net.core.wmem_max = 1048576',
                    'sysctl -p'
                ],
                explanation: 'Oracle requires specific kernel parameters for memory management, file handling, and network performance.',
                troubleshooting: [
                    {
                        problem: 'sysctl -p shows errors',
                        solution: 'Check parameter syntax and verify values are appropriate for your system'
                    },
                    {
                        problem: 'Parameters not applied after reboot',
                        solution: 'Ensure parameters are saved in /etc/sysctl.conf, not just applied temporarily'
                    }
                ]
            },
            'Resource Limits Configured': {
                title: 'Configure Resource Limits',
                hint: 'Configure resource limits for the oracle user',
                commands: [
                    'vim /etc/security/limits.conf',
                    '# Add these Oracle limits:',
                    '# oracle soft nproc 2047',
                    '# oracle hard nproc 16384',
                    '# oracle soft nofile 1024',
                    '# oracle hard nofile 65536',
                    '# oracle soft stack 10240',
                    '# oracle hard stack 32768'
                ],
                explanation: 'Oracle requires specific resource limits for processes, file descriptors, and stack size to operate properly.',
                troubleshooting: [
                    {
                        problem: 'Limits not applied after login',
                        solution: 'Log out and log back in, or restart the session to apply limits'
                    }
                ]
            },
            'Oracle Software Installed': {
                title: 'Install Oracle Database Software',
                hint: 'Extract and install Oracle software',
                commands: [
                    'su - oracle',
                    'mkdir -p /u01/app/oracle/product/19.0.0/dbhome_1',
                    'cd /u01/app/oracle/product/19.0.0/dbhome_1',
                    'unzip /install/LINUX.X64_193000_db_home.zip',
                    './runInstaller'
                ],
                explanation: 'The Oracle installer extracts and installs the database software binaries in the Oracle Home directory.',
                troubleshooting: [
                    {
                        problem: 'Permission denied on directories',
                        solution: 'Ensure oracle user owns /u01/app/oracle directory tree'
                    },
                    {
                        problem: 'runInstaller fails',
                        solution: 'Check prerequisites and run the installer in silent mode if needed'
                    }
                ]
            },
            'Root Scripts Executed': {
                title: 'Execute Root Configuration Scripts',
                hint: 'Run the post-installation root scripts',
                commands: [
                    '/u01/app/oraInventory/orainstRoot.sh',
                    '/u01/app/oracle/product/19.0.0/dbhome_1/root.sh'
                ],
                explanation: 'Root scripts configure system-level Oracle settings and permissions that require root privileges.',
                troubleshooting: [
                    {
                        problem: 'Script not found',
                        solution: 'Verify Oracle software installation completed successfully'
                    }
                ]
            },
            'Oracle Environment Set': {
                title: 'Configure Oracle Environment',
                hint: 'Set Oracle environment variables',
                commands: [
                    'su - oracle',
                    '. oraenv',
                    '# Or add to .bash_profile'
                ],
                explanation: 'Oracle environment variables (ORACLE_HOME, ORACLE_SID, PATH) must be set for proper operation.',
                troubleshooting: [
                    {
                        problem: 'oraenv command not found',
                        solution: 'Manually set ORACLE_HOME and add $ORACLE_HOME/bin to PATH'
                    }
                ]
            },
            'Database Created': {
                title: 'Create Oracle Database',
                hint: 'Create the Oracle database using DBCA',
                commands: [
                    'su - oracle',
                    'dbca'
                ],
                explanation: 'DBCA (Database Configuration Assistant) creates the actual database instance with datafiles, control files, and redo logs.',
                troubleshooting: [
                    {
                        problem: 'DBCA hangs or fails',
                        solution: 'Check available disk space and memory. Use silent mode for automation'
                    }
                ]
            },
            'Listener Configured': {
                title: 'Configure Oracle Listener',
                hint: 'Configure the Oracle listener',
                commands: [
                    'su - oracle',
                    'netca'
                ],
                explanation: 'The Oracle listener handles client connection requests and enables remote database access.',
                troubleshooting: [
                    {
                        problem: 'Listener configuration fails',
                        solution: 'Manually create listener.ora in $ORACLE_HOME/network/admin'
                    }
                ]
            },
            'Database Started': {
                title: 'Start Oracle Database',
                hint: 'Start the Oracle database',
                commands: [
                    'su - oracle',
                    'sqlplus / as sysdba',
                    'SQL> startup'
                ],
                explanation: 'Starting the database opens it for user connections and normal operations.',
                troubleshooting: [
                    {
                        problem: 'ORA-01034: ORACLE not available',
                        solution: 'Check if instance is started with "startup" command in SQL*Plus'
                    }
                ]
            },
            'Listener Started': {
                title: 'Start Oracle Listener',
                hint: 'Start the Oracle listener',
                commands: [
                    'su - oracle',
                    'lsnrctl start'
                ],
                explanation: 'The listener must be running to accept client connections from applications.',
                troubleshooting: [
                    {
                        problem: 'TNS-01190: The user is not authorized',
                        solution: 'Run as oracle user, or check listener.ora permissions'
                    }
                ]
            },
            'Firewall Port 1521 Opened': {
                title: 'Configure Firewall for Oracle',
                hint: 'Configure firewall to allow Oracle listener port 1521',
                commands: [
                    'firewall-cmd --permanent --add-port=1521/tcp',
                    'firewall-cmd --reload',
                    'firewall-cmd --list-ports'
                ],
                explanation: 'Oracle listener uses port 1521 by default. Firewall must allow this port for remote connections.',
                troubleshooting: [
                    {
                        problem: 'Firewall commands fail',
                        solution: 'Run as root user, or use iptables if firewalld is not available'
                    }
                ]
            },
            'Oratab Populated for Auto-Start': {
                title: 'Configure Automatic Database Startup',
                hint: 'Configure oratab for automatic database startup on boot',
                commands: [
                    'su - oracle',
                    'vi /etc/oratab',
                    '# Change the ORCL entry from :N to :Y',
                    '# ORCL:/u01/app/oracle/product/19.0.0/dbhome_1:Y'
                ],
                explanation: 'Oratab configuration enables automatic database startup during system boot.',
                troubleshooting: [
                    {
                        problem: 'Cannot edit /etc/oratab',
                        solution: 'File requires root permissions. Use "sudo vi /etc/oratab"'
                    }
                ]
            },
            'ArcGIS Server Installed': {
                title: 'Install ArcGIS Server',
                hint: 'Install ArcGIS Server to provide database support libraries for Oracle spatial integration',
                commands: [
                    '# Create arcgis user',
                    'useradd -u 54330 -g oinstall -G dba arcgis',
                    'passwd arcgis',
                    'mkdir -p /opt/arcgis',
                    'chown arcgis:oinstall /opt/arcgis',
                    '# Install ArcGIS Server',
                    'su - arcgis',
                    'cd /install',
                    './ArcGIS_Server_Setup',
                    '# Set environment variable',
                    'export ARCGIS_HOME=/opt/arcgis'
                ],
                explanation: 'ArcGIS Server provides database support libraries including libst_shapelib.so for Oracle spatial integration. This installation only sets up ArcGIS Server - Oracle integration must be configured separately.',
                troubleshooting: [
                    {
                        problem: 'ArcGIS installer not found',
                        solution: 'Ensure ArcGIS Server installation files are in /install directory'
                    },
                    {
                        problem: 'Library creation fails',
                        solution: 'Verify libsde.so exists in /opt/arcgis/server/lib/ and has proper permissions'
                    },
                    {
                        problem: 'EXTPROC configuration issues',
                        solution: 'Ensure listener.ora includes EXTPROC service and tnsnames.ora has EXTPROC entry'
                    },
                    {
                        problem: 'Spatial functions not working',
                        solution: 'Verify SDE schema objects are created and spatial packages are installed'
                    }
                ]
            },
            'EXTPROC Configuration Updated': {
                title: 'Configure EXTPROC for ArcGIS Integration',
                hint: 'Edit extproc.ora to enable ArcGIS spatial library integration',
                commands: [
                    '# Edit extproc.ora file',
                    'vi $ORACLE_HOME/hs/admin/extproc.ora',
                    '# Add this line to the file:',
                    'SET EXTPROC_DLLS=/opt/arcgis/server/lib/libsde.so',
                    '# Save and exit the file'
                ],
                explanation: 'The EXTPROC_DLLS parameter tells Oracle which external libraries can be loaded by the EXTPROC process. This enables Oracle to call functions from the ArcGIS spatial library for geodatabase operations.',
                troubleshooting: [
                    {
                        problem: 'extproc.ora file not found',
                        solution: 'Check that $ORACLE_HOME is set correctly and Oracle is installed'
                    },
                    {
                        problem: 'ARCGIS_HOME not set',
                        solution: 'Run: export ARCGIS_HOME=/opt/arcgis'
                    },
                    {
                        problem: 'Permission denied editing file',
                        solution: 'Switch to oracle user: su - oracle'
                    }
                ]
            },
            'SDE User Created': {
                title: 'Create SDE User in Oracle',
                hint: 'Create the SDE user to manage spatial data engine operations',
                commands: [
                    'sqlplus / as sysdba',
                    'CREATE USER sde IDENTIFIED BY sde;',
                    'GRANT CONNECT, RESOURCE TO sde;',
                    'GRANT CREATE SESSION TO sde;',
                    'GRANT CREATE TABLE TO sde;',
                    'GRANT CREATE PROCEDURE TO sde;',
                    'exit'
                ],
                explanation: 'The SDE (Spatial Data Engine) user manages geodatabase operations and spatial data structures. This user requires specific privileges to create and manage spatial objects in Oracle.',
                troubleshooting: [
                    {
                        problem: 'User already exists',
                        solution: 'Drop existing user: DROP USER sde CASCADE; then recreate'
                    },
                    {
                        problem: 'Insufficient privileges',
                        solution: 'Ensure you are connected as SYSDBA'
                    }
                ]
            },
            'SDE Library Registered': {
                title: 'Register ArcGIS Spatial Library with Oracle',
                hint: 'Create Oracle library object for ArcGIS spatial functions',
                commands: [
                    'sqlplus / as sysdba',
                    "CREATE OR REPLACE LIBRARY st_shapelib AS '/opt/arcgis/server/lib/libsde.so';",
                    'GRANT EXECUTE ON st_shapelib TO sde;',
                    'GRANT EXECUTE ON st_shapelib TO public;',
                    'exit'
                ],
                explanation: 'The Oracle LIBRARY object provides a way to call external C libraries from PL/SQL. This registers the ArcGIS spatial library so Oracle can use ArcGIS spatial functions through EXTPROC.',
                troubleshooting: [
                    {
                        problem: 'Library file not found',
                        solution: 'Verify libsde.so exists in /opt/arcgis/server/lib/'
                    },
                    {
                        problem: 'EXTPROC_DLLS not configured',
                        solution: 'Ensure extproc.ora contains the EXTPROC_DLLS setting'
                    },
                    {
                        problem: 'Permission errors',
                        solution: 'Check file permissions on library file: chmod 755 libsde.so'
                    }
                ]
            },
            'Oradata Partition Created': {
                title: 'Create Oradata Directory',
                hint: 'Create the /oradata directory for PS tablespaces',
                commands: [
                    'mkdir /oradata',
                    'chown oracle:oinstall /oradata',
                    'chmod 755 /oradata'
                ]
            },
            'PS Tablespaces Created': {
                hint: 'Create all PS application tablespaces',
                commands: [
                    'sqlplus / as sysdba',
                    'CREATE TABLESPACE SDS_TABLE DATAFILE \'/oradata/SDS_TABLE.dbf\' SIZE 512M AUTOEXTEND ON NEXT 128M;',
                    'CREATE TABLESPACE SDS_INDEX DATAFILE \'/oradata/SDS_INDEX.dbf\' SIZE 512M AUTOEXTEND ON NEXT 128M;',
                    'CREATE TABLESPACE SDS_LOB DATAFILE \'/oradata/SDS_LOB.dbf\' SIZE 128M AUTOEXTEND ON NEXT 128M;',
                    'CREATE TABLESPACE SDS_SMALL_LOB DATAFILE \'/oradata/SDS_SMALL_LOB.dbf\' SIZE 16M AUTOEXTEND ON NEXT 1M;',
                    'CREATE TABLESPACE SDS_MEDIUM_LOB DATAFILE \'/oradata/SDS_MEDIUM_LOB.dbf\' SIZE 64M AUTOEXTEND ON NEXT 16M;',
                    'CREATE TABLESPACE SDS_LARGE_LOB DATAFILE \'/oradata/SDS_LARGE_LOB.dbf\' SIZE 1G AUTOEXTEND ON NEXT 256M;'
                ]
            },
            'ArcGIS Installed': {
                hint: 'Install ArcGIS Server 10.9',
                commands: [
                    './ArcGIS_Server_Setup'
                ]
            },
            'EXTPROC Configured': {
                hint: 'Configure EXTPROC for spatial library',
                commands: [
                    'cd $ORACLE_HOME/hs/admin',
                    'vim extproc.ora',
                    '# Add: SET EXTPROC_DLLS=/opt/arcgis/server/lib/libsde.so',
                    'lsnrctl reload'
                ]
            },
            'SDE User Created': {
                hint: 'Create the SDE user for spatial data',
                commands: [
                    'sqlplus / as sysdba',
                    'CREATE USER sde IDENTIFIED BY sde;',
                    'GRANT DBA TO sde;'
                ]
            },
            'Spatial Library Registered': {
                hint: 'Register the spatial library in Oracle',
                commands: [
                    'sqlplus sde/sde',
                    'CREATE OR REPLACE LIBRARY SDE.ST_SHAPELIB IS \'/opt/arcgis/server/lib/libsde.so\';'
                ]
            }
        };
        
        return hints[taskName] || { hint: 'Unknown task', commands: [] };
    }
    
    // Database user management methods
    createDatabaseUser(username, password, privileges = []) {
        const upperUsername = username.toUpperCase();
        this.state.databaseUsers[upperUsername] = {
            password: password,
            privileges: privileges,
            locked: false,
            created: true
        };
        
        // Update specific state flags for tracked users
        if (upperUsername === 'SDE') {
            this.updateState('psAppRequirements.sdeUserCreated', true);
        }
        
        this.saveState();
        return true;
    }
    
    authenticateUser(username, password) {
        const upperUsername = username.toUpperCase();
        const user = this.state.databaseUsers[upperUsername];
        
        if (!user || !user.created) {
            return { success: false, error: 'ORA-01017: invalid username/password; logon denied' };
        }
        
        // Roles cannot be used for authentication
        if (user.isRole) {
            return { success: false, error: 'ORA-01017: invalid username/password; logon denied' };
        }
        
        if (user.locked) {
            return { success: false, error: 'ORA-28000: the account is locked' };
        }
        
        if (user.password !== password) {
            return { success: false, error: 'ORA-01017: invalid username/password; logon denied' };
        }
        
        return { success: true, user: user, username: upperUsername };
    }
    
    grantPrivilege(username, privilege) {
        const upperUsername = username.toUpperCase();
        const user = this.state.databaseUsers[upperUsername];
        
        if (!user || !user.created) {
            return false;
        }
        
        if (!user.privileges.includes(privilege)) {
            user.privileges.push(privilege);
        }
        
        this.saveState();
        return true;
    }
    
    revokePrivilege(username, privilege) {
        const upperUsername = username.toUpperCase();
        const user = this.state.databaseUsers[upperUsername];
        
        if (!user || !user.created) {
            return false;
        }
        
        const index = user.privileges.indexOf(privilege);
        if (index > -1) {
            user.privileges.splice(index, 1);
        }
        
        this.saveState();
        return true;
    }
    
    userExists(username) {
        const upperUsername = username.toUpperCase();
        return this.state.databaseUsers[upperUsername] && this.state.databaseUsers[upperUsername].created;
    }
    
    isRole(username) {
        const upperUsername = username.toUpperCase();
        const user = this.state.databaseUsers[upperUsername];
        return user && user.created && user.isRole === true;
    }
    
    getUserPrivileges(username) {
        const upperUsername = username.toUpperCase();
        const user = this.state.databaseUsers[upperUsername];
        return user && user.created ? user.privileges : [];
    }
    
    getAllUsers() {
        return Object.keys(this.state.databaseUsers).filter(username => 
            this.state.databaseUsers[username].created
        );
    }
    
    dropDatabaseUser(username) {
        const upperUsername = username.toUpperCase();
        const user = this.state.databaseUsers[upperUsername];
        
        if (!user || !user.created) {
            return false;
        }
        
        // Mark user as not created (soft delete to preserve state structure)
        user.created = false;
        user.locked = true;
        
        // Update specific state flags for tracked users
        if (upperUsername === 'SDE') {
            this.updateState('psAppRequirements.sdeUserCreated', false);
        }
        
        this.saveState();
        return true;
    }

    // Role management functions
    createRole(roleName, password = null) {
        const upperRoleName = roleName.toUpperCase();
        this.state.databaseUsers[upperRoleName] = {
            password: password,
            privileges: [],
            locked: false,
            created: true,
            isRole: true,
            grantedRoles: [],
            grantedPrivileges: []
        };
        this.saveState();
        return true;
    }

    roleExists(roleName) {
        const upperRoleName = roleName.toUpperCase();
        const role = this.state.databaseUsers[upperRoleName];
        return role && role.created && role.isRole;
    }

    dropRole(roleName) {
        const upperRoleName = roleName.toUpperCase();
        const role = this.state.databaseUsers[upperRoleName];
        
        if (!role || !role.isRole) {
            return false;
        }

        // Remove role from all users who have it granted
        Object.keys(this.state.databaseUsers).forEach(username => {
            const user = this.state.databaseUsers[username];
            if (user.grantedRoles) {
                user.grantedRoles = user.grantedRoles.filter(r => r !== upperRoleName);
            }
        });

        // Mark role as deleted
        role.created = false;
        this.saveState();
        return true;
    }

    grantRoleToUser(roleName, username) {
        const upperRoleName = roleName.toUpperCase();
        const upperUsername = username.toUpperCase();
        
        const role = this.state.databaseUsers[upperRoleName];
        const user = this.state.databaseUsers[upperUsername];

        if (!role || !role.isRole || !role.created) {
            return { success: false, error: `ORA-01919: role '${roleName}' does not exist` };
        }

        if (!user || !user.created || user.isRole) {
            return { success: false, error: `ORA-00942: user '${username}' does not exist` };
        }

        // Initialize grantedRoles if it doesn't exist
        if (!user.grantedRoles) {
            user.grantedRoles = [];
        }

        // Check if role is already granted
        if (user.grantedRoles.includes(upperRoleName)) {
            return { success: false, error: `ORA-01924: role '${roleName}' not granted or does not exist` };
        }

        // Grant the role
        user.grantedRoles.push(upperRoleName);
        this.saveState();
        return { success: true };
    }

    revokeRoleFromUser(roleName, username) {
        const upperRoleName = roleName.toUpperCase();
        const upperUsername = username.toUpperCase();
        
        const user = this.state.databaseUsers[upperUsername];

        if (!user || !user.created || user.isRole) {
            return { success: false, error: `ORA-00942: user '${username}' does not exist` };
        }

        if (!user.grantedRoles || !user.grantedRoles.includes(upperRoleName)) {
            return { success: false, error: `ORA-01951: ROLE '${roleName}' not granted to '${username}'` };
        }

        // Revoke the role
        user.grantedRoles = user.grantedRoles.filter(r => r !== upperRoleName);
        this.saveState();
        return { success: true };
    }

    grantPrivilegeToRole(privilege, roleName) {
        const upperRoleName = roleName.toUpperCase();
        const role = this.state.databaseUsers[upperRoleName];

        if (!role || !role.isRole || !role.created) {
            return { success: false, error: `ORA-01919: role '${roleName}' does not exist` };
        }

        // Initialize grantedPrivileges if it doesn't exist
        if (!role.grantedPrivileges) {
            role.grantedPrivileges = [];
        }

        // Check if privilege is already granted
        if (role.grantedPrivileges.includes(privilege.toUpperCase())) {
            return { success: true }; // Already granted, silently succeed
        }

        // Grant the privilege
        role.grantedPrivileges.push(privilege.toUpperCase());
        this.saveState();
        return { success: true };
    }

    getAllRoles() {
        return Object.keys(this.state.databaseUsers).filter(name => {
            const entry = this.state.databaseUsers[name];
            return entry.created && entry.isRole;
        });
    }

    getUserRoles(username) {
        const upperUsername = username.toUpperCase();
        const user = this.state.databaseUsers[upperUsername];
        
        if (!user || !user.created || user.isRole) {
            return [];
        }

        return user.grantedRoles || [];
    }

    getRolePrivileges(roleName) {
        const upperRoleName = roleName.toUpperCase();
        const role = this.state.databaseUsers[upperRoleName];
        
        if (!role || !role.isRole || !role.created) {
            return [];
        }

        return role.grantedPrivileges || [];
    }
    
    // Restore Point Management
    createRestorePoint(name, guarantee = false) {
        // Generate a realistic SCN (System Change Number)
        const scn = Math.floor(Math.random() * 9000000) + 1000000;
        
        // Generate current timestamp
        const now = new Date();
        const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
        
        this.state.restorePoints[name.toUpperCase()] = {
            scn: scn,
            time: timestamp,
            guarantee: guarantee,
            storage_size: guarantee ? 0 : null
        };
        
        this.saveState();
        return { scn, timestamp };
    }
    
    dropRestorePoint(name) {
        const upperName = name.toUpperCase();
        if (this.state.restorePoints[upperName]) {
            delete this.state.restorePoints[upperName];
            this.saveState();
            return true;
        }
        return false;
    }
    
    getRestorePoints() {
        return this.state.restorePoints;
    }
    
    restorePointExists(name) {
        return this.state.restorePoints.hasOwnProperty(name.toUpperCase());
    }
    
    // RMAN backup management methods
    addBackup(backupType, level = null, compressed = false) {
        const newBackupSet = this.state.rmanBackups.length + 1;
        const now = new Date();
        
        const backup = {
            backupSet: newBackupSet,
            type: backupType,
            level: level,
            size: this.calculateBackupSize(backupType, level),
            deviceType: 'DISK',
            elapsedTime: this.generateElapsedTime(),
            completionTime: now.toLocaleDateString(),
            status: 'AVAILABLE',
            compressed: compressed,
            tag: 'TAG' + Date.now(),
            pieceName: `/u01/app/oracle/recovery_area/ORCL/backupset/backup_ORCL_set${newBackupSet}.bkp`,
            datafiles: [
                {file: 1, type: backupType, ckpSCN: 2194304 + (newBackupSet * 1000), ckpTime: now.toLocaleDateString(), name: '/u01/app/oracle/oradata/ORCL/system01.dbf'},
                {file: 3, type: backupType, ckpSCN: 2194304 + (newBackupSet * 1000), ckpTime: now.toLocaleDateString(), name: '/u01/app/oracle/oradata/ORCL/sysaux01.dbf'},
                {file: 4, type: backupType, ckpSCN: 2194304 + (newBackupSet * 1000), ckpTime: now.toLocaleDateString(), name: '/u01/app/oracle/oradata/ORCL/undotbs01.dbf'},
                {file: 7, type: backupType, ckpSCN: 2194304 + (newBackupSet * 1000), ckpTime: now.toLocaleDateString(), name: '/u01/app/oracle/oradata/ORCL/users01.dbf'}
            ]
        };
        
        this.state.rmanBackups.push(backup);
        this.saveState();
        return backup;
    }
    
    getBackups() {
        return this.state.rmanBackups;
    }
    
    calculateBackupSize(backupType, level) {
        if (backupType === 'Full' || level === 0) {
            return (Math.random() * 500 + 500).toFixed(2) + 'M'; // 500-1000M
        } else if (level === 1) {
            return (Math.random() * 100 + 50).toFixed(2) + 'M'; // 50-150M
        }
        return (Math.random() * 200 + 100).toFixed(2) + 'M'; // 100-300M
    }
    
    generateElapsedTime() {
        const minutes = Math.floor(Math.random() * 5);
        const seconds = Math.floor(Math.random() * 60);
        return `00:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Create global Oracle manager instance
const oracleManager = new OracleManager();