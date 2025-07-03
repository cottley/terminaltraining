// Oracle Utility Commands

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
            if (oracleManager.getState('databaseCreated')) {
                this.terminal.writeln('diag/rdbms/orcl/ORCL');
            }
            if (oracleManager.getState('listenerConfigured')) {
                this.terminal.writeln('diag/tnslsnr/proddb01sim/listener');
            }
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
                this.terminal.writeln('Output the results to file: /tmp/alert_' + Date.now() + '.txt');
                this.terminal.writeln('');
                const currentDate = new Date().toISOString();
                this.terminal.writeln(currentDate);
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
                this.terminal.writeln('VM name:        VMWare Version: 6');
                this.terminal.writeln('Using parameter settings in server-side spfile /u01/app/oracle/product/19.0.0/dbhome_1/dbs/spfileORCL.ora');
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
                this.terminal.writeln('  local_listener           = "LISTENER_ORCL"');
                this.terminal.writeln('  audit_file_dest          = "/u01/app/oracle/admin/ORCL/adump"');
                this.terminal.writeln('  audit_trail              = "DB"');
                this.terminal.writeln('  db_name                  = "ORCL"');
                this.terminal.writeln('  open_cursors             = 300');
                this.terminal.writeln('  diagnostic_dest          = "/u01/app/oracle"');
                this.terminal.writeln('  enable_pluggable_database= TRUE');
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
        
        this.terminal.writeln('connected to target database: ORCL (DBID=1591408664)');
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
        const rmanInput = input.trim();
        
        // Add RMAN command to RMAN history if it's not empty
        if (rmanInput) {
            // Don't add duplicate commands
            if (this.rmanHistory.length === 0 || this.rmanHistory[this.rmanHistory.length - 1] !== rmanInput) {
                this.rmanHistory.push(rmanInput);
                this.saveRmanHistory();
            }
            this.rmanHistoryIndex = this.rmanHistory.length;
        }
        
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
            this.terminal.writeln('CONFIGURE SNAPSHOT CONTROLFILE NAME TO \'/u01/app/oracle/product/19.0.0/dbhome_1/dbs/snapcf_ORCL.f\'; # default');
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
                this.terminal.writeln('piece handle=/u01/app/oracle/recovery_area/ORCL/backupset/' + new Date().toISOString().replace(/[:.]/g, '') + '_TAG.bkp tag=TAG' + Date.now() + ' comment=NONE');
                this.terminal.writeln('channel ORA_DISK_1: backup set complete, elapsed time: 00:00:25');
                this.terminal.writeln('Finished backup at ' + new Date().toLocaleString());
                this.terminal.writeln('');
                this.terminal.writeln('Starting Control File and SPFILE Autobackup at ' + new Date().toLocaleString());
                this.terminal.writeln('piece handle=/u01/app/oracle/recovery_area/ORCL/autobackup/' + new Date().toISOString().replace(/[:.]/g, '') + '_cf.bkp comment=NONE');
                this.terminal.writeln('Finished Control File and SPFILE Autobackup at ' + new Date().toLocaleString());
                this.terminal.writeln('');
            }
            return;
        }
        
        // Incremental backup commands
        if (rmanCommand.includes('BACKUP INCREMENTAL')) {
            const level = rmanCommand.includes('LEVEL 0') ? '0' : '1';
            this.terminal.writeln('');
            this.terminal.writeln(`Starting backup at ${new Date().toLocaleString()}`);
            this.terminal.writeln('using channel ORA_DISK_1');
            this.terminal.writeln(`channel ORA_DISK_1: starting incremental level ${level} datafile backup set`);
            this.terminal.writeln('channel ORA_DISK_1: specifying datafile(s) in backup set');
            this.terminal.writeln('input datafile file number=00001 name=/u01/app/oracle/oradata/ORCL/system01.dbf');
            this.terminal.writeln('input datafile file number=00003 name=/u01/app/oracle/oradata/ORCL/sysaux01.dbf');
            this.terminal.writeln('input datafile file number=00004 name=/u01/app/oracle/oradata/ORCL/undotbs01.dbf');
            this.terminal.writeln('input datafile file number=00007 name=/u01/app/oracle/oradata/ORCL/users01.dbf');
            this.terminal.writeln(`channel ORA_DISK_1: starting piece 1 at ${new Date().toLocaleString()}`);
            this.terminal.writeln(`channel ORA_DISK_1: finished piece 1 at ${new Date().toLocaleString()}`);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '');
            this.terminal.writeln(`piece handle=/u01/app/oracle/recovery_area/ORCL/backupset/${timestamp}_INCR${level}.bkp tag=INCR_LVL${level}_${Date.now()} comment=NONE`);
            this.terminal.writeln(`channel ORA_DISK_1: backup set complete, elapsed time: 00:00:15`);
            this.terminal.writeln(`Finished backup at ${new Date().toLocaleString()}`);
            this.terminal.writeln('');
            return;
        }
        
        // Compressed backup
        if (rmanCommand.includes('AS COMPRESSED BACKUPSET')) {
            this.terminal.writeln('');
            this.terminal.writeln(`Starting backup at ${new Date().toLocaleString()}`);
            this.terminal.writeln('using channel ORA_DISK_1');
            this.terminal.writeln('channel ORA_DISK_1: starting compressed full datafile backup set');
            this.terminal.writeln('channel ORA_DISK_1: specifying datafile(s) in backup set');
            this.terminal.writeln('input datafile file number=00001 name=/u01/app/oracle/oradata/ORCL/system01.dbf');
            this.terminal.writeln('input datafile file number=00003 name=/u01/app/oracle/oradata/ORCL/sysaux01.dbf');
            this.terminal.writeln('input datafile file number=00004 name=/u01/app/oracle/oradata/ORCL/undotbs01.dbf');
            this.terminal.writeln('input datafile file number=00007 name=/u01/app/oracle/oradata/ORCL/users01.dbf');
            this.terminal.writeln(`channel ORA_DISK_1: starting piece 1 at ${new Date().toLocaleString()}`);
            this.terminal.writeln(`channel ORA_DISK_1: finished piece 1 at ${new Date().toLocaleString()}`);
            const timestamp2 = new Date().toISOString().replace(/[:.]/g, '');
            this.terminal.writeln(`piece handle=/u01/app/oracle/recovery_area/ORCL/backupset/${timestamp2}_COMP.bkp tag=COMPRESSED_${Date.now()} comment=NONE`);
            this.terminal.writeln('channel ORA_DISK_1: backup set complete, elapsed time: 00:00:18');
            this.terminal.writeln('Finished backup at ' + new Date().toLocaleString());
            this.terminal.writeln('');
            return;
        }
        
        if (rmanCommand === 'LIST BACKUP' || rmanCommand === 'LIST BACKUP;') {
            this.terminal.writeln('');
            this.terminal.writeln('List of Backup Sets');
            this.terminal.writeln('===================');
            this.terminal.writeln('');
            this.terminal.writeln('BS Key  Type LV Size       Device Type Elapsed Time Completion Time');
            this.terminal.writeln('------- ---- -- ---------- ----------- ------------ ---------------');
            this.terminal.writeln('1       Full    800.00M    DISK        00:00:25     ' + new Date().toLocaleDateString());
            this.terminal.writeln('        BP Key: 1   Status: AVAILABLE  Compressed: NO  Tag: TAG' + Date.now());
            this.terminal.writeln('        Piece Name: /u01/app/oracle/recovery_area/ORCL/backupset/backup_ORCL_set1.bkp');
            this.terminal.writeln('  List of Datafiles in backup set 1');
            this.terminal.writeln('  File LV Type Ckp SCN    Ckp Time  Name');
            this.terminal.writeln('  ---- -- ---- ---------- --------- ----');
            this.terminal.writeln('  1       Full 2194304    ' + new Date().toLocaleDateString() + ' /u01/app/oracle/oradata/ORCL/system01.dbf');
            this.terminal.writeln('  3       Full 2194304    ' + new Date().toLocaleDateString() + ' /u01/app/oracle/oradata/ORCL/sysaux01.dbf');
            this.terminal.writeln('  4       Full 2194304    ' + new Date().toLocaleDateString() + ' /u01/app/oracle/oradata/ORCL/undotbs01.dbf');
            this.terminal.writeln('  7       Full 2194304    ' + new Date().toLocaleDateString() + ' /u01/app/oracle/oradata/ORCL/users01.dbf');
            this.terminal.writeln('');
            return;
        }
        
        // Validate commands
        if (rmanCommand.includes('VALIDATE')) {
            if (rmanCommand.includes('BACKUPSET')) {
                this.terminal.writeln('');
                this.terminal.writeln('Starting validate at ' + new Date().toLocaleString());
                this.terminal.writeln('using channel ORA_DISK_1');
                this.terminal.writeln('channel ORA_DISK_1: starting validation of backup set');
                this.terminal.writeln('channel ORA_DISK_1: reading from backup piece /u01/app/oracle/recovery_area/ORCL/backupset/backup_ORCL_set1.bkp');
                this.terminal.writeln('channel ORA_DISK_1: piece handle=/u01/app/oracle/recovery_area/ORCL/backupset/backup_ORCL_set1.bkp tag=TAG' + Date.now());
                this.terminal.writeln('channel ORA_DISK_1: restored backup piece 1');
                this.terminal.writeln('channel ORA_DISK_1: validation complete, elapsed time: 00:00:05');
                this.terminal.writeln('Finished validate at ' + new Date().toLocaleString());
                this.terminal.writeln('');
            } else if (rmanCommand.includes('DATABASE')) {
                this.terminal.writeln('');
                this.terminal.writeln('Starting validate at ' + new Date().toLocaleString());
                this.terminal.writeln('using channel ORA_DISK_1');
                this.terminal.writeln('channel ORA_DISK_1: starting validation of datafile');
                this.terminal.writeln('channel ORA_DISK_1: reading datafile=/u01/app/oracle/oradata/ORCL/system01.dbf');
                this.terminal.writeln('channel ORA_DISK_1: reading datafile=/u01/app/oracle/oradata/ORCL/sysaux01.dbf');
                this.terminal.writeln('channel ORA_DISK_1: reading datafile=/u01/app/oracle/oradata/ORCL/undotbs01.dbf');
                this.terminal.writeln('channel ORA_DISK_1: reading datafile=/u01/app/oracle/oradata/ORCL/users01.dbf');
                this.terminal.writeln('channel ORA_DISK_1: validation complete, elapsed time: 00:00:08');
                this.terminal.writeln('Finished validate at ' + new Date().toLocaleString());
                this.terminal.writeln('');
            }
            return;
        }
        
        // Restore commands
        if (rmanCommand.includes('RESTORE')) {
            if (rmanCommand.includes('DATABASE')) {
                this.terminal.writeln('');
                this.terminal.writeln('Starting restore at ' + new Date().toLocaleString());
                this.terminal.writeln('using channel ORA_DISK_1');
                this.terminal.writeln('channel ORA_DISK_1: starting datafile backup set restore');
                this.terminal.writeln('channel ORA_DISK_1: specifying datafile(s) to restore from backup set');
                this.terminal.writeln('channel ORA_DISK_1: restoring datafile 00001 to /u01/app/oracle/oradata/ORCL/system01.dbf');
                this.terminal.writeln('channel ORA_DISK_1: restoring datafile 00003 to /u01/app/oracle/oradata/ORCL/sysaux01.dbf');
                this.terminal.writeln('channel ORA_DISK_1: restoring datafile 00004 to /u01/app/oracle/oradata/ORCL/undotbs01.dbf');
                this.terminal.writeln('channel ORA_DISK_1: restoring datafile 00007 to /u01/app/oracle/oradata/ORCL/users01.dbf');
                this.terminal.writeln('channel ORA_DISK_1: reading from backup piece /u01/app/oracle/recovery_area/ORCL/backupset/backup_ORCL_set1.bkp');
                this.terminal.writeln('channel ORA_DISK_1: piece handle=/u01/app/oracle/recovery_area/ORCL/backupset/backup_ORCL_set1.bkp tag=TAG' + Date.now());
                this.terminal.writeln('channel ORA_DISK_1: restored backup piece 1');
                this.terminal.writeln('channel ORA_DISK_1: restore complete, elapsed time: 00:00:45');
                this.terminal.writeln('Finished restore at ' + new Date().toLocaleString());
                this.terminal.writeln('');
            }
            return;
        }
        
        // Recovery commands
        if (rmanCommand.includes('RECOVER DATABASE')) {
            this.terminal.writeln('');
            this.terminal.writeln('Starting recover at ' + new Date().toLocaleString());
            this.terminal.writeln('using channel ORA_DISK_1');
            this.terminal.writeln('starting media recovery');
            this.terminal.writeln('archived log for thread 1 with sequence 1 is already on disk as file /u01/app/oracle/recovery_area/ORCL/archivelog/archive_log_1.arc');
            this.terminal.writeln('archived log for thread 1 with sequence 2 is already on disk as file /u01/app/oracle/recovery_area/ORCL/archivelog/archive_log_2.arc');
            this.terminal.writeln('archived log file name=/u01/app/oracle/recovery_area/ORCL/archivelog/archive_log_1.arc thread=1 sequence=1');
            this.terminal.writeln('archived log file name=/u01/app/oracle/recovery_area/ORCL/archivelog/archive_log_2.arc thread=1 sequence=2');
            this.terminal.writeln('media recovery complete, elapsed time: 00:00:03');
            this.terminal.writeln('Finished recover at ' + new Date().toLocaleString());
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
    } else if (command === 'config' && object === 'database') {
        const dbName = args[3] || 'ORCL';
        if (oracleManager.getState('databaseCreated')) {
            this.terminal.writeln(`Database unique name: ${dbName}`);
            this.terminal.writeln(`Database name: ${dbName}`);
            this.terminal.writeln('Oracle home: /u01/app/oracle/product/19.0.0/dbhome_1');
            this.terminal.writeln('Oracle user: oracle');
            this.terminal.writeln('Spfile: /u01/app/oracle/product/19.0.0/dbhome_1/dbs/spfileORCL.ora');
            this.terminal.writeln('Password file: /u01/app/oracle/product/19.0.0/dbhome_1/dbs/orapwORCL');
            this.terminal.writeln('Domain:');
            this.terminal.writeln('Start options: open');
            this.terminal.writeln('Stop options: immediate');
            this.terminal.writeln('Database role: PRIMARY');
            this.terminal.writeln('Management policy: AUTOMATIC');
            this.terminal.writeln('Database instance: ORCL');
        } else {
            this.terminal.writeln(`Database ${dbName} does not exist.`);
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
    let force = false;
    
    // Parse arguments
    for (const arg of args) {
        if (arg.startsWith('file=')) {
            file = arg.substring(5);
        } else if (arg.startsWith('password=')) {
            password = arg.substring(9);
        } else if (arg.startsWith('entries=')) {
            entries = arg.substring(8);
        } else if (arg.startsWith('force=')) {
            force = arg.substring(6).toLowerCase() === 'y';
        }
    }
    
    if (!file || !password) {
        this.terminal.writeln('');
        this.terminal.writeln('Usage: orapwd file=<fname> password=<password> entries=<users> force=<y/n>');
        this.terminal.writeln('');
        this.terminal.writeln('  file - name of password file (required)');
        this.terminal.writeln('  password - password for SYS (required)');
        this.terminal.writeln('  entries - maximum number of distinct DBAs (optional)');
        this.terminal.writeln('  force - whether to overwrite existing file (optional)');
        return;
    }
    
    // Check if file exists and force is not set
    if (this.fs.exists(file) && !force) {
        this.terminal.writeln('');
        this.terminal.writeln('OPW-00005: File with same name exists - please delete or use FORCE option');
        return;
    }
    
    this.terminal.writeln('');
    this.terminal.writeln('Enter password for SYS: ');
    this.fs.touch(file, 'Oracle Password File');
    
    // Set file permissions to be restrictive
    const filePath = this.fs.resolvePath(file);
    const fileNode = this.fs.getNode(filePath);
    if (fileNode) {
        fileNode.permissions = '-rw-------';
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
        this.terminal.writeln('UDE-01034: operation generated ORACLE error 1034');
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
    this.terminal.writeln('Starting "SYSTEM"."SYS_EXPORT_SCHEMA_01":  system/********');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/TABLE_DATA');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/INDEX/STATISTICS/INDEX_STATISTICS');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/STATISTICS/TABLE_STATISTICS');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/TABLE');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/COMMENT');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/INDEX/INDEX');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/CONSTRAINT/CONSTRAINT');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/CONSTRAINT/REF_CONSTRAINT');
    this.terminal.writeln('Master table "SYSTEM"."SYS_EXPORT_SCHEMA_01" successfully loaded/unloaded');
    this.terminal.writeln('******************************************************************************');
    this.terminal.writeln('Dump file set for SYSTEM.SYS_EXPORT_SCHEMA_01 is:');
    this.terminal.writeln('  /u01/app/oracle/admin/ORCL/dpdump/expdat.dmp');
    this.terminal.writeln('Job "SYSTEM"."SYS_EXPORT_SCHEMA_01" successfully completed at ' + new Date().toLocaleString());
    this.terminal.writeln('');
    
    // Create the dump file
    this.fs.mkdir('/u01/app/oracle/admin/ORCL/dpdump');
    this.fs.touch('/u01/app/oracle/admin/ORCL/dpdump/expdat.dmp', 'Oracle Data Pump Export File');
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
        this.terminal.writeln('UDI-01034: operation generated ORACLE error 1034');
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
    this.terminal.writeln('Connected to: Oracle Database 19c Enterprise Edition Release 19.0.0.0.0 - Production');
    this.terminal.writeln('Master table "SYSTEM"."SYS_IMPORT_FULL_01" successfully loaded/unloaded');
    this.terminal.writeln('Starting "SYSTEM"."SYS_IMPORT_FULL_01":  system/********');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/TABLE');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/TABLE_DATA');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/INDEX/INDEX');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/CONSTRAINT/CONSTRAINT');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/INDEX/STATISTICS/INDEX_STATISTICS');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/COMMENT');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/CONSTRAINT/REF_CONSTRAINT');
    this.terminal.writeln('Processing object type SCHEMA_EXPORT/TABLE/STATISTICS/TABLE_STATISTICS');
    this.terminal.writeln('Job "SYSTEM"."SYS_IMPORT_FULL_01" successfully completed at ' + new Date().toLocaleString());
    this.terminal.writeln('');
};

// Oracle environment setup command
CommandProcessor.prototype.cmdOraenv = function(args) {
    if (!oracleManager.getState('softwareInstalled')) {
        this.terminal.writeln('-bash: oraenv: command not found');
        return;
    }
    
    this.terminal.writeln('ORACLE_SID = [' + (this.environmentVars.ORACLE_SID || 'oracle') + '] ? ORCL');
    this.terminal.writeln('The Oracle base has been set to /u01/app/oracle');
    
    // Set Oracle environment variables
    this.environmentVars.ORACLE_SID = 'ORCL';
    this.environmentVars.ORACLE_BASE = '/u01/app/oracle';
    this.environmentVars.ORACLE_HOME = '/u01/app/oracle/product/19.0.0/dbhome_1';
    this.environmentVars.PATH = this.environmentVars.ORACLE_HOME + '/bin:' + this.environmentVars.PATH;
    this.environmentVars.LD_LIBRARY_PATH = this.environmentVars.ORACLE_HOME + '/lib:' + (this.environmentVars.LD_LIBRARY_PATH || '');
    
    oracleManager.updateState('oracleEnvironmentSet', true);
};