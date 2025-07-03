// SQL*Plus
CommandProcessor.prototype.cmdSqlplus = function(args) {
    if (!oracleManager.checkPrerequisites('software')) {
        this.terminal.writeln('-bash: sqlplus: command not found');
        return;
    }
    
    // Start SQL*Plus session header
    this.terminal.writeln('');
    this.terminal.writeln('SQL*Plus: Release 19.0.0.0.0 - Production on ' + new Date().toLocaleString());
    this.terminal.writeln('Version 19.0.0.0.0');
    this.terminal.writeln('');
    this.terminal.writeln('Copyright (c) 1982, 2019, Oracle.  All rights reserved.');
    this.terminal.writeln('');
    
    // Parse connection string
    let connectString = args.join(' ').trim();
    let connectionEstablished = false;
    let username = '';
    let asSysdba = false;
    
    if (connectString) {
        // Connection arguments provided - attempt to connect
        const connectionResult = this.attemptSqlPlusConnection(connectString);
        connectionEstablished = connectionResult.success;
        username = connectionResult.username;
        asSysdba = connectionResult.asSysdba;
        
        if (!connectionResult.success) {
            // Connection failed, but still enter SQL*Plus mode without connection
            this.terminal.writeln('');
        }
    }
    
    // Enter SQL prompt mode (connected or not)
    this.enterSqlMode(username, asSysdba, connectionEstablished);
};

// Attempt SQL*Plus connection
CommandProcessor.prototype.attemptSqlPlusConnection = function(connectString) {
    let asSysdba = false;
    let username = '';
    let password = '';
    let database = '';
    
    if (connectString.includes('as sysdba')) {
        asSysdba = true;
        connectString = connectString.replace(/as sysdba/i, '').trim();
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
        this.terminal.writeln('ERROR:');
        this.terminal.writeln('ORA-12541: TNS:no listener');
        return { success: false, username: '', asSysdba: false };
    }
    
    if (!oracleManager.getState('databaseStarted') && !asSysdba) {
        this.terminal.writeln('ERROR:');
        this.terminal.writeln('ORA-01034: ORACLE not available');
        this.terminal.writeln('ORA-27101: shared memory realm does not exist');
        return { success: false, username: '', asSysdba: false };
    }
    
    // Connection successful
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
    
    return { success: true, username: username || 'SYSTEM', asSysdba: asSysdba };
};

// SQL Mode Handler
CommandProcessor.prototype.enterSqlMode = function(username, asSysdba, isConnected) {
    const originalPrompt = this.getPrompt;
    const originalProcess = this.processCommand;
    let currentUser = username || '';
    let connected = isConnected || false;
    
    // Override prompt
    this.getPrompt = () => 'SQL> ';
    
    // Override command processor for SQL mode
    this.processCommand = (input) => {
        const sqlCommand = input.trim().toUpperCase();
        const sqlLower = input.trim();
        
        // Add SQL command to SQL history if it's not empty and not a password
        if (sqlLower && !this.waitingForPassword && !this.waitingForUsername) {
            // Don't add duplicate commands
            if (this.sqlHistory.length === 0 || this.sqlHistory[this.sqlHistory.length - 1] !== sqlLower) {
                this.sqlHistory.push(sqlLower);
                this.saveSqlHistory();
            }
            this.sqlHistoryIndex = this.sqlHistory.length;
        }
        
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
                    connected = true;
                } else {
                    this.terminal.writeln('Connected to an idle instance.');
                    currentUser = 'SYS';
                    asSysdba = true;
                    connected = true;
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
                    connected = true;
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
                                connected = true;
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
                            connected = true;
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
                    connected = true;
                } else {
                    this.terminal.writeln('Connected to an idle instance.');
                    currentUser = 'SYS';
                    asSysdba = true;
                    connected = true;
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
                    connected = true;
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
                                connected = true;
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
                            connected = true;
                        }
                    }
                }
            }
            return;
        }
        
        // Check for database connection before executing queries
        // Allow CONNECT commands and exit/quit commands without connection
        if (!connected && !sqlCommand.startsWith('CONN') && !sqlCommand.startsWith('CONNECT') && 
            sqlCommand !== 'EXIT' && sqlCommand !== 'QUIT' && sqlCommand !== 'EXIT;' && sqlCommand !== 'QUIT;' &&
            sqlCommand.trim() !== '') {
            
            // Check if it's a SQL statement that requires connection
            const requiresConnection = sqlCommand.startsWith('SELECT') || sqlCommand.startsWith('INSERT') || 
                                     sqlCommand.startsWith('UPDATE') || sqlCommand.startsWith('DELETE') ||
                                     sqlCommand.startsWith('CREATE') || sqlCommand.startsWith('DROP') ||
                                     sqlCommand.startsWith('ALTER') || sqlCommand.startsWith('SHOW') ||
                                     sqlCommand.startsWith('DESC') || sqlCommand.startsWith('DESCRIBE') ||
                                     sqlCommand.includes('V$') || sqlCommand.includes('DBA_') ||
                                     sqlCommand.startsWith('STARTUP') || sqlCommand.startsWith('SHUTDOWN');
            
            if (requiresConnection) {
                this.terminal.writeln('ERROR:');
                this.terminal.writeln('ORA-00942: table or view does not exist');
                this.terminal.writeln('');
                this.terminal.writeln('');
                this.terminal.writeln('Not connected to Oracle.');
                return;
            }
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
        
        if (sqlCommand.startsWith('SELECT NAME FROM V$DATABASE')) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('NAME');
                this.terminal.writeln('---------');
                this.terminal.writeln('ORCL');
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
        
        if (sqlCommand.startsWith('SHOW USER')) {
            if (!connected) {
                this.terminal.writeln('USER is ""');
            } else {
                this.terminal.writeln(`USER is "${currentUser}"`);
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
        
        // ALTER TABLESPACE commands for datafile operations
        if (sqlCommand.match(/ALTER\s+TABLESPACE/i)) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
                return;
            }
            
            this.handleAlterTablespace(sqlCommand, input);
            return;
        }
        
        // ALTER DATABASE commands for datafile operations
        if (sqlCommand.match(/ALTER\s+DATABASE/i)) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
                return;
            }
            
            this.handleAlterDatabase(sqlCommand, input);
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
        
        // DBA_DATA_FILES view for space monitoring
        if (sqlCommand.startsWith('SELECT * FROM DBA_DATA_FILES') || sqlCommand.startsWith('SELECT*FROM DBA_DATA_FILES')) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('FILE_NAME                                    FILE_ID TABLESPACE_NAME   BYTES      BLOCKS  STATUS    RELATIVE_FNO AUTOEXT MAXBYTES   MAXBLOCKS  INCREMENT_BY USER_BYTES  USER_BLOCKS ONLINE_STATUS');
                this.terminal.writeln('-------------------------------------------- ------- --------------- ---------- ------- --------- ------------ ------- ---------- ---------- ------------ ---------- ----------- -------------');
                
                // Standard Oracle tablespace datafiles
                this.terminal.writeln('/u01/app/oracle/oradata/ORCL/system01.dbf         1 SYSTEM          838860800   102400  AVAILABLE           1 YES     34359721984   4194304         1280  838860800       102400 ONLINE');
                this.terminal.writeln('/u01/app/oracle/oradata/ORCL/sysaux01.dbf         3 SYSAUX          524288000    64000  AVAILABLE           3 YES     34359721984   4194304         1280  524288000        64000 ONLINE');
                this.terminal.writeln('/u01/app/oracle/oradata/ORCL/undotbs01.dbf        4 UNDOTBS1        104857600    12800  AVAILABLE           4 YES     34359721984   4194304         1280  104857600        12800 ONLINE');
                this.terminal.writeln('/u01/app/oracle/oradata/ORCL/users01.dbf          5 USERS             5242880      640  AVAILABLE           5 YES     34359721984   4194304         1280    5242880          640 ONLINE');
                
                // Check for additional datafiles that may have been created via SQL*Plus
                const datafileDir = '/u01/app/oracle/oradata/ORCL';
                const files = this.fs.ls(datafileDir);
                let fileId = 6;
                
                if (files) {
                    files.forEach(file => {
                        if (file.name.endsWith('.dbf') && !['system01.dbf', 'sysaux01.dbf', 'undotbs01.dbf', 'users01.dbf'].includes(file.name)) {
                            // Determine tablespace name from filename pattern
                            let tablespace = 'USERS';
                            if (file.name.includes('system')) tablespace = 'SYSTEM';
                            else if (file.name.includes('sysaux')) tablespace = 'SYSAUX';
                            else if (file.name.includes('undo')) tablespace = 'UNDOTBS1';
                            else if (file.name.includes('temp')) tablespace = 'TEMP';
                            
                            // Use the actual file size if available, otherwise default
                            const fileSize = file.size || 104857600;
                            const blocks = Math.floor(fileSize / 8192);
                            const userBytes = fileSize;
                            const userBlocks = blocks;
                            
                            const filePath = `${datafileDir}/${file.name}`.padEnd(44);
                            const autoext = file.autoextend ? 'YES' : 'NO';
                            const maxBytes = file.maxSize === 'UNLIMITED' ? '34359721984' : (parseInt(file.maxSize) || 34359721984);
                            const maxBlocks = Math.floor(maxBytes / 8192);
                            
                            this.terminal.writeln(`${filePath} ${fileId.toString().padStart(7)} ${tablespace.padEnd(15)} ${fileSize.toString().padStart(10)} ${blocks.toString().padStart(7)}  AVAILABLE ${fileId.toString().padStart(12)} ${autoext.padEnd(7)} ${maxBytes.toString().padStart(10)} ${maxBlocks.toString().padStart(10)} ${file.nextSize ? '1280' : '1280'.padStart(12)} ${userBytes.toString().padStart(10)} ${userBlocks.toString().padStart(11)} ONLINE`);
                            fileId++;
                        }
                    });
                }
                
                this.terminal.writeln('');
                const totalFiles = 4 + (files ? files.filter(f => f.name.endsWith('.dbf') && !['system01.dbf', 'sysaux01.dbf', 'undotbs01.dbf', 'users01.dbf'].includes(f.name)).length : 0);
                this.terminal.writeln(`${totalFiles} rows selected.`);
                this.terminal.writeln('');
            }
            return;
        }
        
        // DBA_FREE_SPACE view for space monitoring
        if (sqlCommand.startsWith('SELECT * FROM DBA_FREE_SPACE') || sqlCommand.startsWith('SELECT*FROM DBA_FREE_SPACE')) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('TABLESPACE_NAME   FILE_ID BLOCK_ID     BYTES      BLOCKS RELATIVE_FNO');
                this.terminal.writeln('--------------- --------- -------- ---------- ---------- ------------');
                
                // Calculate free space based on datafile sizes and usage
                // SYSTEM tablespace - typically has less free space
                this.terminal.writeln('SYSTEM                  1    95000  758382592      92432            1');
                this.terminal.writeln('SYSTEM                  1    98432   80478208       9824            1');
                
                // SYSAUX tablespace - moderate usage
                this.terminal.writeln('SYSAUX                  3    58000  450969600      55032            3');
                this.terminal.writeln('SYSAUX                  3    61032   73318400       8968            3');
                
                // UNDOTBS1 tablespace - usually has good free space
                this.terminal.writeln('UNDOTBS1                4     8000   96468992      11776            4');
                this.terminal.writeln('UNDOTBS1                4    11776    8388608       1024            4');
                
                // USERS tablespace - check actual file sizes for dynamic calculation
                const usersFiles = this.fs.ls('/u01/app/oracle/oradata/ORCL');
                let usersFileCount = 0;
                let nextFileId = 5;
                
                if (usersFiles) {
                    usersFiles.forEach(file => {
                        if (file.name.startsWith('users') && file.name.endsWith('.dbf')) {
                            usersFileCount++;
                            const fileSize = file.size || 5242880;
                            // Calculate free space (assume ~80% usage for demonstration)
                            const usedSpace = Math.floor(fileSize * 0.2);
                            const freeBlocks = Math.floor(usedSpace / 8192);
                            const startBlock = Math.floor((fileSize - usedSpace) / 8192);
                            
                            this.terminal.writeln(`USERS           ${nextFileId.toString().padStart(8)} ${startBlock.toString().padStart(8)} ${usedSpace.toString().padStart(10)} ${freeBlocks.toString().padStart(10)} ${nextFileId.toString().padStart(12)}`);
                            nextFileId++;
                        }
                    });
                }
                
                // If no additional users files found, show default users01.dbf free space
                if (usersFileCount === 0) {
                    this.terminal.writeln('USERS                   5      500    4194304        512            5');
                    this.terminal.writeln('USERS                   5      512    1048576        128            5');
                }
                
                this.terminal.writeln('');
                const freeSpaceEntries = 6 + (usersFileCount > 0 ? usersFileCount : 2);
                this.terminal.writeln(`${freeSpaceEntries} rows selected.`);
                this.terminal.writeln('');
            }
            return;
        }
        
        // DBA_TABLESPACES view for space monitoring
        if (sqlCommand.startsWith('SELECT * FROM DBA_TABLESPACES') || sqlCommand.startsWith('SELECT*FROM DBA_TABLESPACES')) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('TABLESPACE_NAME   BLOCK_SIZE INITIAL_EXTENT NEXT_EXTENT MIN_EXTENTS MAX_EXTENTS PCT_INCREASE MIN_EXTLEN STATUS    CONTENTS  LOGGING   FORCE_LOGGING EXTENT_MANAGEMENT ALLOCATION_TYPE SEGMENT_SPACE_MANAGEMENT DEF_TAB_COMPRESSION RETENTION   BIGFILE PREDICATE_EVALUATION ENCRYPTED COMPRESS_FOR');
                this.terminal.writeln('--------------- ---------- -------------- ----------- ----------- ----------- ------------ ---------- --------- --------- --------- ------------- ----------------- --------------- ------------------------ ------------------- ----------- -------------------- --------- ------------');
                
                // Standard Oracle tablespaces
                this.terminal.writeln('SYSTEM                 8192          65536               1  2147483645            1      65536 ONLINE    PERMANENT LOGGING   NO            LOCAL             SYSTEM          MANUAL                                                    NO      NONE                 NO');
                this.terminal.writeln('SYSAUX                 8192          65536               1  2147483645            1      65536 ONLINE    PERMANENT LOGGING   NO            LOCAL             SYSTEM          AUTO                                                      NO      NONE                 NO');
                this.terminal.writeln('UNDOTBS1               8192          65536               1  2147483645            1      65536 ONLINE    UNDO      LOGGING   NO            LOCAL             SYSTEM          MANUAL                                                    NO      NONE                 NO');
                this.terminal.writeln('TEMP                   8192        1048576     1048576           1  2147483645           50    1048576 ONLINE    TEMPORARY NOLOGGING NO            LOCAL             UNIFORM         MANUAL                                                    NO      NONE                 NO');
                this.terminal.writeln('USERS                  8192          65536               1  2147483645            1      65536 ONLINE    PERMANENT LOGGING   NO            LOCAL             SYSTEM          AUTO                                                      NO      NONE                 NO');
                
                this.terminal.writeln('');
                this.terminal.writeln('5 rows selected.');
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
        
        // Handle user dropping
        if (sqlCommand.startsWith('DROP USER')) {
            this.handleDropUser(sqlLower, asSysdba, currentUser);
            return;
        }
        
        // Handle library creation for spatial
        if (sqlCommand.includes('CREATE OR REPLACE LIBRARY')) {
            this.handleCreateLibrary(sqlLower, currentUser);
            return;
        }
        
        // Handle library dropping
        if (sqlCommand.startsWith('DROP LIBRARY')) {
            this.handleDropLibrary(sqlLower, currentUser);
            return;
        }
        
        // Handle GRANT commands
        if (sqlCommand.startsWith('GRANT ')) {
            this.handleGrant(sqlLower, asSysdba, currentUser);
            return;
        }
        
        // Handle REVOKE commands
        if (sqlCommand.startsWith('REVOKE ')) {
            this.handleRevoke(sqlLower, asSysdba, currentUser);
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
        
        // For SDE user, also update the virtual database file for OCP tracking
        if (username === 'SDE') {
            // Ensure oradata directory exists
            if (!this.fs.exists('/u01/app/oracle/oradata')) {
                this.fs.mkdir('/u01/app/oracle/oradata');
            }
            if (!this.fs.exists('/u01/app/oracle/oradata/ORCL')) {
                this.fs.mkdir('/u01/app/oracle/oradata/ORCL');
            }
            
            // Create or update system01.dbf with SDE user marker
            const dbfPath = '/u01/app/oracle/oradata/ORCL/system01.dbf';
            let dbfContent = this.fs.cat(dbfPath) || '# Oracle Database System Tablespace\n# This file contains database metadata\n\n';
            
            if (!dbfContent.includes('SDE_USER_CREATED')) {
                dbfContent += 'SDE_USER_CREATED\n';
                this.fs.updateFile(dbfPath, dbfContent);
            }
        }
        
        this.terminal.writeln('');
        this.terminal.writeln(`User ${username} created.`);
        this.terminal.writeln('');
    };

    // Handle DROP USER command
    this.handleDropUser = function(sqlCommand, asSysdba, currentUser) {
        if (!oracleManager.getState('databaseStarted')) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-01034: ORACLE not available');
            return;
        }

        // Parse DROP USER command
        // Pattern: DROP USER username [CASCADE]
        const userMatch = sqlCommand.match(/drop\s+user\s+(\w+)(\s+cascade)?/i);
        
        if (!userMatch) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-00922: missing or invalid option');
            return;
        }

        const username = userMatch[1].toUpperCase();
        const cascade = userMatch[2] !== undefined;

        // Check if user exists
        if (!oracleManager.userExists(username)) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln(`ORA-01918: user '${username}' does not exist`);
            return;
        }

        // Check permissions - only SYSDBA or privileged users can drop users
        if (!asSysdba && currentUser !== 'SYS' && currentUser !== 'SYSTEM') {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-01031: insufficient privileges');
            return;
        }

        // Prevent dropping system users and roles
        const systemUsers = ['SYS', 'SYSTEM', 'DBSNMP'];
        const systemRoles = ['PUBLIC', 'CONNECT', 'RESOURCE', 'DBA'];
        
        if (systemUsers.includes(username)) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln(`ORA-01922: CASCADE must be specified to drop '${username}'`);
            return;
        }
        
        if (systemRoles.includes(username)) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln(`ORA-01927: cannot REVOKE privileges you did not grant`);
            return;
        }

        // Check if user has objects (simplified check)
        const userPrivileges = oracleManager.getUserPrivileges(username);
        if (userPrivileges.includes('DBA') || userPrivileges.includes('RESOURCE')) {
            if (!cascade) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln(`ORA-01922: CASCADE must be specified to drop '${username}'`);
                return;
            }
        }

        // Drop the user
        oracleManager.dropDatabaseUser(username);
        
        // For SDE user, also update the virtual database file for OCP tracking
        if (username === 'SDE') {
            const dbfPath = '/u01/app/oracle/oradata/ORCL/system01.dbf';
            let dbfContent = this.fs.cat(dbfPath);
            
            if (dbfContent) {
                let updated = false;
                
                // Remove the SDE_USER_CREATED marker
                if (dbfContent.includes('SDE_USER_CREATED')) {
                    dbfContent = dbfContent.replace('SDE_USER_CREATED\n', '');
                    updated = true;
                }
                
                // Also remove library registration since SDE user owns it
                if (dbfContent.includes('ST_SHAPELIB_REGISTERED')) {
                    dbfContent = dbfContent.replace('ST_SHAPELIB_REGISTERED\n', '');
                    oracleManager.updateState('psAppRequirements.sdeLibraryRegistered', false);
                    updated = true;
                }
                
                if (updated) {
                    this.fs.updateFile(dbfPath, dbfContent);
                }
            }
        }
        
        this.terminal.writeln('');
        if (cascade) {
            this.terminal.writeln(`User ${username} dropped (with CASCADE).`);
        } else {
            this.terminal.writeln(`User ${username} dropped.`);
        }
        this.terminal.writeln('');
    };

    // Handle CREATE LIBRARY command for spatial functions
    this.handleCreateLibrary = function(sqlCommand, currentUser) {
        // Parse library name from the command
        // Pattern: CREATE [OR REPLACE] LIBRARY library_name AS 'path'
        const libraryMatch = sqlCommand.match(/create\s+(?:or\s+replace\s+)?library\s+(\w+)/i);
        const libraryName = libraryMatch ? libraryMatch[1].toUpperCase() : '';
        
        // Check if this is a spatial library (common names for ArcGIS/Oracle spatial)
        const isSpatialLibrary = libraryName.includes('ST_SHAPELIB') || 
                                libraryName.includes('SDE_UTIL') || 
                                libraryName.includes('SDE') ||
                                sqlCommand.includes('libsde.so') ||
                                sqlCommand.includes('libst_shapelib.so') ||
                                sqlCommand.includes('arcgis') ||
                                sqlCommand.includes('spatial');
        
        if (isSpatialLibrary) {
            // Check if ArcGIS Server is installed for spatial libraries
            if (!oracleManager.getState('psAppRequirements.arcgisInstalled')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-06520: PL/SQL: Error loading external library');
                this.terminal.writeln('ORA-06522: library file cannot be found or accessed');
                return;
            }

            this.terminal.writeln('');
            this.terminal.writeln(`Library ${libraryName} created.`);
            this.terminal.writeln('');
            
            // Update Oracle state to track spatial library creation
            oracleManager.updateState('psAppRequirements.spatialLibraryCreated', true);
            oracleManager.updateState('psAppRequirements.sdeLibraryRegistered', true);
            
            // Also update the virtual database file for OCP tracking
            const dbfPath = '/u01/app/oracle/oradata/ORCL/system01.dbf';
            let dbfContent = this.fs.cat(dbfPath) || '# Oracle Database System Tablespace\n# This file contains database metadata\n\n';
            
            if (!dbfContent.includes('ST_SHAPELIB_REGISTERED')) {
                dbfContent += 'ST_SHAPELIB_REGISTERED\n';
                this.fs.updateFile(dbfPath, dbfContent);
            }
            
            this.terminal.writeln('-- Spatial library successfully configured for EXTPROC');
            this.terminal.writeln('-- You can now use spatial functions via the SDE schema');
        } else {
            this.terminal.writeln('');
            this.terminal.writeln(`Library ${libraryName || 'UNNAMED'} created.`);
            this.terminal.writeln('');
        }
    };

    // Handle DROP LIBRARY command
    this.handleDropLibrary = function(sqlCommand, currentUser) {
        if (!oracleManager.getState('databaseStarted')) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-01034: ORACLE not available');
            return;
        }

        // Parse DROP LIBRARY command
        // Pattern: DROP LIBRARY library_name
        const libraryMatch = sqlCommand.match(/drop\s+library\s+(\w+)/i);
        
        if (!libraryMatch) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-00922: missing or invalid option');
            return;
        }

        const libraryName = libraryMatch[1].toUpperCase();

        // Handle spatial library specifically
        if (libraryName === 'ST_SHAPELIB' || libraryName === 'SDE_UTIL') {
            this.terminal.writeln('');
            this.terminal.writeln(`Library ${libraryName} dropped.`);
            this.terminal.writeln('');
            
            // Update Oracle state to track spatial library removal
            oracleManager.updateState('psAppRequirements.spatialLibraryCreated', false);
            oracleManager.updateState('psAppRequirements.sdeLibraryRegistered', false);
            
            // Also update the virtual database file for OCP tracking
            const dbfPath = '/u01/app/oracle/oradata/ORCL/system01.dbf';
            let dbfContent = this.fs.cat(dbfPath);
            
            if (dbfContent && dbfContent.includes('ST_SHAPELIB_REGISTERED')) {
                dbfContent = dbfContent.replace('ST_SHAPELIB_REGISTERED\n', '');
                this.fs.updateFile(dbfPath, dbfContent);
            }
        } else {
            // Generic library drop
            this.terminal.writeln('');
            this.terminal.writeln(`Library ${libraryName} dropped.`);
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
            const isSpatialLibraryGrant = privilege.toLowerCase().includes('st_shapelib') ||
                                        privilege.toLowerCase().includes('sde_util') ||
                                        privilege.toLowerCase().includes('sde') ||
                                        privilege.toLowerCase().includes('spatial');
            
            if (isSpatialLibraryGrant) {
                oracleManager.updateState('psAppRequirements.sdeLibraryRegistered', true);
                
                // Also update the virtual database file for OCP tracking
                const dbfPath = '/u01/app/oracle/oradata/ORCL/system01.dbf';
                let dbfContent = this.fs.cat(dbfPath) || '# Oracle Database System Tablespace\n# This file contains database metadata\n\n';
                
                if (!dbfContent.includes('ST_SHAPELIB_REGISTERED')) {
                    dbfContent += 'ST_SHAPELIB_REGISTERED\n';
                    this.fs.updateFile(dbfPath, dbfContent);
                }
            }
            return;
        }

        // Default grant success for other privileges
        this.terminal.writeln('');
        this.terminal.writeln('Grant succeeded.');
        this.terminal.writeln('');
    };

    // Handle REVOKE commands
    this.handleRevoke = function(sqlCommand, asSysdba, currentUser) {
        if (!oracleManager.getState('databaseStarted')) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-01034: ORACLE not available');
            return;
        }

        // Parse REVOKE command - basic patterns:
        // REVOKE privilege FROM user
        // REVOKE role FROM user
        const revokeMatch = sqlCommand.match(/revoke\s+(.+?)\s+from\s+(\w+)/i);
        
        if (!revokeMatch) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-00903: invalid table name');
            return;
        }

        const privilege = revokeMatch[1].trim();
        const grantee = revokeMatch[2].toUpperCase();

        // Check permissions - only SYSDBA or privileged users can revoke system privileges/roles
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

        // Handle specific revokes
        if (privilege.toLowerCase().includes('dba')) {
            oracleManager.revokePrivilege(grantee, 'DBA');
        } else if (privilege.toLowerCase().includes('connect')) {
            oracleManager.revokePrivilege(grantee, 'CONNECT');
        } else if (privilege.toLowerCase().includes('resource')) {
            oracleManager.revokePrivilege(grantee, 'RESOURCE');
        } else if (privilege.toLowerCase().includes('create session')) {
            oracleManager.revokePrivilege(grantee, 'CREATE SESSION');
        } else if (privilege.toLowerCase().includes('create table')) {
            oracleManager.revokePrivilege(grantee, 'CREATE TABLE');
        } else if (privilege.toLowerCase().includes('create procedure')) {
            oracleManager.revokePrivilege(grantee, 'CREATE PROCEDURE');
        }

        this.terminal.writeln('');
        this.terminal.writeln('Revoke succeeded.');
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

    // Handle ALTER TABLESPACE commands for datafile operations
    this.handleAlterTablespace = function(sqlCommand, input) {
        // Parse tablespace name
        const tablespaceMatch = sqlCommand.match(/alter\s+tablespace\s+(\w+)/i);
        if (!tablespaceMatch) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-00922: missing or invalid option');
            return;
        }
        
        const tablespaceName = tablespaceMatch[1].toUpperCase();
        
        // Handle ADD DATAFILE operations
        if (sqlCommand.match(/add\s+datafile/i)) {
            // Use original input to preserve case for filename
            const datafileMatch = input.match(/add\s+datafile\s+['"']([^'"]+)['"](?:\s+size\s+(\d+)([kmg]?))?(?:\s+autoextend\s+(on|off))?(?:\s+next\s+(\d+)([kmg]?))?(?:\s+maxsize\s+(\d+)([kmg]?)|unlimited)?/i);
            
            if (!datafileMatch) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-00922: missing or invalid option');
                return;
            }
            
            const datafileName = datafileMatch[1];
            const size = datafileMatch[2] || '100';
            const sizeUnit = (datafileMatch[3] || 'M').toUpperCase();
            const autoextend = datafileMatch[4] ? datafileMatch[4].toUpperCase() : 'OFF';
            const nextSize = datafileMatch[5] || '1';
            const nextUnit = (datafileMatch[6] || 'M').toUpperCase();
            const maxSize = datafileMatch[7] || 'UNLIMITED';
            const maxUnit = (datafileMatch[8] || 'M').toUpperCase();
            
            // Validate tablespace exists
            const validTablespaces = ['USERS', 'SYSTEM', 'SYSAUX', 'UNDOTBS1', 'TEMP', 'SDS_TABLE', 'SDS_INDEX', 'SDS_LOB', 'SDS_SMALL_LOB', 'SDS_MEDIUM_LOB', 'SDS_LARGE_LOB'];
            if (!validTablespaces.includes(tablespaceName)) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln(`ORA-00959: tablespace '${tablespaceName}' does not exist`);
                return;
            }
            
            // Determine full path
            let fullPath = datafileName;
            if (!datafileName.startsWith('/')) {
                // Relative path - add to Oracle data directory
                fullPath = `/u01/app/oracle/oradata/ORCL/${datafileName}`;
            }
            
            // Check if datafile already exists
            if (this.fs.exists(fullPath)) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln(`ORA-01119: error in creating database file '${fullPath}'`);
                this.terminal.writeln(`ORA-27038: created file already exists`);
                return;
            }
            
            // Calculate size in bytes for file creation
            const sizeInBytes = this.calculateSizeInBytes(size, sizeUnit);
            
            // Create the datafile
            this.fs.touch(fullPath, '');
            
            // Set file metadata to reflect the datafile properties
            const pathArray = this.fs.resolvePath(fullPath);
            const node = this.fs.getNode(pathArray);
            if (node) {
                node.size = sizeInBytes;
                node.owner = 'oracle';
                node.group = 'oinstall';
                node.permissions = '-rw-r-----';
                node.autoextend = autoextend === 'ON';
                node.nextSize = nextSize + nextUnit;
                node.maxSize = maxSize === 'UNLIMITED' ? 'UNLIMITED' : maxSize + maxUnit;
                // Save filesystem state to persist datafile metadata
                this.fs.saveState();
            }
            
            this.terminal.writeln('');
            this.terminal.writeln('Tablespace altered.');
            this.terminal.writeln('');
            return;
        }
        
        // Handle other tablespace operations
        this.terminal.writeln('ERROR at line 1:');
        this.terminal.writeln('ORA-00922: missing or invalid option');
    };

    // Handle ALTER DATABASE commands for datafile operations
    this.handleAlterDatabase = function(sqlCommand, input) {
        // Handle DATAFILE RESIZE operations
        if (sqlCommand.match(/datafile.*resize/i)) {
            // Use original input to preserve case for filename
            const resizeMatch = input.match(/datafile\s+['"']([^'"]+)['"](?:\s+resize\s+(\d+)([kmg]?))?/i);
            
            if (!resizeMatch) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-00922: missing or invalid option');
                return;
            }
            
            const datafileName = resizeMatch[1];
            const newSize = resizeMatch[2];
            const sizeUnit = (resizeMatch[3] || 'M').toUpperCase();
            
            if (!newSize) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-00922: missing or invalid option');
                return;
            }
            
            // Determine full path
            let fullPath = datafileName;
            if (!datafileName.startsWith('/')) {
                fullPath = `/u01/app/oracle/oradata/ORCL/${datafileName}`;
            }
            
            // Check if datafile exists
            if (!this.fs.exists(fullPath)) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln(`ORA-01119: error in creating database file '${fullPath}'`);
                this.terminal.writeln(`ORA-27038: file does not exist`);
                return;
            }
            
            // Calculate new size in bytes
            const newSizeInBytes = this.calculateSizeInBytes(newSize, sizeUnit);
            
            // Update the datafile size
            const pathArray = this.fs.resolvePath(fullPath);
            const node = this.fs.getNode(pathArray);
            if (node) {
                node.size = newSizeInBytes;
                node.modified = new Date();
                // Save filesystem state to persist datafile size changes
                this.fs.saveState();
            }
            
            this.terminal.writeln('');
            this.terminal.writeln('Database altered.');
            this.terminal.writeln('');
            return;
        }
        
        // Handle DATAFILE AUTOEXTEND operations
        if (sqlCommand.match(/datafile.*autoextend/i)) {
            // Use original input to preserve case for filename
            const autoextendMatch = input.match(/datafile\s+['"']([^'"]+)['"](?:\s+autoextend\s+(on|off))?(?:\s+next\s+(\d+)([kmg]?))?(?:\s+maxsize\s+(\d+)([kmg]?)|unlimited)?/i);
            
            if (!autoextendMatch) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-00922: missing or invalid option');
                return;
            }
            
            const datafileName = autoextendMatch[1];
            const autoextend = autoextendMatch[2] ? autoextendMatch[2].toUpperCase() : 'ON';
            const nextSize = autoextendMatch[3] || '1';
            const nextUnit = (autoextendMatch[4] || 'M').toUpperCase();
            const maxSize = autoextendMatch[5] || 'UNLIMITED';
            const maxUnit = (autoextendMatch[6] || 'M').toUpperCase();
            
            // Determine full path
            let fullPath = datafileName;
            if (!datafileName.startsWith('/')) {
                fullPath = `/u01/app/oracle/oradata/ORCL/${datafileName}`;
            }
            
            // Check if datafile exists
            if (!this.fs.exists(fullPath)) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln(`ORA-01119: error in creating database file '${fullPath}'`);
                this.terminal.writeln(`ORA-27038: file does not exist`);
                return;
            }
            
            // Update the datafile autoextend settings
            const pathArray = this.fs.resolvePath(fullPath);
            const node = this.fs.getNode(pathArray);
            if (node) {
                node.autoextend = autoextend === 'ON';
                node.nextSize = nextSize + nextUnit;
                node.maxSize = maxSize === 'UNLIMITED' ? 'UNLIMITED' : maxSize + maxUnit;
                node.modified = new Date();
                // Save filesystem state to persist datafile autoextend changes
                this.fs.saveState();
            }
            
            this.terminal.writeln('');
            this.terminal.writeln('Database altered.');
            this.terminal.writeln('');
            return;
        }
        
        // Handle other database operations
        this.terminal.writeln('ERROR at line 1:');
        this.terminal.writeln('ORA-00922: missing or invalid option');
    };

    // Helper method to calculate size in bytes
    this.calculateSizeInBytes = function(size, unit) {
        const sizeNum = parseInt(size);
        switch (unit.toUpperCase()) {
            case 'K':
                return sizeNum * 1024;
            case 'M':
                return sizeNum * 1024 * 1024;
            case 'G':
                return sizeNum * 1024 * 1024 * 1024;
            default:
                return sizeNum; // Assume bytes if no unit
        }
    };
};