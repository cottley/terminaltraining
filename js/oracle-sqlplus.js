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
    let currentUser = username || 'SYSTEM';
    
    // Override prompt
    this.getPrompt = () => 'SQL> ';
    
    // Override command processor for SQL mode
    this.processCommand = (input) => {
        const sqlCommand = input.trim().toUpperCase();
        const sqlLower = input.trim();
        
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
                
                // Check for PS app tablespaces
                if (this.fs.exists('/oradata/SDS_TABLE.dbf')) {
                    this.terminal.writeln('SDS_TABLE');
                }
                if (this.fs.exists('/oradata/SDS_INDEX.dbf')) {
                    this.terminal.writeln('SDS_INDEX');
                }
                if (this.fs.exists('/oradata/SDS_LOB.dbf')) {
                    this.terminal.writeln('SDS_LOB');
                }
                if (this.fs.exists('/oradata/SDS_SMALL_LOB.dbf')) {
                    this.terminal.writeln('SDS_SMALL_LOB');
                }
                if (this.fs.exists('/oradata/SDS_MEDIUM_LOB.dbf')) {
                    this.terminal.writeln('SDS_MEDIUM_LOB');
                }
                if (this.fs.exists('/oradata/SDS_LARGE_LOB.dbf')) {
                    this.terminal.writeln('SDS_LARGE_LOB');
                }
                
                this.terminal.writeln('');
                const count = 5 + 
                    (this.fs.exists('/oradata/SDS_TABLE.dbf') ? 1 : 0) +
                    (this.fs.exists('/oradata/SDS_INDEX.dbf') ? 1 : 0) +
                    (this.fs.exists('/oradata/SDS_LOB.dbf') ? 1 : 0) +
                    (this.fs.exists('/oradata/SDS_SMALL_LOB.dbf') ? 1 : 0) +
                    (this.fs.exists('/oradata/SDS_MEDIUM_LOB.dbf') ? 1 : 0) +
                    (this.fs.exists('/oradata/SDS_LARGE_LOB.dbf') ? 1 : 0);
                this.terminal.writeln(`${count} rows selected.`);
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
                
                // Check if SDE user exists
                if (oracleManager.getState('sdeUserCreated')) {
                    this.terminal.writeln('SDE');
                }
                
                this.terminal.writeln('');
                const count = 27 + (oracleManager.getState('sdeUserCreated') ? 1 : 0);
                this.terminal.writeln(`${count} rows selected.`);
                this.terminal.writeln('');
            }
            return;
        }
        
        // Handle PS app specific tablespace creation
        if (sqlCommand.startsWith('CREATE TABLESPACE')) {
            this.handleCreateTablespace(sqlLower);
            return;
        }
        
        // Handle user creation
        if (sqlCommand.startsWith('CREATE USER')) {
            this.handleCreateUser(sqlLower);
            return;
        }
        
        // Handle library creation for spatial
        if (sqlCommand.includes('CREATE OR REPLACE LIBRARY')) {
            this.handleCreateLibrary(sqlLower, currentUser);
            return;
        }
        
        // Handle spatial queries
        if (sqlCommand.includes('SELECT FILE_SPEC FROM USER_LIBRARIES')) {
            this.handleUserLibrariesQuery(currentUser);
            return;
        }
        
        if (sqlCommand.includes('ST_POINTFROMTEXT')) {
            this.handleSpatialQuery(currentUser);
            return;
        }
        
        // Connect as different user
        if (sqlCommand.startsWith('CONNECT')) {
            const parts = sqlLower.split(/\s+/);
            if (parts.length > 1) {
                const userInfo = parts[1].split('/')[0];
                currentUser = userInfo.toUpperCase();
                this.terminal.writeln('Connected.');
            }
            return;
        }
        
        // Default response for unrecognized commands
        if (sqlCommand) {
            this.terminal.writeln('SP2-0042: unknown command "' + input + '" - rest of line ignored.');
        }
    };
};