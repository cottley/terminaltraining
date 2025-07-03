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
        
        // Handle username input after CONN/CONNECT command
        if (this.waitingForUsername) {
            this.waitingForUsername = false;
            this.getPrompt = () => 'SQL> ';  // Restore SQL prompt
            
            const userInput = input.trim();
            if (userInput === '') {
                this.terminal.writeln('ERROR:');
                this.terminal.writeln('ORA-01017: invalid username/password; logon denied');
                return;
            }
            
            // Process the username input as if it was "CONN <username>"
            const processedInput = 'CONN ' + userInput;
            const processedSqlCommand = processedInput.toUpperCase();
            
            // Handle the connection with the provided username
            let connectPart = processedSqlCommand.substring(5).trim();
            let connAsSysdba = false;
            let connString = connectPart;
            
            if (connString.includes('AS SYSDBA')) {
                connAsSysdba = true;
                connString = connString.replace('AS SYSDBA', '').trim();
            }
            
            if (connString === '/' && connAsSysdba) {
                // OS authentication as SYSDBA
                if (oracleManager.getState('databaseStarted')) {
                    this.terminal.writeln('Connected.');
                    currentUser = 'SYS';
                    asSysdba = true;
                } else {
                    this.terminal.writeln('Connected to an idle instance.');
                    currentUser = 'SYS';
                    asSysdba = true;
                }
            } else if (connString === '/') {
                // OS authentication as regular user
                if (!oracleManager.getState('databaseStarted')) {
                    this.terminal.writeln('ERROR:');
                    this.terminal.writeln('ORA-01034: ORACLE not available');
                } else {
                    this.terminal.writeln('Connected.');
                    currentUser = 'SYSTEM';
                    asSysdba = false;
                }
            } else {
                // Check if it's just a username without password
                if (!connString.includes('/') && !connString.includes('@')) {
                    // Just username provided, need to prompt for password
                    this.terminal.writeln('Enter password: ');
                    this.waitingForPassword = true;
                    this.pendingUsername = connString;
                    this.pendingAsSysdba = connAsSysdba;
                    this.getPrompt = () => '';  // No prompt while waiting for password
                    return;
                } else {
                    // Username/password connection strings - validate credentials
                    if (!oracleManager.getState('databaseStarted') && !connAsSysdba) {
                        this.terminal.writeln('ERROR:');
                        this.terminal.writeln('ORA-01034: ORACLE not available');
                    } else {
                        // Parse username/password
                        const userPart = connString.split('/');
                        if (userPart.length === 2) {
                            const username = userPart[0];
                            const password = userPart[1];
                            
                            // Authenticate user with password
                            const authResult = oracleManager.authenticateUser(username, password);
                            
                            if (!authResult.success) {
                                this.terminal.writeln('ERROR:');
                                this.terminal.writeln(authResult.error);
                            } else {
                                this.terminal.writeln('Connected.');
                                currentUser = authResult.username;
                                asSysdba = connAsSysdba || authResult.user.privileges.includes('SYSDBA');
                            }
                        } else {
                            // Default for malformed connection strings
                            this.terminal.writeln('Connected.');
                            if (connString.includes('SYS') || connAsSysdba) {
                                currentUser = 'SYS';
                                asSysdba = true;
                            } else {
                                currentUser = connString || 'SYSTEM';
                                asSysdba = connAsSysdba;
                            }
                        }
                    }
                }
            }
            return;
        }
        
        // Handle password input after username
        if (this.waitingForPassword) {
            this.waitingForPassword = false;
            this.getPrompt = () => 'SQL> ';  // Restore SQL prompt
            
            const password = input.trim();
            
            if (!oracleManager.getState('databaseStarted') && !this.pendingAsSysdba) {
                this.terminal.writeln('ERROR:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                // Authenticate user with password
                const authResult = oracleManager.authenticateUser(this.pendingUsername, password);
                
                if (!authResult.success) {
                    this.terminal.writeln('ERROR:');
                    this.terminal.writeln(authResult.error);
                } else {
                    this.terminal.writeln('Connected.');
                    currentUser = authResult.username;
                    asSysdba = this.pendingAsSysdba || authResult.user.privileges.includes('SYSDBA');
                }
            }
            
            // Clean up pending state
            this.pendingUsername = null;
            this.pendingAsSysdba = false;
            return;
        }
        
        // Handle SQL commands
        if (sqlCommand === 'EXIT' || sqlCommand === 'QUIT') {
            // Restore original command processor
            this.getPrompt = originalPrompt;
            this.processCommand = originalProcess;
            this.terminal.writeln('Disconnected from Oracle Database 19c Enterprise Edition Release 19.0.0.0.0 - Production');
            this.terminal.writeln('Version 19.3.0.0.0');
            return;
        }
        
        // Handle CONNECT/CONN command
        const isConnectCmd = sqlCommand.startsWith('CONNECT ') || 
                           sqlCommand.startsWith('CONN ') ||
                           sqlCommand === 'CONNECT' ||
                           sqlCommand === 'CONN';
        
        if (isConnectCmd) {
            let connectPart = '';
            if (sqlCommand.startsWith('CONNECT ')) {
                connectPart = sqlCommand.substring(8).trim();
            } else if (sqlCommand.startsWith('CONN ')) {
                connectPart = sqlCommand.substring(5).trim();
            } else if (sqlCommand === 'CONNECT' || sqlCommand === 'CONN') {
                // Just the command without arguments - should prompt for username
                this.terminal.writeln('Enter user-name: ');
                
                // Set up a waiting state for username input
                this.waitingForUsername = true;
                this.getPrompt = () => '';  // No prompt while waiting for username
                return;
            }
            
            let connAsSysdba = false;
            let connString = connectPart;
            
            if (connString.includes('AS SYSDBA')) {
                connAsSysdba = true;
                connString = connString.replace('AS SYSDBA', '').trim();
            }
            
            if (connString === '/' && connAsSysdba) {
                // OS authentication as SYSDBA
                if (oracleManager.getState('databaseStarted')) {
                    this.terminal.writeln('Connected.');
                    currentUser = 'SYS';
                    asSysdba = true;
                } else {
                    this.terminal.writeln('Connected to an idle instance.');
                    currentUser = 'SYS';
                    asSysdba = true;
                }
            } else if (connString === '/') {
                // OS authentication as regular user
                if (!oracleManager.getState('databaseStarted')) {
                    this.terminal.writeln('ERROR:');
                    this.terminal.writeln('ORA-01034: ORACLE not available');
                } else {
                    this.terminal.writeln('Connected.');
                    currentUser = 'SYSTEM';
                    asSysdba = false;
                }
            } else {
                // Check if it's just a username without password
                if (!connString.includes('/') && !connString.includes('@')) {
                    // Just username provided, need to prompt for password
                    this.terminal.writeln('Enter password: ');
                    this.waitingForPassword = true;
                    this.pendingUsername = connString;
                    this.pendingAsSysdba = connAsSysdba;
                    this.getPrompt = () => '';  // No prompt while waiting for password
                    return;
                } else {
                    // Username/password connection strings - validate credentials
                    if (!oracleManager.getState('databaseStarted') && !connAsSysdba) {
                        this.terminal.writeln('ERROR:');
                        this.terminal.writeln('ORA-01034: ORACLE not available');
                    } else {
                        // Parse username/password
                        const userPart = connString.split('/');
                        if (userPart.length === 2) {
                            const username = userPart[0];
                            const password = userPart[1];
                            
                            // Authenticate user with password
                            const authResult = oracleManager.authenticateUser(username, password);
                            
                            if (!authResult.success) {
                                this.terminal.writeln('ERROR:');
                                this.terminal.writeln(authResult.error);
                            } else {
                                this.terminal.writeln('Connected.');
                                currentUser = authResult.username;
                                asSysdba = connAsSysdba || authResult.user.privileges.includes('SYSDBA');
                            }
                        } else {
                            // Default for malformed connection strings
                            this.terminal.writeln('Connected.');
                            if (connString.includes('SYS') || connAsSysdba) {
                                currentUser = 'SYS';
                                asSysdba = true;
                            } else {
                                currentUser = connString || 'SYSTEM';
                                asSysdba = connAsSysdba;
                            }
                        }
                    }
                }
            }
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
        
        // V$ Performance Views
        if (sqlCommand.match(/SELECT.*FROM\s+V\$SGA/i)) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('NAME                      VALUE');
                this.terminal.writeln('-------------------- ----------');
                this.terminal.writeln('Fixed Size              8798312');
                this.terminal.writeln('Variable Size        1191182336');
                this.terminal.writeln('Database Buffers      838860800');
                this.terminal.writeln('Redo Buffers           16945152');
                this.terminal.writeln('');
                this.terminal.writeln('4 rows selected.');
            }
            return;
        }
        
        if (sqlCommand.match(/SELECT.*FROM\s+V\$PROCESS/i)) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('ADDR         PID SPID       PROGRAM');
                this.terminal.writeln('-------- ------- -------- ------------------------------');
                this.terminal.writeln('00000000      0          PSEUDO');
                this.terminal.writeln('7F8A1234      1 12345    oracle@localhost (PMON)');
                this.terminal.writeln('7F8A5678      2 12346    oracle@localhost (PSP0)');
                this.terminal.writeln('7F8A9ABC      3 12347    oracle@localhost (VKTM)');
                this.terminal.writeln('7F8ADEF0      4 12348    oracle@localhost (GEN0)');
                this.terminal.writeln('7F8B1234      5 12349    oracle@localhost (MMAN)');
                this.terminal.writeln('');
                this.terminal.writeln('6 rows selected.');
            }
            return;
        }
        
        if (sqlCommand.match(/SELECT.*FROM\s+V\$SESSION/i)) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('    SID    SERIAL# USERNAME  STATUS   PROGRAM');
                this.terminal.writeln('------- ---------- --------- -------- ------------------------------');
                this.terminal.writeln('      1          1           ACTIVE   oracle@localhost (PMON)');
                this.terminal.writeln('      2          1           ACTIVE   oracle@localhost (PSP0)');
                this.terminal.writeln('      3          1           ACTIVE   oracle@localhost (VKTM)');
                this.terminal.writeln('    156         23 SYS       ACTIVE   sqlplus@localhost (TNS V1-V3)');
                this.terminal.writeln('');
                this.terminal.writeln('4 rows selected.');
            }
            return;
        }
        
        if (sqlCommand.match(/SELECT.*FROM\s+V\$PARAMETER/i)) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('NAME                     TYPE VALUE');
                this.terminal.writeln('------------------------ ---- --------------------------------------------------');
                this.terminal.writeln('sga_target                  2 2147483648');
                this.terminal.writeln('pga_aggregate_target        2 536870912');
                this.terminal.writeln('memory_target               2 0');
                this.terminal.writeln('db_block_size               2 8192');
                this.terminal.writeln('log_archive_dest_1          1 LOCATION=/u01/app/oracle/recovery_area/ORCL');
                this.terminal.writeln('');
                this.terminal.writeln('5 rows selected.');
            }
            return;
        }
        
        // Show Parameter command
        if (sqlCommand.match(/SHOW\s+PARAMETER/i)) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                const paramMatch = sqlCommand.match(/SHOW\s+PARAMETER\s+(\w+)/i);
                if (paramMatch) {
                    const param = paramMatch[1].toLowerCase();
                    this.terminal.writeln('');
                    this.terminal.writeln('NAME                                 TYPE        VALUE');
                    this.terminal.writeln('------------------------------------ ----------- ------------------------------');
                    
                    switch(param) {
                        case 'sga':
                        case 'sga_target':
                            this.terminal.writeln('sga_target                           big integer 2G');
                            break;
                        case 'pga':
                        case 'pga_aggregate_target':
                            this.terminal.writeln('pga_aggregate_target                 big integer 512M');
                            break;
                        case 'memory':
                        case 'memory_target':
                            this.terminal.writeln('memory_target                        big integer 0');
                            break;
                        case 'archive':
                            this.terminal.writeln('log_archive_dest_1                   string      LOCATION=/u01/app/oracle/recovery_area/ORCL');
                            this.terminal.writeln('log_archive_format                   string      %t_%s_%r.dbf');
                            break;
                        default:
                            this.terminal.writeln(`${param}                                string      (value not shown)`);
                    }
                } else {
                    this.terminal.writeln('Usage: SHOW PARAMETER [parameter_name]');
                }
                this.terminal.writeln('');
            }
            return;
        }
        
        // ALTER SYSTEM commands
        if (sqlCommand.match(/ALTER\s+SYSTEM/i)) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('System altered.');
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
                
                // Show system default users
                const systemUsers = ['APPQOSSYS', 'DBSFWUSER', 'GGSYS', 'ANONYMOUS', 'CTXSYS', 
                                   'DVSYS', 'DVF', 'GSMADMIN_INTERNAL', 'MDSYS', 'OLAPSYS', 
                                   'ORDDATA', 'ORDPLUGINS', 'ORDSYS', 'OUTLN', 'REMOTE_SCHEDULER_AGENT',
                                   'SI_INFORMTN_SCHEMA', 'SYS$UMF', 'SYSBACKUP', 'SYSDG', 'SYSKM',
                                   'SYSRAC', 'WMSYS', 'XDB', 'XS$NULL'];
                
                // Show all database users from tracking system
                const allUsers = oracleManager.getAllUsers();
                allUsers.forEach(username => {
                    this.terminal.writeln(username);
                });
                
                // Show additional system users
                systemUsers.forEach(user => {
                    this.terminal.writeln(user);
                });
                
                this.terminal.writeln('');
                const count = allUsers.length + systemUsers.length;
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
        
        // Handle GRANT commands
        if (sqlCommand.startsWith('GRANT ')) {
            this.handleGrant(sqlLower, asSysdba, currentUser);
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

    // Handle CREATE USER command
    this.handleCreateUser = function(sqlCommand) {
        if (!oracleManager.getState('databaseStarted')) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-01034: ORACLE not available');
            return;
        }

        // Parse CREATE USER command
        // Pattern: CREATE USER username IDENTIFIED BY password
        const userMatch = sqlCommand.match(/create\s+user\s+(\w+)\s+identified\s+by\s+(\w+)/i);
        
        if (!userMatch) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-00922: missing or invalid option');
            return;
        }

        const username = userMatch[1].toUpperCase();
        const password = userMatch[2];

        // Check if user already exists
        if (oracleManager.userExists(username)) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln(`ORA-01920: user name '${username}' conflicts with another user or role name`);
            return;
        }

        // Create the user
        oracleManager.createDatabaseUser(username, password);
        
        this.terminal.writeln('');
        this.terminal.writeln(`User ${username} created.`);
        this.terminal.writeln('');
    };

    // Handle CREATE LIBRARY command for spatial functions
    this.handleCreateLibrary = function(sqlCommand, currentUser) {
        if (sqlCommand.includes('sde_util') && sqlCommand.includes('libsde.so')) {
            // Check if ArcGIS Server is installed
            if (!oracleManager.getState('psAppRequirements.arcgisInstalled')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-06520: PL/SQL: Error loading external library');
                this.terminal.writeln('ORA-06522: /opt/arcgis/server/lib/libsde.so: cannot open shared object file: No such file or directory');
                return;
            }

            this.terminal.writeln('');
            this.terminal.writeln('Library SDE_UTIL created.');
            this.terminal.writeln('');
            
            // Update Oracle state to track spatial library creation
            oracleManager.updateState('psAppRequirements.spatialLibraryCreated', true);
            oracleManager.updateState('psAppRequirements.extprocConfigured', true);
            
            this.terminal.writeln('-- Spatial library successfully configured for EXTPROC');
            this.terminal.writeln('-- You can now use spatial functions via the SDE schema');
        } else {
            this.terminal.writeln('');
            this.terminal.writeln('Library created.');
            this.terminal.writeln('');
        }
    };

    // Handle GRANT commands
    this.handleGrant = function(sqlCommand, asSysdba, currentUser) {
        if (!oracleManager.getState('databaseStarted')) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-01034: ORACLE not available');
            return;
        }

        // Parse GRANT command - basic patterns:
        // GRANT privilege TO user
        // GRANT role TO user
        const grantMatch = sqlCommand.match(/grant\s+(.+?)\s+to\s+(\w+)/i);
        
        if (!grantMatch) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-00903: invalid table name');
            return;
        }

        const privilege = grantMatch[1].trim();
        const grantee = grantMatch[2].toUpperCase();

        // Check permissions - only SYSDBA or privileged users can grant system privileges/roles
        const systemPrivileges = ['dba', 'connect', 'resource', 'create session', 'create table', 'create procedure', 'create view'];
        const isSystemPrivilege = systemPrivileges.some(priv => privilege.toLowerCase().includes(priv.toLowerCase()));

        if (isSystemPrivilege && !asSysdba && currentUser !== 'SYS' && currentUser !== 'SYSTEM') {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-01031: insufficient privileges');
            return;
        }

        // Check if grantee exists
        if (!oracleManager.userExists(grantee)) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln(`ORA-00942: table or view does not exist`);
            return;
        }

        // Handle specific grants
        if (privilege.toLowerCase().includes('dba')) {
            oracleManager.grantPrivilege(grantee, 'DBA');
            this.terminal.writeln('');
            this.terminal.writeln('Grant succeeded.');
            this.terminal.writeln('');
            return;
        }

        if (privilege.toLowerCase().includes('connect')) {
            oracleManager.grantPrivilege(grantee, 'CONNECT');
            this.terminal.writeln('');
            this.terminal.writeln('Grant succeeded.');
            this.terminal.writeln('');
            return;
        }

        if (privilege.toLowerCase().includes('resource')) {
            oracleManager.grantPrivilege(grantee, 'RESOURCE');
            this.terminal.writeln('');
            this.terminal.writeln('Grant succeeded.');
            this.terminal.writeln('');
            return;
        }

        if (privilege.toLowerCase().includes('create session')) {
            oracleManager.grantPrivilege(grantee, 'CREATE SESSION');
            this.terminal.writeln('');
            this.terminal.writeln('Grant succeeded.');
            this.terminal.writeln('');
            return;
        }

        if (privilege.toLowerCase().includes('create table')) {
            oracleManager.grantPrivilege(grantee, 'CREATE TABLE');
            this.terminal.writeln('');
            this.terminal.writeln('Grant succeeded.');
            this.terminal.writeln('');
            return;
        }

        if (privilege.toLowerCase().includes('create procedure')) {
            oracleManager.grantPrivilege(grantee, 'CREATE PROCEDURE');
            this.terminal.writeln('');
            this.terminal.writeln('Grant succeeded.');
            this.terminal.writeln('');
            return;
        }

        if (privilege.toLowerCase().includes('execute') && privilege.toLowerCase().includes('library')) {
            this.terminal.writeln('');
            this.terminal.writeln('Grant succeeded.');
            this.terminal.writeln('');
            
            // Update state for library registration if granting execute on spatial library
            if (privilege.toLowerCase().includes('st_shapelib')) {
                oracleManager.updateState('psAppRequirements.sdeLibraryRegistered', true);
            }
            return;
        }

        // Default grant success for other privileges
        this.terminal.writeln('');
        this.terminal.writeln('Grant succeeded.');
        this.terminal.writeln('');
    };

    // Handle spatial queries to show libraries
    this.handleUserLibrariesQuery = function(currentUser) {
        this.terminal.writeln('');
        this.terminal.writeln('FILE_SPEC');
        this.terminal.writeln('--------------------------------------------------------------------------------');
        
        if (oracleManager.getState('psAppRequirements.spatialLibraryCreated')) {
            this.terminal.writeln('/opt/arcgis/server/lib/libsde.so');
        } else {
            this.terminal.writeln('no rows selected');
        }
        this.terminal.writeln('');
    };

    // Handle spatial function testing
    this.handleSpatialQuery = function(currentUser) {
        if (!oracleManager.getState('psAppRequirements.spatialLibraryCreated')) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-00904: "ST_POINTFROMTEXT": invalid identifier');
            return;
        }

        this.terminal.writeln('');
        this.terminal.writeln('Spatial function executed successfully via EXTPROC');
        this.terminal.writeln('');
        this.terminal.writeln('POINT_GEOMETRY');
        this.terminal.writeln('--------------------------------------------------------------------------------');
        this.terminal.writeln('POINT(-122.419 37.775)');
        this.terminal.writeln('');
        this.terminal.writeln('1 row selected.');
        this.terminal.writeln('');
    };
};