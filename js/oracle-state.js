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
                spatialLibraryCreated: false
            }
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
            default:
                return true;
        }
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
            localStorage.removeItem('fileSystemState');
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
            'Kernel Parameters Set': this.state.kernelParametersSet,
            'Resource Limits Configured': this.state.limitsConfigured,
            
            // Installation
            'Oracle Software Installed': this.state.softwareInstalled,
            'Root Scripts Executed': this.state.rootScriptsRun,
            'Oracle Environment Set': this.state.oracleEnvironmentSet,
            
            // Database & Network
            'Database Created': this.state.databaseCreated,
            'Listener Configured': this.state.listenerConfigured,
            'Database Started': this.state.databaseStarted,
            'Listener Started': this.state.listenerStarted
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
                hint: 'Create Oracle installation groups (oinstall, dba, etc.)',
                commands: [
                    'groupadd -g 54321 oinstall',
                    'groupadd -g 54322 dba',
                    'groupadd -g 54323 oper',
                    'groupadd -g 54324 backupdba',
                    'groupadd -g 54325 dgdba',
                    'groupadd -g 54326 kmdba',
                    'groupadd -g 54327 racdba'
                ]
            },
            'Oracle User Created': {
                hint: 'Create the oracle user with appropriate groups',
                commands: [
                    'useradd -u 54321 -g oinstall -G dba,oper,backupdba,dgdba,kmdba,racdba oracle',
                    'passwd oracle'
                ]
            },
            'Required Packages Installed': {
                hint: 'Install all required packages for Oracle 19c',
                commands: [
                    'yum install -y binutils gcc gcc-c++ glibc glibc-devel ksh libaio libaio-devel',
                    'yum install -y libgcc libstdc++ libstdc++-devel libxcb libX11 libXau libXi',
                    'yum install -y libXtst libXrender libXrender-devel make net-tools nfs-utils',
                    'yum install -y smartmontools sysstat unixODBC unixODBC-devel'
                ]
            },
            'Kernel Parameters Set': {
                hint: 'Configure kernel parameters for Oracle',
                commands: [
                    'vim /etc/sysctl.conf',
                    '# Add the Oracle parameters (see oracle-help)',
                    'sysctl -p'
                ]
            },
            'Resource Limits Configured': {
                hint: 'Configure resource limits for the oracle user',
                commands: [
                    'vim /etc/security/limits.conf',
                    '# Add the Oracle limits (see oracle-help)'
                ]
            },
            'Oracle Software Installed': {
                hint: 'Extract and install Oracle software',
                commands: [
                    'su - oracle',
                    'cd /u01/app/oracle/product/19.0.0/dbhome_1',
                    'unzip /install/LINUX.X64_193000_db_home.zip',
                    './runInstaller'
                ]
            },
            'Root Scripts Executed': {
                hint: 'Run the post-installation root scripts',
                commands: [
                    '/u01/app/oraInventory/orainstRoot.sh',
                    '/u01/app/oracle/product/19.0.0/dbhome_1/root.sh'
                ]
            },
            'Oracle Environment Set': {
                hint: 'Set Oracle environment variables',
                commands: [
                    'su - oracle',
                    '. oraenv',
                    '# Or add to .bash_profile'
                ]
            },
            'Database Created': {
                hint: 'Create the Oracle database using DBCA',
                commands: [
                    'su - oracle',
                    'dbca'
                ]
            },
            'Listener Configured': {
                hint: 'Configure the Oracle listener',
                commands: [
                    'su - oracle',
                    'netca'
                ]
            },
            'Database Started': {
                hint: 'Start the Oracle database',
                commands: [
                    'su - oracle',
                    'sqlplus / as sysdba',
                    'SQL> startup'
                ]
            },
            'Listener Started': {
                hint: 'Start the Oracle listener',
                commands: [
                    'su - oracle',
                    'lsnrctl start'
                ]
            },
            'Oradata Partition Created': {
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
                    '# Add: SET EXTPROC_DLLS=/u01/arcgis/server/DatabaseSupport/Oracle/Linux64/libst_shapelib.so',
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
                    'CREATE OR REPLACE LIBRARY SDE.ST_SHAPELIB IS \'/u01/arcgis/server/DatabaseSupport/Oracle/Linux64/libst_shapelib.so\';'
                ]
            }
        };
        
        return hints[taskName] || { hint: 'Unknown task', commands: [] };
    }
}

// Create global Oracle manager instance
const oracleManager = new OracleManager();