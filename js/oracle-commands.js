                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('INSTANCE_NAME    STATUS');
                this.terminal.writeln('---------------- ------------');
                this.terminal.writeln('ORCL             OPEN');
                this.terminal.writeln('');
            }
            return;
        }
        
        if (sqlCommand.startsWith('SELECT * FROM V$VERSION')) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('BANNER');
                this.terminal.writeln('--------------------------------------------------------------------------------');
                this.terminal.writeln('Oracle Database 19c Enterprise Edition Release 19.0.0.0.0 - Production');
                this.terminal.writeln('');
            }
            return;
        }
        
        if (sqlCommand.startsWith('SHOW PDBS')) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('    CON_ID CON_NAME                       OPEN MODE  RESTRICTED');
                this.terminal.writeln('---------- ------------------------------ ---------- ----------');
                this.terminal.writeln('         2 PDB$SEED                       READ ONLY  NO');
                this.terminal.writeln('         3 ORCLPDB                        READ WRITE NO');
                this.terminal.writeln('');
            }
            return;
        }
        
        if (sqlCommand.startsWith('SELECT TABLESPACE_NAME FROM DBA_TABLESPACES')) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('TABLESPACE_NAME');
                this.terminal.writeln('------------------------------');
                this.terminal.writeln('SYSTEM');
                this.terminal.writeln('SYSAUX');
                this.terminal.writeln('UNDOTBS1');
                this.terminal.writeln('TEMP');
                this.terminal.writeln('USERS');
                this.terminal.writeln('');
                this.terminal.writeln('5 rows selected.');
                this.terminal.writeln('');
            }
            return;
        }
        
        if (sqlCommand.startsWith('SELECT USERNAME FROM DBA_USERS')) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('USERNAME');
                this.terminal.writeln('------------------------------');
                this.terminal.writeln('SYS');
                this.terminal.writeln('SYSTEM');
                this.terminal.writeln('DBSNMP');
                this.terminal.writeln('APPQOSSYS');
                this.terminal.writeln('DBSFWUSER');
                this.terminal.writeln('GGSYS');
                this.terminal.writeln('ANONYMOUS');
                this.terminal.writeln('CTXSYS');
                this.terminal.writeln('DVSYS');
                this.terminal.writeln('DVF');
                this.terminal.writeln('GSMADMIN_INTERNAL');
                this.terminal.writeln('MDSYS');
                this.terminal.writeln('OLAPSYS');
                this.terminal.writeln('ORDDATA');
                this.terminal.writeln('ORDPLUGINS');
                this.terminal.writeln('ORDSYS');
                this.terminal.writeln('OUTLN');
                this.terminal.writeln('REMOTE_SCHEDULER_AGENT');
                this.terminal.writeln('SI_INFORMTN_SCHEMA');
                this.terminal.writeln('SYS$UMF');
                this.terminal.writeln('SYSBACKUP');
                this.terminal.writeln('SYSDG');
                this.terminal.writeln('SYSKM');
                this.terminal.writeln('SYSRAC');
                this.terminal.writeln('WMSYS');
                this.terminal.writeln('XDB');
                this.terminal.writeln('XS$NULL');
                this.terminal.writeln('');
                this.terminal.writeln('27 rows selected.');
                this.terminal.writeln('');
            }
            return;
        }
        
        // Default response for unrecognized commands
        if (sqlCommand) {
            this.terminal.writeln('SP2-0042: unknown command "' + input + '" - rest of line ignored.');
        }
    };
};

// ADRCI (Automatic Diagnostic Repository Command Interpreter)
CommandProcessor.prototype.cmdAdrci = function(args) {
    if (!oracleManager.checkPrerequisites('software')) {
        this.terminal.writeln('-bash: adrci: command not found');
        return;
    }
    
    this.terminal.writeln('');
    this.terminal.writeln('ADRCI: Release 19.0.0.0.0 - Production on ' + new Date().toLocaleString());
    this.terminal.writeln('');
    this.terminal.writeln('Copyright (c) 1982, 2019, Oracle and/or its affiliates.  All rights reserved.');
    this.terminal.writeln('');
    this.terminal.writeln('ADR base = "/u01/app/oracle"');
    
    // Enter ADRCI mode
    this.enterAdrciMode();
};

// ADRCI Mode Handler
CommandProcessor.prototype.enterAdrciMode = function() {
    const originalPrompt = this.getPrompt;
    const originalProcess = this.processCommand;
    
    // Override prompt
    this.getPrompt = () => 'adrci> ';
    
    // Override command processor for ADRCI mode
    this.processCommand = (input) => {
        const adrciCommand = input.trim().toLowerCase();
        
        if (adrciCommand === 'exit' || adrciCommand === 'quit') {
            // Restore original command processor
            this.getPrompt = originalPrompt;
            this.processCommand = originalProcess;
            return;
        }
        
        if (adrciCommand === 'show homes' || adrciCommand === 'show home') {
            this.terminal.writeln('ADR Homes:');
            this.terminal.writeln('diag/rdbms/orcl/ORCL');
            this.terminal.writeln('diag/tnslsnr/proddb01sim/listener');
            return;
        }
        
        if (adrciCommand.startsWith('set home')) {
            this.terminal.writeln('');
            return;
        }
        
        if (adrciCommand === 'show alert') {
            if (!oracleManager.getState('databaseCreated')) {
                this.terminal.writeln('DIA-48216: No ADR homes are current');
            } else {
                this.terminal.writeln('Output the results to file: /tmp/alert_14523.txt');
                this.terminal.writeln('');
                this.terminal.writeln('2025-01-15 10:23:45.123');
                this.terminal.writeln('Starting ORACLE instance (normal)');
                this.terminal.writeln('LICENSE_MAX_SESSION = 0');
                this.terminal.writeln('LICENSE_SESSIONS_WARNING = 0');
                this.terminal.writeln('Picked latch-free SCN scheme 3');
                this.terminal.writeln('Using LOG_ARCHIVE_DEST_1 parameter default value');
                this.terminal.writeln('Autotune of undo retention is turned on.');
                this.terminal.writeln('IMODE=BR');
                this.terminal.writeln('ILAT =27');
                this.terminal.writeln('LICENSE_MAX_USERS = 0');
                this.terminal.writeln('SYS auditing is enabled');
                this.terminal.writeln('Starting up:');
                this.terminal.writeln('Oracle Database 19c Enterprise Edition Release 19.0.0.0.0 - Production');
                this.terminal.writeln('Version 19.3.0.0.0');
                this.terminal.writeln('ORACLE_HOME = /u01/app/oracle/product/19.0.0/dbhome_1');
                this.terminal.writeln('System name:    Linux');
                this.terminal.writeln('Node name:      proddb01sim');
                this.terminal.writeln('Release:        5.14.0-70.13.1.el9_0.x86_64');
                this.terminal.writeln('Version:        #1 SMP PREEMPT Thu Apr 14 12:42:38 EDT 2022');
                this.terminal.writeln('Machine:        x86_64');
                this.terminal.writeln('Using parameter settings in server-side spfile');
                this.terminal.writeln('System parameters with non-default values:');
                this.terminal.writeln('  processes                = 300');
                this.terminal.writeln('  memory_target            = 2G');
                this.terminal.writeln('  control_files            = "/u01/app/oracle/oradata/ORCL/control01.ctl"');
                this.terminal.writeln('  control_files            = "/u01/app/oracle/oradata/ORCL/control02.ctl"');
                this.terminal.writeln('  db_block_size            = 8192');
                this.terminal.writeln('  compatible               = "19.0.0"');
                this.terminal.writeln('  undo_tablespace          = "UNDOTBS1"');
                this.terminal.writeln('  remote_login_passwordfile= "EXCLUSIVE"');
                this.terminal.writeln('  db_domain                = ""');
                this.terminal.writeln('  dispatchers              = "(PROTOCOL=TCP) (SERVICE=ORCLXDB)"');
                this.terminal.writeln('  audit_file_dest          = "/u01/app/oracle/admin/ORCL/adump"');
                this.terminal.writeln('  audit_trail              = "DB"');
                this.terminal.writeln('  db_name                  = "ORCL"');
                this.terminal.writeln('  open_cursors             = 300');
                this.terminal.writeln('  diagnostic_dest          = "/u01/app/oracle"');
                this.terminal.writeln('');
            }
            return;
        }
        
        if (adrciCommand === 'help') {
            this.terminal.writeln('');
            this.terminal.writeln(' HELP [topic]');
            this.terminal.writeln('   Available Topics:');
            this.terminal.writeln('        SHOW');
            this.terminal.writeln('        SET');
            this.terminal.writeln('        EXIT');
            this.terminal.writeln('        SHOW ALERT');
            this.terminal.writeln('        SHOW HOMES');
            this.terminal.writeln('');
            return;
        }
        
        // Default response
        if (adrciCommand) {
            this.terminal.writeln('DIA-48448: Unknown command [' + input + ']');
        }
    };
};

// RMAN (Recovery Manager)
CommandProcessor.prototype.cmdRman = function(args) {
    if (!oracleManager.checkPrerequisites('software')) {
        this.terminal.writeln('-bash: rman: command not found');
        return;
    }
    
    let targetDb = '';
    for (let i = 0; i < args.length; i++) {
        if (args[i].toLowerCase() === 'target' && i + 1 < args.length) {
            targetDb = args[i + 1];
            break;
        }
    }
    
    this.terminal.writeln('');
    this.terminal.writeln('Recovery Manager: Release 19.0.0.0.0 - Production on ' + new Date().toLocaleString());
    this.terminal.writeln('Version 19.3.0.0.0');
    this.terminal.writeln('');
    this.terminal.writeln('Copyright (c) 1982, 2019, Oracle and/or its affiliates.  All rights reserved.');
    this.terminal.writeln('');
    
    if (targetDb === '/') {
        if (!oracleManager.getState('databaseStarted')) {
            this.terminal.writeln('RMAN-00571: ===========================================================');
            this.terminal.writeln('RMAN-00569: =============== ERROR MESSAGE STACK FOLLOWS ===============');
            this.terminal.writeln('RMAN-00571: ===========================================================');
            this.terminal.writeln('RMAN-00554: initialization of internal recovery manager package failed');
            this.terminal.writeln('RMAN-04005: error from target database:');
            this.terminal.writeln('ORA-01034: ORACLE not available');
            this.terminal.writeln('ORA-27101: shared memory realm does not exist');
            return;
        }
        
        this.terminal.writeln('connected to target database: ORCL (DBID=1234567890)');
    }
    
    // Enter RMAN mode
    this.enterRmanMode();
};

// RMAN Mode Handler
CommandProcessor.prototype.enterRmanMode = function() {
    const originalPrompt = this.getPrompt;
    const originalProcess = this.processCommand;
    
    // Override prompt
    this.getPrompt = () => 'RMAN> ';
    
    // Override command processor for RMAN mode
    this.processCommand = (input) => {
        const rmanCommand = input.trim().toUpperCase();
        
        if (rmanCommand === 'EXIT' || rmanCommand === 'QUIT') {
            // Restore original command processor
            this.getPrompt = originalPrompt;
            this.processCommand = originalProcess;
            this.terminal.writeln('');
            this.terminal.writeln('Recovery Manager complete.');
            return;
        }
        
        if (rmanCommand === 'SHOW ALL' || rmanCommand === 'SHOW ALL;') {
            this.terminal.writeln('');
            this.terminal.writeln('RMAN configuration parameters for database with db_unique_name ORCL are:');
            this.terminal.writeln('CONFIGURE RETENTION POLICY TO REDUNDANCY 1; # default');
            this.terminal.writeln('CONFIGURE BACKUP OPTIMIZATION OFF; # default');
            this.terminal.writeln('CONFIGURE DEFAULT DEVICE TYPE TO DISK; # default');
            this.terminal.writeln('CONFIGURE CONTROLFILE AUTOBACKUP OFF; # default');
            this.terminal.writeln('CONFIGURE CONTROLFILE AUTOBACKUP FORMAT FOR DEVICE TYPE DISK TO \'%F\'; # default');
            this.terminal.writeln('CONFIGURE DEVICE TYPE DISK PARALLELISM 1 BACKUP TYPE TO BACKUPSET; # default');
            this.terminal.writeln('CONFIGURE DATAFILE BACKUP COPIES FOR DEVICE TYPE DISK TO 1; # default');
            this.terminal.writeln('CONFIGURE ARCHIVELOG BACKUP COPIES FOR DEVICE TYPE DISK TO 1; # default');
            this.terminal.writeln('CONFIGURE MAXSETSIZE TO UNLIMITED; # default');
            this.terminal.writeln('CONFIGURE ENCRYPTION FOR DATABASE OFF; # default');
            this.terminal.writeln('CONFIGURE ENCRYPTION ALGORITHM \'AES128\'; # default');
            this.terminal.writeln('CONFIGURE COMPRESSION ALGORITHM \'BASIC\' AS OF RELEASE \'DEFAULT\' OPTIMIZE FOR LOAD TRUE ; # default');
            this.terminal.writeln('CONFIGURE RMAN OUTPUT TO KEEP FOR 7 DAYS; # default');
            this.terminal.writeln('CONFIGURE ARCHIVELOG DELETION POLICY TO NONE; # default');
            this.terminal.writeln('');
            return;
        }
        
        if (rmanCommand.startsWith('BACKUP DATABASE')) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('');
                this.terminal.writeln('RMAN-00571: ===========================================================');
                this.terminal.writeln('RMAN-00569: =============== ERROR MESSAGE STACK FOLLOWS ===============');
                this.terminal.writeln('RMAN-00571: ===========================================================');
                this.terminal.writeln('RMAN-03002: failure of backup command');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('Starting backup at ' + new Date().toLocaleString());
                this.terminal.writeln('using channel ORA_DISK_1');
                this.terminal.writeln('channel ORA_DISK_1: starting full datafile backup set');
                this.terminal.writeln('channel ORA_DISK_1: specifying datafile(s) in backup set');
                this.terminal.writeln('input datafile file number=00001 name=/u01/app/oracle/oradata/ORCL/system01.dbf');
                this.terminal.writeln('input datafile file number=00003 name=/u01/app/oracle/oradata/ORCL/sysaux01.dbf');
                this.terminal.writeln('input datafile file number=00004 name=/u01/app/oracle/oradata/ORCL/undotbs01.dbf');
                this.terminal.writeln('input datafile file number=00007 name=/u01/app/oracle/oradata/ORCL/users01.dbf');
                this.terminal.writeln('channel ORA_DISK_1: starting piece 1 at ' + new Date().toLocaleString());
                this.terminal.writeln('channel ORA_DISK_1: finished piece 1 at ' + new Date().toLocaleString());
                this.terminal.writeln('piece handle=/u01/app/oracle/recovery_area/ORCL/backupset/o1_mf_nnndf_TAG' + Date.now() + '_.bkp tag=TAG' + Date.now() + ' comment=NONE');
                this.terminal.writeln('channel ORA_DISK_1: backup set complete, elapsed time: 00:00:25');
                this.terminal.writeln('Finished backup at ' + new Date().toLocaleString());
                this.terminal.writeln('');
                this.terminal.writeln('Starting Control File and SPFILE Autobackup at ' + new Date().toLocaleString());
                this.terminal.writeln('piece handle=/u01/app/oracle/recovery_area/ORCL/autobackup/o1_mf_s_' + Date.now() + '_.bkp comment=NONE');
                this.terminal.writeln('Finished Control File and SPFILE Autobackup at ' + new Date().toLocaleString());
                this.terminal.writeln('');
            }
            return;
        }
        
        if (rmanCommand === 'LIST BACKUP' || rmanCommand === 'LIST BACKUP;') {
            this.terminal.writeln('');
            this.terminal.writeln('specification does not match any backup in the repository');
            this.terminal.writeln('');
            return;
        }
        
        // Default response
        if (rmanCommand) {
            this.terminal.writeln('RMAN-00558: error encountered while parsing input commands');
            this.terminal.writeln('RMAN-01009: syntax error: found "' + input.split(' ')[0].toLowerCase() + '": expecting one of: "ADVISE, ALLOCATE, ALTER, BACKUP, CATALOG, CHANGE, CONFIGURE, CONNECT, CONVERT, CREATE, CROSSCHECK, DELETE, DESCRIBE, DROP, DUPLICATE, EXECUTE, EXIT, FLASHBACK, GRANT, HOST, IMPORT, LIST, MOUNT, OPEN, PRINT, QUIT, RECOVER, REGISTER, RELEASE, REPAIR, REPLACE, REPORT, RESET, RESTORE, RESYNC, REVOKE, RUN, SEND, SET, SHOW, SHUTDOWN, SPOOL, SQL, STARTUP, SWITCH, TRANSPORT, UNREGISTER, UPGRADE, VALIDATE, {"');
        }
    };
};

// Add Oracle commands to the main command processor
CommandProcessor.prototype.processOracleCommand = function(command, args) {
    switch (command) {
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
        case 'lsnrctl':
            this.cmdLsnrctl(args);
            return true;
        case 'sqlplus':
            this.cmdSqlplus(args);
            return true;
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
        case 'tnsping':
            this.cmdTnsping(args);
            return true;
        case 'expdp':
            this.cmdExpdp(args);
            return true;
        case 'impdp':
            this.cmdImpdp(args);
            return true;
        default:
            return false;
    }
};

// SRVCTL (Server Control Utility)
CommandProcessor.prototype.cmdSrvctl = function(args) {
    if (!oracleManager.checkPrerequisites('software')) {
        this.terminal.writeln('-bash: srvctl: command not found');
        return;
    }
    
    if (args.length === 0) {
        this.terminal.writeln('Usage: srvctl <command> <object> [<options>]');
        this.terminal.writeln('    commands: start|stop|status|config|add|remove|modify|enable|disable');
        this.terminal.writeln('    objects: database|listener|service');
        return;
    }
    
    const command = args[0];
    const object = args[1];
    
    if (command === 'status' && object === 'database') {
        const dbName = args[3] || 'ORCL';
        if (!oracleManager.getState('databaseCreated')) {
            this.terminal.writeln(`Database ${dbName} does not exist.`);
        } else if (oracleManager.getState('databaseStarted')) {
            this.terminal.writeln(`Database is running.`);
        } else {
            this.terminal.writeln(`Database is not running.`);
        }
    } else if (command === 'status' && object === 'listener') {
        if (oracleManager.getState('listenerStarted')) {
            this.terminal.writeln('Listener LISTENER is enabled');
            this.terminal.writeln('Listener LISTENER is running on node(s): proddb01sim');
        } else {
            this.terminal.writeln('Listener LISTENER is enabled');
            this.terminal.writeln('Listener LISTENER is not running');
        }
    }
};

// ORAPWD (Oracle Password File Utility)
CommandProcessor.prototype.cmdOrapwd = function(args) {
    if (!oracleManager.checkPrerequisites('software')) {
        this.terminal.writeln('-bash: orapwd: command not found');
        return;
    }
    
    let file = '';
    let password = '';
    let entries = 5;
    
    // Parse arguments
    for (const arg of args) {
        if (arg.startsWith('file=')) {
            file = arg.substring(5);
        } else if (arg.startsWith('password=')) {
            password = arg.substring(9);
        } else if (arg.startsWith('entries=')) {
            entries = arg.substring(8);
        }
    }
    
    if (!file || !password) {
        this.terminal.writeln('');
        this.terminal.writeln('Usage: orapwd file=<fname> password=<password> entries=<users>');
        this.terminal.writeln('');
        this.terminal.writeln('  file - name of password file (required)');
        this.terminal.writeln('  password - password for SYS (required)');
        this.terminal.writeln('  entries - maximum number of distinct DBA (optional)');
        return;
    }
    
    this.terminal.writeln('');
    this.terminal.writeln('Enter password for SYS: ');
    this.fs.touch(file, 'Oracle Password File');
    this.terminal.writeln('');
};

// TNSPING
CommandProcessor.prototype.cmdTnsping = function(args) {
    if (!oracleManager.checkPrerequisites('software')) {
        this.terminal.writeln('-bash: tnsping: command not found');
        return;
    }
    
    if (args.length === 0) {
        this.terminal.writeln('');
        this.terminal.writeln('TNS Ping Utility for Linux: Version 19.0.0.0.0 - Production');
        this.terminal.writeln('');
        this.terminal.writeln('Usage: tnsping <address>');
        return;
    }
    
    const target = args[0];
    
    this.terminal.writeln('');
    this.terminal.writeln('TNS Ping Utility for Linux: Version 19.0.0.0.0 - Production on ' + new Date().toLocaleString());
    this.terminal.writeln('');
    this.terminal.writeln('Copyright (c) 1997, 2019, Oracle.  All rights reserved.');
    this.terminal.writeln('');
    this.terminal.writeln('Used parameter files:');
    this.terminal.writeln('/u01/app/oracle/product/19.0.0/dbhome_1/network/admin/sqlnet.ora');
    this.terminal.writeln('');
    
    if (!oracleManager.getState('listenerStarted')) {
        this.terminal.writeln('Used HOSTNAME adapter to resolve the alias');
        this.terminal.writeln(`Attempting to contact (DESCRIPTION=(CONNECT_DATA=(SERVICE_NAME=))(ADDRESS=(PROTOCOL=tcp)(HOST=${target})(PORT=1521)))`);
        this.terminal.writeln('TNS-12541: TNS:no listener');
    } else {
        this.terminal.writeln('Used HOSTNAME adapter to resolve the alias');
        this.terminal.writeln(`Attempting to contact (DESCRIPTION=(CONNECT_DATA=(SERVICE_NAME=))(ADDRESS=(PROTOCOL=tcp)(HOST=${target})(PORT=1521)))`);
        this.terminal.writeln('OK (10 msec)');
    }
};

// Data Pump Export
CommandProcessor.prototype.cmdExpdp = function(args) {
    if (!oracleManager.checkPrerequisites('database')) {
        this.terminal.writeln('-bash: expdp: command not found');
        return;
    }
    
    if (!oracleManager.getState('databaseStarted')) {
        this.terminal.writeln('');
        this.terminal.writeln('Export: Release 19.0.0.0.0 - Production');
        this.terminal.writeln('');
        this.terminal.writeln('Copyright (c) 1982, 2019, Oracle and/or its affiliates.  All rights reserved.');
        this.terminal.writeln('');
        this.terminal.writeln('UDE-01034: ORACLE error 1034 encountered');
        this.terminal.writeln('ORA-01034: ORACLE not available');
        this.terminal.writeln('ORA-27101: shared memory realm does not exist');
        return;
    }
    
    this.terminal.writeln('');
    this.terminal.writeln('Export: Release 19.0.0.0.0 - Production on ' + new Date().toLocaleString());
    this.terminal.writeln('Version 19.3.0.0.0');
    this.terminal.writeln('');
    this.terminal.writeln('Copyright (c) 1982, 2019, Oracle and/or its affiliates.  All rights reserved.');
    this.terminal.writeln('');
    this.terminal.writeln('Username: system');
    this.terminal.writeln('Password: ');
    this.terminal.writeln('');
    this.terminal.writeln('Connected to: Oracle Database 19c Enterprise Edition Release 19.0.0.0.0 - Production');
    this.terminal.writeln('Starting "SYSTEM"."SYS_EXPORT_SCHEMA_01":  system/******** ');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/TABLE_DATA');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/INDEX/STATISTICS/INDEX_STATISTICS');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/STATISTICS/TABLE_STATISTICS');
    this.terminal.writeln('Master table "SYSTEM"."SYS_EXPORT_SCHEMA_01" successfully loaded/unloaded');
    this.terminal.writeln('******************************************************************************');
    this.terminal.writeln('Dump file set for SYSTEM.SYS_EXPORT_SCHEMA_01 is:');
    this.terminal.writeln('  /u01/app/oracle/admin/ORCL/dpdump/expdat.dmp');
    this.terminal.writeln('Job "SYSTEM"."SYS_EXPORT_SCHEMA_01" successfully completed');
    this.terminal.writeln('');
};

// Data Pump Import
CommandProcessor.prototype.cmdImpdp = function(args) {
    if (!oracleManager.checkPrerequisites('database')) {
        this.terminal.writeln('-bash: impdp: command not found');
        return;
    }
    
    if (!oracleManager.getState('databaseStarted')) {
        this.terminal.writeln('');
        this.terminal.writeln('Import: Release 19.0.0.0.0 - Production');
        this.terminal.writeln('');
        this.terminal.writeln('Copyright (c) 1982, 2019, Oracle and/or its affiliates.  All rights reserved.');
        this.terminal.writeln('');
        this.terminal.writeln('UDI-01034: ORACLE error 1034 encountered');
        this.terminal.writeln('ORA-01034: ORACLE not available');
        this.terminal.writeln('ORA-27101: shared memory realm does not exist');
        return;
    }
    
    this.terminal.writeln('');
    this.terminal.writeln('Import: Release 19.0.0.0.0 - Production on ' + new Date().toLocaleString());
    this.terminal.writeln('Version 19.3.0.0.0');
    this.terminal.writeln('');
    this.terminal.writeln('Copyright (c) 1982, 2019, Oracle and/or its affiliates.  All rights reserved.');
    this.terminal.writeln('');
    this.terminal.writeln('Username: system');
    this.terminal.writeln('Password: ');
    this.terminal.writeln('');
    this.terminal.writ// Oracle Commands and State Management
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
            sessions: []
        };
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
            default:
                return true;
        }
    }

    updateState(key, value) {
        this.state[key] = value;
    }

    getState(key) {
        return this.state[key];
    }
}

// Create global Oracle manager instance
const oracleManager = new OracleManager();

// Extend CommandProcessor with Oracle commands
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
};

// Oracle Installer command
CommandProcessor.prototype.cmdRunInstaller = function(args) {
    // Check if running as oracle user
    if (this.fs.currentUser !== 'oracle') {
        this.terminal.writeln('Error: runInstaller must be run as oracle user');
        this.terminal.writeln('Please run: su - oracle');
        return;
    }
    
    // Check prerequisites
    if (!oracleManager.getState('oracleGroupsExist')) {
        this.terminal.writeln('Error: Oracle groups not found. Please create oinstall and dba groups first.');
        return;
    }
    
    if (!oracleManager.getState('kernelParametersSet')) {
        this.terminal.writeln('Warning: Kernel parameters may not be properly set.');
        this.terminal.writeln('Check /etc/sysctl.conf and run sysctl -p');
    }
    
    // Simulate installation process
    this.terminal.writeln('Starting Oracle Universal Installer...');
    this.terminal.writeln('');
    this.terminal.writeln('Checking swap space: must be greater than 150 MB. Actual 8192 MB    Passed');
    this.terminal.writeln('Checking monitor: must be configured to display at least 256 colors    Passed');
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
    this.terminal.writeln('Memory:');
    this.terminal.writeln('  Memory Management: Automatic Memory Management');
    this.terminal.writeln('  Memory Size: 2048 MB');
    this.terminal.writeln('');
    this.terminal.writeln('Creating and starting Oracle instance...');
    this.terminal.writeln('|||||||||||||||||||||| 32%');
    this.terminal.writeln('Creating database files...');
    this.terminal.writeln('|||||||||||||||||||||||||||||||| 55%');
    this.terminal.writeln('Creating data dictionary views...');
    this.terminal.writeln('|||||||||||||||||||||||||||||||||||||||| 75%');
    this.terminal.writeln('Running post-configuration steps...');
    this.terminal.writeln('|||||||||||||||||||||||||||||||||||||||||||||||||| 100%');
    this.terminal.writeln('');
    this.terminal.writeln('Database creation completed.');
    this.terminal.writeln('');
    this.terminal.writeln('Database Information:');
    this.terminal.writeln('Global Database Name: ORCL');
    this.terminal.writeln('System Identifier(SID): ORCL');
    
    // Update state
    oracleManager.updateState('databaseCreated', true);
    oracleManager.updateState('databaseName', 'ORCL');
    oracleManager.updateState('databaseStarted', true);
    
    // Create oratab entry
    this.fs.touch('/etc/oratab', 'ORCL:/u01/app/oracle/product/19.0.0/dbhome_1:N');
    
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
    this.terminal.writeln('Creating Listener...');
    this.terminal.writeln('|||||||||||||||||||||||||||||||||||||||||||||||||| 100%');
    this.terminal.writeln('');
    this.terminal.writeln('Listener configuration complete.');
    this.terminal.writeln('');
    this.terminal.writeln('Oracle Net Services configuration successful.');
    
    // Update state
    oracleManager.updateState('listenerConfigured', true);
    
    // Create listener.ora
    const listenerContent = `LISTENER =
  (DESCRIPTION_LIST =
    (DESCRIPTION =
      (ADDRESS = (PROTOCOL = TCP)(HOST = proddb01sim)(PORT = 1521))
      (ADDRESS = (PROTOCOL = IPC)(KEY = EXTPROC1521))
    )
  )`;
    
    this.fs.mkdir('/u01/app/oracle/product/19.0.0/dbhome_1/network');
    this.fs.mkdir('/u01/app/oracle/product/19.0.0/dbhome_1/network/admin');
    this.fs.touch('/u01/app/oracle/product/19.0.0/dbhome_1/network/admin/listener.ora', listenerContent);
};

// LSNRCTL (Listener Control)
CommandProcessor.prototype.cmdLsnrctl = function(args) {
    if (!oracleManager.checkPrerequisites('listener')) {
        this.terminal.writeln('Error: Listener not configured. Run netca first.');
        return;
    }
    
    const subcommand = args[0] || 'help';
    
    switch (subcommand) {
        case 'start':
            if (oracleManager.getState('listenerStarted')) {
                this.terminal.writeln('TNS-01106: Listener using listener name LISTENER has already been started');
            } else {
                this.terminal.writeln('Starting /u01/app/oracle/product/19.0.0/dbhome_1/bin/tnslsnr: please wait...');
                this.terminal.writeln('');
                this.terminal.writeln('TNSLSNR for Linux: Version 19.0.0.0.0 - Production');
                this.terminal.writeln('System parameter file is /u01/app/oracle/product/19.0.0/dbhome_1/network/admin/listener.ora');
                this.terminal.writeln('Log messages written to /u01/app/oracle/diag/tnslsnr/proddb01sim/listener/alert/log.xml');
                this.terminal.writeln('Listening on: (DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=proddb01sim)(PORT=1521)))');
                this.terminal.writeln('Listening on: (DESCRIPTION=(ADDRESS=(PROTOCOL=ipc)(KEY=EXTPROC1521)))');
                this.terminal.writeln('');
                this.terminal.writeln('Connecting to (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=proddb01sim)(PORT=1521)))');
                this.terminal.writeln('STATUS of the LISTENER');
                this.terminal.writeln('------------------------');
                this.terminal.writeln('Alias                     LISTENER');
                this.terminal.writeln('Version                   TNSLSNR for Linux: Version 19.0.0.0.0 - Production');
                this.terminal.writeln('Start Date                ' + new Date().toLocaleString());
                this.terminal.writeln('Uptime                    0 days 0 hr. 0 min. 0 sec');
                this.terminal.writeln('Trace Level               off');
                this.terminal.writeln('Security                  ON: Local OS Authentication');
                this.terminal.writeln('SNMP                      OFF');
                this.terminal.writeln('Listener Parameter File   /u01/app/oracle/product/19.0.0/dbhome_1/network/admin/listener.ora');
                this.terminal.writeln('Listener Log File         /u01/app/oracle/diag/tnslsnr/proddb01sim/listener/alert/log.xml');
                this.terminal.writeln('Listening Endpoints Summary...');
                this.terminal.writeln('  (DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=proddb01sim)(PORT=1521)))');
                this.terminal.writeln('  (DESCRIPTION=(ADDRESS=(PROTOCOL=ipc)(KEY=EXTPROC1521)))');
                this.terminal.writeln('The listener supports no services');
                this.terminal.writeln('The command completed successfully');
                
                oracleManager.updateState('listenerStarted', true);
            }
            break;
            
        case 'stop':
            if (!oracleManager.getState('listenerStarted')) {
                this.terminal.writeln('TNS-01190: The user is not authorized to execute the requested listener command');
            } else {
                this.terminal.writeln('Connecting to (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=proddb01sim)(PORT=1521)))');
                this.terminal.writeln('The command completed successfully');
                oracleManager.updateState('listenerStarted', false);
            }
            break;
            
        case 'status':
            if (!oracleManager.getState('listenerStarted')) {
                this.terminal.writeln('Connecting to (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=proddb01sim)(PORT=1521)))');
                this.terminal.writeln('TNS-12541: TNS:no listener');
                this.terminal.writeln(' TNS-12560: TNS:protocol adapter error');
                this.terminal.writeln('  TNS-00511: No listener');
                this.terminal.writeln('   Linux Error: 111: Connection refused');
            } else {
                this.terminal.writeln('Connecting to (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=proddb01sim)(PORT=1521)))');
                this.terminal.writeln('STATUS of the LISTENER');
                this.terminal.writeln('------------------------');
                this.terminal.writeln('Alias                     LISTENER');
                this.terminal.writeln('Version                   TNSLSNR for Linux: Version 19.0.0.0.0 - Production');
                this.terminal.writeln('Start Date                ' + new Date().toLocaleString());
                this.terminal.writeln('Uptime                    0 days 0 hr. 10 min. 0 sec');
                this.terminal.writeln('Trace Level               off');
                this.terminal.writeln('Security                  ON: Local OS Authentication');
                this.terminal.writeln('SNMP                      OFF');
                this.terminal.writeln('Listener Parameter File   /u01/app/oracle/product/19.0.0/dbhome_1/network/admin/listener.ora');
                this.terminal.writeln('Listener Log File         /u01/app/oracle/diag/tnslsnr/proddb01sim/listener/alert/log.xml');
                this.terminal.writeln('Listening Endpoints Summary...');
                this.terminal.writeln('  (DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=proddb01sim)(PORT=1521)))');
                this.terminal.writeln('  (DESCRIPTION=(ADDRESS=(PROTOCOL=ipc)(KEY=EXTPROC1521)))');
                if (oracleManager.getState('databaseStarted')) {
                    this.terminal.writeln('Services Summary...');
                    this.terminal.writeln('Service "ORCL" has 1 instance(s).');
                    this.terminal.writeln('  Instance "ORCL", status READY, has 1 handler(s) for this service...');
                    this.terminal.writeln('Service "ORCLXDB" has 1 instance(s).');
                    this.terminal.writeln('  Instance "ORCL", status READY, has 1 handler(s) for this service...');
                    this.terminal.writeln('Service "ORCLPDB" has 1 instance(s).');
                    this.terminal.writeln('  Instance "ORCL", status READY, has 1 handler(s) for this service...');
                } else {
                    this.terminal.writeln('The listener supports no services');
                }
                this.terminal.writeln('The command completed successfully');
            }
            break;
            
        case 'services':
            if (!oracleManager.getState('listenerStarted')) {
                this.terminal.writeln('Connecting to (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=proddb01sim)(PORT=1521)))');
                this.terminal.writeln('TNS-12541: TNS:no listener');
            } else if (oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('Connecting to (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=proddb01sim)(PORT=1521)))');
                this.terminal.writeln('Services Summary...');
                this.terminal.writeln('Service "ORCL" has 1 instance(s).');
                this.terminal.writeln('  Instance "ORCL", status READY, has 1 handler(s) for this service...');
                this.terminal.writeln('    Handler(s):');
                this.terminal.writeln('      "DEDICATED" established:0 refused:0 state:ready');
                this.terminal.writeln('         LOCAL SERVER');
                this.terminal.writeln('Service "ORCLXDB" has 1 instance(s).');
                this.terminal.writeln('  Instance "ORCL", status READY, has 1 handler(s) for this service...');
                this.terminal.writeln('    Handler(s):');
                this.terminal.writeln('      "D000" established:0 refused:0 current:0 max:1022 state:ready');
                this.terminal.writeln('         DISPATCHER <machine: proddb01sim, pid: 2451>');
                this.terminal.writeln('The command completed successfully');
            } else {
                this.terminal.writeln('Connecting to (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=proddb01sim)(PORT=1521)))');
                this.terminal.writeln('The listener supports no services');
                this.terminal.writeln('The command completed successfully');
            }
            break;
            
        default:
            this.terminal.writeln('LSNRCTL for Linux: Version 19.0.0.0.0 - Production');
            this.terminal.writeln('');
            this.terminal.writeln('Available commands:');
            this.terminal.writeln('  start    - Start the listener');
            this.terminal.writeln('  stop     - Stop the listener');
            this.terminal.writeln('  status   - Display listener status');
            this.terminal.writeln('  services - Display services information');
            this.terminal.writeln('');
            this.terminal.writeln('Usage: lsnrctl <command>');
    }
};

// SQL*Plus
CommandProcessor.prototype.cmdSqlplus = function(args) {
    if (!oracleManager.checkPrerequisites('software')) {
        this.terminal.writeln('-bash: sqlplus: command not found');
        return;
    }
    
    // Parse connection string
    let connectString = args.join(' ');
    let asSysdba = false;
    let username = '';
    let password = '';
    let database = '';
    
    if (connectString.includes('as sysdba')) {
        asSysdba = true;
        connectString = connectString.replace('as sysdba', '').trim();
    }
    
    if (connectString === '/' && asSysdba) {
        // OS authentication as SYSDBA
        username = 'SYS';
    } else if (connectString.includes('@')) {
        // Parse user@database
        const parts = connectString.split('@');
        const userPart = parts[0];
        database = parts[1];
        
        if (userPart.includes('/')) {
            [username, password] = userPart.split('/');
        } else {
            username = userPart;
        }
    } else if (connectString.includes('/')) {
        [username, password] = connectString.split('/');
    } else if (connectString) {
        username = connectString;
    }
    
    // Check if can connect
    if (!asSysdba && !oracleManager.getState('listenerStarted') && database) {
        this.terminal.writeln('');
        this.terminal.writeln('SQL*Plus: Release 19.0.0.0.0 - Production');
        this.terminal.writeln('');
        this.terminal.writeln('ERROR:');
        this.terminal.writeln('ORA-12541: TNS:no listener');
        this.terminal.writeln('');
        this.terminal.writeln('Enter user-name: ');
        return;
    }
    
    if (!oracleManager.getState('databaseStarted') && !asSysdba) {
        this.terminal.writeln('');
        this.terminal.writeln('SQL*Plus: Release 19.0.0.0.0 - Production');
        this.terminal.writeln('');
        this.terminal.writeln('ERROR:');
        this.terminal.writeln('ORA-01034: ORACLE not available');
        this.terminal.writeln('ORA-27101: shared memory realm does not exist');
        this.terminal.writeln('');
        return;
    }
    
    // Start SQL*Plus session
    this.terminal.writeln('');
    this.terminal.writeln('SQL*Plus: Release 19.0.0.0.0 - Production on ' + new Date().toLocaleString());
    this.terminal.writeln('Version 19.0.0.0.0');
    this.terminal.writeln('');
    this.terminal.writeln('Copyright (c) 1982, 2019, Oracle.  All rights reserved.');
    this.terminal.writeln('');
    
    if (asSysdba) {
        if (oracleManager.getState('databaseStarted')) {
            this.terminal.writeln('Connected to:');
            this.terminal.writeln('Oracle Database 19c Enterprise Edition Release 19.0.0.0.0 - Production');
            this.terminal.writeln('Version 19.3.0.0.0');
        } else {
            this.terminal.writeln('Connected to an idle instance.');
        }
    } else {
        this.terminal.writeln('Connected to:');
        this.terminal.writeln('Oracle Database 19c Enterprise Edition Release 19.0.0.0.0 - Production');
        this.terminal.writeln('Version 19.3.0.0.0');
    }
    
    this.terminal.writeln('');
    
    // Enter SQL prompt mode
    this.enterSqlMode(username, asSysdba);
};

// SQL Mode Handler
CommandProcessor.prototype.enterSqlMode = function(username, asSysdba) {
    const originalPrompt = this.getPrompt;
    const originalProcess = this.processCommand;
    
    // Override prompt
    this.getPrompt = () => 'SQL> ';
    
    // Override command processor for SQL mode
    this.processCommand = (input) => {
        const sqlCommand = input.trim().toUpperCase();
        
        // Handle SQL commands
        if (sqlCommand === 'EXIT' || sqlCommand === 'QUIT') {
            // Restore original command processor
            this.getPrompt = originalPrompt;
            this.processCommand = originalProcess;
            this.terminal.writeln('Disconnected from Oracle Database 19c Enterprise Edition Release 19.0.0.0.0 - Production');
            this.terminal.writeln('Version 19.3.0.0.0');
            return;
        }
        
        // Database startup/shutdown commands (SYSDBA only)
        if (asSysdba) {
            if (sqlCommand === 'STARTUP' || sqlCommand === 'STARTUP;') {
                if (oracleManager.getState('databaseStarted')) {
                    this.terminal.writeln('ORA-01081: cannot start already-running ORACLE - shut it down first');
                } else {
                    this.terminal.writeln('ORACLE instance started.');
                    this.terminal.writeln('');
                    this.terminal.writeln('Total System Global Area 2147479552 bytes');
                    this.terminal.writeln('Fixed Size                  8897536 bytes');
                    this.terminal.writeln('Variable Size             486539264 bytes');
                    this.terminal.writeln('Database Buffers         1644167168 bytes');
                    this.terminal.writeln('Redo Buffers                7876608 bytes');
                    this.terminal.writeln('Database mounted.');
                    this.terminal.writeln('Database opened.');
                    oracleManager.updateState('databaseStarted', true);
                }
                return;
            }
            
            if (sqlCommand === 'SHUTDOWN' || sqlCommand === 'SHUTDOWN;' || 
                sqlCommand === 'SHUTDOWN IMMEDIATE' || sqlCommand === 'SHUTDOWN IMMEDIATE;') {
                if (!oracleManager.getState('databaseStarted')) {
                    this.terminal.writeln('ORA-01034: ORACLE not available');
                } else {
                    this.terminal.writeln('Database closed.');
                    this.terminal.writeln('Database dismounted.');
                    this.terminal.writeln('ORACLE instance shut down.');
                    oracleManager.updateState('databaseStarted', false);
                }
                return;
            }
        }
        
        // Common SQL queries
        if (sqlCommand.startsWith('SELECT NAME, OPEN_MODE FROM V$DATABASE')) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('NAME      OPEN_MODE');
                this.terminal.writeln('--------- --------------------');
                this.terminal.writeln('ORCL      READ WRITE');
                this.terminal.writeln('');
            }
            return;
        }
        
        if (sqlCommand.startsWith('SELECT INSTANCE_NAME, STATUS FROM V$INSTANCE')) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this