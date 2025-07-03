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
        
        // Handle CONNECT/CONN command (strip semicolon for parsing)
        const sqlCommandNoSemicolon = sqlCommand.endsWith(';') ? sqlCommand.slice(0, -1).trim() : sqlCommand;
        const isConnectCmd = sqlCommandNoSemicolon.startsWith('CONNECT ') || 
                           sqlCommandNoSemicolon.startsWith('CONN ') ||
                           sqlCommandNoSemicolon === 'CONNECT' ||
                           sqlCommandNoSemicolon === 'CONN';
        
        if (isConnectCmd) {
            let connectPart = '';
            if (sqlCommandNoSemicolon.startsWith('CONNECT ')) {
                connectPart = sqlCommandNoSemicolon.substring(8).trim();
            } else if (sqlCommandNoSemicolon.startsWith('CONN ')) {
                connectPart = sqlCommandNoSemicolon.substring(5).trim();
            } else if (sqlCommandNoSemicolon === 'CONNECT' || sqlCommandNoSemicolon === 'CONN') {
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
        
        // V$INSTANCE view - complete instance information
        if (sqlCommand.startsWith('SELECT * FROM V$INSTANCE') || sqlCommand.startsWith('SELECT*FROM V$INSTANCE') ||
            sqlCommand.startsWith('SELECT * FROM v$instance') || sqlCommand.startsWith('SELECT*FROM v$instance')) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('INSTANCE_NUMBER INSTANCE_NAME    HOST_NAME        VERSION           STARTUP_TIME         STATUS       PARALLEL THREAD# ARCHIVER LOG_SWITCH_WAIT LOGINS           SHUTDOWN_PENDING INSTANCE_ROLE      ACTIVE_STATE       BLOCKED');
                this.terminal.writeln('--------------- ---------------- ---------------- ----------------- -------------------- ------------ -------- ------- -------- --------------- ---------------- ---------------- ------------------ -------');
                this.terminal.writeln('              1 ORCL             proddb01sim      19.0.0.0.0        01-JAN-24 09:00:00   OPEN         NO            0 STARTED                  ALLOWED          NO               PRIMARY_INSTANCE   NORMAL             NO');
                this.terminal.writeln('');
                this.terminal.writeln('1 row selected.');
                this.terminal.writeln('');
            }
            return;
        }
        
        // V$SYSTEM_EVENT view - system wait events
        if (sqlCommand.startsWith('SELECT * FROM V$SYSTEM_EVENT') || sqlCommand.startsWith('SELECT*FROM V$SYSTEM_EVENT') ||
            sqlCommand.startsWith('SELECT * FROM v$system_event') || sqlCommand.startsWith('SELECT*FROM v$system_event')) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('EVENT                                                            TOTAL_WAITS   TOTAL_TIMEOUTS   TIME_WAITED AVERAGE_WAIT   TIME_WAITED_MICRO');
                this.terminal.writeln('---------------------------------------------------------------- ----------- ---------------- ----------- ------------ -----------------');
                this.terminal.writeln('buffer busy waits                                                       1234                0        1543         1.25           1543000');
                this.terminal.writeln('db file sequential read                                                 45678                0       12345         0.27          12345000');
                this.terminal.writeln('db file scattered read                                                   8901                0        4567         0.51           4567000');
                this.terminal.writeln('log file sync                                                            2345                0         789         0.34            789000');
                this.terminal.writeln('log file parallel write                                                  2345                0         234         0.10            234000');
                this.terminal.writeln('control file parallel write                                               456                0          23         0.05             23000');
                this.terminal.writeln('SQL*Net message from client                                             12345                0      123456        10.01         123456000');
                this.terminal.writeln('SQL*Net message to client                                               12345                0          12         0.00             12000');
                this.terminal.writeln('latch: cache buffers chains                                               789                0         123         0.16            123000');
                this.terminal.writeln('latch: shared pool                                                        234                0          45         0.19             45000');
                this.terminal.writeln('library cache lock                                                         67                0          89         1.33             89000');
                this.terminal.writeln('library cache pin                                                         123                0          34         0.28             34000');
                this.terminal.writeln('enq: TX - row lock contention                                              45                0        5678       126.18           5678000');
                this.terminal.writeln('');
                this.terminal.writeln('13 rows selected.');
                this.terminal.writeln('');
            }
            return;
        }
        
        // V$SQL view - SQL statements in library cache
        if (sqlCommand.startsWith('SELECT * FROM V$SQL') || sqlCommand.startsWith('SELECT*FROM V$SQL') ||
            sqlCommand.startsWith('SELECT * FROM v$sql') || sqlCommand.startsWith('SELECT*FROM v$sql')) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('SQL_TEXT                                                         SQL_ID        EXECUTIONS DISK_READS BUFFER_GETS ROWS_PROCESSED ELAPSED_TIME CPU_TIME FIRST_LOAD_TIME     LAST_LOAD_TIME      PARSING_SCHEMA_NAME');
                this.terminal.writeln('---------------------------------------------------------------- ------------- ---------- ---------- ----------- -------------- ------------ -------- ------------------- ------------------- -------------------');
                this.terminal.writeln('SELECT * FROM DBA_USERS                                         8fq2m9yz7xkjp         12          0        1234            156       456789    123456 2024-01-01/10:30:15 2024-01-01/11:45:23 SYS');
                this.terminal.writeln('SELECT NAME FROM V$DATABASE                                     4gh8n2kx9mqlr         45          0         234              1        12345      5678 2024-01-01/09:15:30 2024-01-01/11:30:45 SYSTEM');
                this.terminal.writeln('SELECT TABLESPACE_NAME FROM DBA_TABLESPACES                    7mp3k5vw2nxtr          8          0         567              5        23456      8901 2024-01-01/10:00:00 2024-01-01/10:45:12 SYS');
                this.terminal.writeln('CREATE USER test_user IDENTIFIED BY password                   2bq9j4hy6zlkm          1          0          89              0         5678      2345 2024-01-01/11:00:15 2024-01-01/11:00:15 SYS');
                this.terminal.writeln('GRANT CONNECT TO test_user                                      9xr5m7nv3pkts          1          0          45              0         1234       567 2024-01-01/11:01:00 2024-01-01/11:01:00 SYS');
                this.terminal.writeln('SELECT * FROM DBA_DATA_FILES                                    6kt8p2sw4mqvx          3          0         789              4        34567     12345 2024-01-01/10:45:30 2024-01-01/11:15:45 SYSTEM');
                this.terminal.writeln('ALTER DATABASE DATAFILE \'users01.dbf\' RESIZE 200M              5nw7q3yt8rvhj          1         12         345              0        67890     23456 2024-01-01/11:30:00 2024-01-01/11:30:00 SYS');
                this.terminal.writeln('');
                this.terminal.writeln('7 rows selected.');
                this.terminal.writeln('');
            }
            return;
        }
        
        // V$TABLESPACE view - tablespace information
        if (sqlCommand.startsWith('SELECT * FROM V$TABLESPACE') || sqlCommand.startsWith('SELECT*FROM V$TABLESPACE') ||
            sqlCommand.startsWith('SELECT * FROM v$tablespace') || sqlCommand.startsWith('SELECT*FROM v$tablespace')) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('        TS# NAME                           INCLUDED_IN_DATABASE_BACKUP BIGFILE FLASHBACK_ON ENCRYPT_IN_BACKUP');
                this.terminal.writeln('----------- ------------------------------ ---------------------------- ------- ------------ -----------------');
                this.terminal.writeln('          0 SYSTEM                         YES                          NO      YES          NO');
                this.terminal.writeln('          1 SYSAUX                         YES                          NO      YES          NO');
                this.terminal.writeln('          2 UNDOTBS1                       YES                          NO      YES          NO');
                this.terminal.writeln('          3 TEMP                           NO                           NO      YES          NO');
                this.terminal.writeln('          4 USERS                          YES                          NO      YES          NO');
                
                // Check for custom tablespaces created through simulation
                let tsNum = 5;
                const customTablespaces = ['SDS_TABLE', 'SDS_INDEX', 'SDS_LOB', 'SDS_SMALL_LOB', 'SDS_MEDIUM_LOB', 'SDS_LARGE_LOB'];
                let customCount = 0;
                
                customTablespaces.forEach(tsName => {
                    if (this.fs.exists(`/oradata/${tsName}.dbf`)) {
                        this.terminal.writeln(`${tsNum.toString().padStart(11)} ${tsName.padEnd(30)} YES                          NO      YES          NO`);
                        tsNum++;
                        customCount++;
                    }
                });
                
                this.terminal.writeln('');
                this.terminal.writeln(`${5 + customCount} rows selected.`);
                this.terminal.writeln('');
            }
            return;
        }
        
        // Top wait events query (common DBA query)
        if (sqlCommand.match(/SELECT.*EVENT.*FROM V\$SYSTEM_EVENT.*ORDER BY.*TIME_WAITED.*DESC/i) ||
            sqlCommand.match(/SELECT.*EVENT.*FROM v\$system_event.*ORDER BY.*time_waited.*desc/i)) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('EVENT                                                            TIME_WAITED TOTAL_WAITS AVERAGE_WAIT');
                this.terminal.writeln('---------------------------------------------------------------- ----------- ----------- ------------');
                this.terminal.writeln('SQL*Net message from client                                          123456       12345        10.01');
                this.terminal.writeln('db file sequential read                                               12345       45678         0.27');
                this.terminal.writeln('enq: TX - row lock contention                                          5678          45       126.18');
                this.terminal.writeln('db file scattered read                                                 4567        8901         0.51');
                this.terminal.writeln('buffer busy waits                                                      1543        1234         1.25');
                this.terminal.writeln('log file sync                                                           789        2345         0.34');
                this.terminal.writeln('');
                this.terminal.writeln('6 rows selected.');
                this.terminal.writeln('');
            }
            return;
        }
        
        // Top SQL by executions query (common DBA query)
        if (sqlCommand.match(/SELECT.*SQL_TEXT.*FROM V\$SQL.*ORDER BY.*EXECUTIONS.*DESC/i) ||
            sqlCommand.match(/SELECT.*sql_text.*FROM v\$sql.*ORDER BY.*executions.*desc/i)) {
            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('SQL_TEXT                                                         EXECUTIONS ELAPSED_TIME CPU_TIME');
                this.terminal.writeln('---------------------------------------------------------------- ---------- ------------ --------');
                this.terminal.writeln('SELECT NAME FROM V$DATABASE                                             45        12345     5678');
                this.terminal.writeln('SELECT * FROM DBA_USERS                                                 12       456789   123456');
                this.terminal.writeln('SELECT TABLESPACE_NAME FROM DBA_TABLESPACES                             8        23456     8901');
                this.terminal.writeln('SELECT * FROM DBA_DATA_FILES                                             3        34567    12345');
                this.terminal.writeln('CREATE USER test_user IDENTIFIED BY password                            1         5678     2345');
                this.terminal.writeln('');
                this.terminal.writeln('5 rows selected.');
                this.terminal.writeln('');
            }
            return;
        }
        
        // Tablespace usage query (common DBA query)
        if (sqlCommand.match(/SELECT.*TABLESPACE_NAME.*FROM DBA_TABLESPACES.*UNION.*V\$TABLESPACE/i) ||
            sqlCommand.startsWith('SELECT TABLESPACE_NAME FROM V$TABLESPACE') ||
            sqlCommand.startsWith('SELECT tablespace_name FROM v$tablespace')) {
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
                
                // Check for custom tablespaces
                const customTablespaces = ['SDS_TABLE', 'SDS_INDEX', 'SDS_LOB', 'SDS_SMALL_LOB', 'SDS_MEDIUM_LOB', 'SDS_LARGE_LOB'];
                let customCount = 0;
                customTablespaces.forEach(tsName => {
                    if (this.fs.exists(`/oradata/${tsName}.dbf`)) {
                        this.terminal.writeln(tsName);
                        customCount++;
                    }
                });
                
                this.terminal.writeln('');
                this.terminal.writeln(`${5 + customCount} rows selected.`);
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
                
                // Show all database users from tracking system (exclude roles)
                const allUsers = oracleManager.getAllUsers().filter(username => {
                    const user = oracleManager.state.databaseUsers[username];
                    return !user.isRole;
                });
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
        
        // Full DBA_USERS query  
        if (sqlCommand.startsWith('SELECT * FROM DBA_USERS') || sqlCommand.startsWith('SELECT*FROM DBA_USERS') ||
            sqlCommand.startsWith('SELECT * FROM dba_users') || sqlCommand.startsWith('SELECT*FROM dba_users')) {
            if (!connected) {
                this.terminal.writeln('ERROR:');
                this.terminal.writeln('ORA-00942: table or view does not exist');
                this.terminal.writeln('');
                this.terminal.writeln('Not connected to Oracle.');
                return;
            }

            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('USERNAME                       USER_ID ACCOUNT_STATUS                   LOCK_DATE EXPIRY_DATE DEFAULT_TABLESPACE     TEMPORARY_TABLESPACE   CREATED   PROFILE                        INITIAL_RSRC_CONSUMER_GROUP    EXTERNAL_NAME');
                this.terminal.writeln('------------------------------ ------- -------------------------------- --------- ----------- ---------------------- ---------------------- --------- ------------------------------ ------------------------------ -------------');
                
                // Get all users from the database users tracking system
                const allDatabaseUsers = Object.keys(oracleManager.state.databaseUsers);
                let userId = 1;
                
                allDatabaseUsers.forEach(username => {
                    const user = oracleManager.state.databaseUsers[username];
                    // Only show actual users, not roles
                    if (user.created && !user.isRole) {
                        const accountStatus = user.locked ? 'EXPIRED & LOCKED' : 'OPEN';
                        const lockDate = user.locked ? '01-JAN-24' : '';
                        const expiryDate = user.locked ? '01-JAN-24' : '';
                        const defaultTablespace = (username === 'SYS' || username === 'SYSTEM') ? 'SYSTEM' : 'USERS';
                        const tempTablespace = 'TEMP';
                        const created = '01-JAN-24';
                        const profile = 'DEFAULT';
                        const consumerGroup = 'DEFAULT_CONSUMER_GROUP';
                        
                        this.terminal.writeln(`${username.padEnd(30)} ${userId.toString().padStart(7)} ${accountStatus.padEnd(32)} ${lockDate.padEnd(9)} ${expiryDate.padEnd(11)} ${defaultTablespace.padEnd(22)} ${tempTablespace.padEnd(22)} ${created.padEnd(9)} ${profile.padEnd(30)} ${consumerGroup.padEnd(30)}`);
                        userId++;
                    }
                });
                
                // Add some standard system users that are always present
                const systemUsers = [
                    { name: 'ANONYMOUS', status: 'LOCKED', tablespace: 'SYSAUX' },
                    { name: 'CTXSYS', status: 'LOCKED', tablespace: 'SYSAUX' },
                    { name: 'GSMADMIN_INTERNAL', status: 'LOCKED', tablespace: 'SYSAUX' },
                    { name: 'MDSYS', status: 'LOCKED', tablespace: 'SYSAUX' },
                    { name: 'OUTLN', status: 'LOCKED', tablespace: 'SYSTEM' },
                    { name: 'REMOTE_SCHEDULER_AGENT', status: 'LOCKED', tablespace: 'SYSAUX' },
                    { name: 'WMSYS', status: 'LOCKED', tablespace: 'SYSAUX' },
                    { name: 'XDB', status: 'LOCKED', tablespace: 'SYSAUX' }
                ];
                
                systemUsers.forEach(sysUser => {
                    const accountStatus = sysUser.status + ' & EXPIRED';
                    const lockDate = '01-JAN-24';
                    const expiryDate = '01-JAN-24';
                    const defaultTablespace = sysUser.tablespace;
                    const tempTablespace = 'TEMP';
                    const created = '01-JAN-24';
                    const profile = 'DEFAULT';
                    const consumerGroup = 'DEFAULT_CONSUMER_GROUP';
                    
                    this.terminal.writeln(`${sysUser.name.padEnd(30)} ${userId.toString().padStart(7)} ${accountStatus.padEnd(32)} ${lockDate.padEnd(9)} ${expiryDate.padEnd(11)} ${defaultTablespace.padEnd(22)} ${tempTablespace.padEnd(22)} ${created.padEnd(9)} ${profile.padEnd(30)} ${consumerGroup.padEnd(30)}`);
                    userId++;
                });
                
                this.terminal.writeln('');
                const totalUsers = Object.values(oracleManager.state.databaseUsers).filter(u => u.created && !u.isRole).length + systemUsers.length;
                this.terminal.writeln(`${totalUsers} rows selected.`);
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
        
        // Handle CREATE ROLE command
        if (sqlCommand.startsWith('CREATE ROLE ')) {
            this.handleCreateRole(sqlLower, asSysdba, currentUser);
            return;
        }
        
        // Handle DROP ROLE command
        if (sqlCommand.startsWith('DROP ROLE ')) {
            this.handleDropRole(sqlLower, asSysdba, currentUser);
            return;
        }
        
        // Handle DBA_ROLES query
        if (sqlCommand.startsWith('SELECT * FROM DBA_ROLES') || sqlCommand.startsWith('SELECT*FROM DBA_ROLES')) {
            if (!connected) {
                this.terminal.writeln('ERROR:');
                this.terminal.writeln('ORA-00942: table or view does not exist');
                this.terminal.writeln('');
                this.terminal.writeln('Not connected to Oracle.');
                return;
            }

            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('ROLE                           PASSWORD_REQUIRED AUTHENTICATION_TYPE');
                this.terminal.writeln('------------------------------ ----------------- ------------------');
                
                const roles = oracleManager.getAllRoles();
                roles.forEach(roleName => {
                    const role = oracleManager.state.databaseUsers[roleName];
                    const passwordRequired = role.password ? 'YES' : 'NO';
                    const authType = role.password ? 'PASSWORD' : 'NONE';
                    this.terminal.writeln(`${roleName.padEnd(30)} ${passwordRequired.padEnd(17)} ${authType}`);
                });
                
                this.terminal.writeln('');
                this.terminal.writeln(`${roles.length} rows selected.`);
                this.terminal.writeln('');
            }
            return;
        }
        
        // Handle USER_ROLE_PRIVS query
        if (sqlCommand.startsWith('SELECT * FROM USER_ROLE_PRIVS') || sqlCommand.startsWith('SELECT*FROM USER_ROLE_PRIVS')) {
            if (!connected) {
                this.terminal.writeln('ERROR:');
                this.terminal.writeln('ORA-00942: table or view does not exist');
                this.terminal.writeln('');
                this.terminal.writeln('Not connected to Oracle.');
                return;
            }

            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('USERNAME                       GRANTED_ROLE                   ADMIN_OPTION DEFAULT_ROLE');
                this.terminal.writeln('------------------------------ ------------------------------ ------------ ------------');
                
                const userRoles = oracleManager.getUserRoles(currentUser);
                userRoles.forEach(roleName => {
                    this.terminal.writeln(`${currentUser.padEnd(30)} ${roleName.padEnd(30)} NO           YES`);
                });
                
                this.terminal.writeln('');
                this.terminal.writeln(`${userRoles.length} rows selected.`);
                this.terminal.writeln('');
            }
            return;
        }
        
        // Handle ROLE_TAB_PRIVS query  
        if (sqlCommand.startsWith('SELECT * FROM ROLE_TAB_PRIVS') || sqlCommand.startsWith('SELECT*FROM ROLE_TAB_PRIVS')) {
            if (!connected) {
                this.terminal.writeln('ERROR:');
                this.terminal.writeln('ORA-00942: table or view does not exist');
                this.terminal.writeln('');
                this.terminal.writeln('Not connected to Oracle.');
                return;
            }

            if (!oracleManager.getState('databaseStarted')) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01034: ORACLE not available');
            } else {
                this.terminal.writeln('');
                this.terminal.writeln('ROLE                           OWNER                          TABLE_NAME                     PRIVILEGE                                GRANTABLE');
                this.terminal.writeln('------------------------------ ------------------------------ ------------------------------ ---------------------------------------- ---------');
                
                // Show sample privileges for predefined roles
                const systemRoles = ['CONNECT', 'RESOURCE', 'DBA'];
                let rowCount = 0;
                
                systemRoles.forEach(roleName => {
                    if (oracleManager.roleExists(roleName)) {
                        // Sample privileges for demonstration
                        if (roleName === 'CONNECT') {
                            this.terminal.writeln(`${roleName.padEnd(30)} SYS                            V_$SESSION                     SELECT                                   NO`);
                            this.terminal.writeln(`${roleName.padEnd(30)} SYS                            V_$PARAMETER                   SELECT                                   NO`);
                            rowCount += 2;
                        } else if (roleName === 'RESOURCE') {
                            this.terminal.writeln(`${roleName.padEnd(30)} SYS                            USER_OBJECTS                   SELECT                                   NO`);
                            this.terminal.writeln(`${roleName.padEnd(30)} SYS                            USER_TABLES                    SELECT                                   NO`);
                            rowCount += 2;
                        } else if (roleName === 'DBA') {
                            this.terminal.writeln(`${roleName.padEnd(30)} SYS                            DBA_USERS                      SELECT                                   NO`);
                            this.terminal.writeln(`${roleName.padEnd(30)} SYS                            DBA_OBJECTS                    SELECT                                   NO`);
                            this.terminal.writeln(`${roleName.padEnd(30)} SYS                            DBA_TABLES                     SELECT                                   NO`);
                            rowCount += 3;
                        }
                    }
                });
                
                this.terminal.writeln('');
                this.terminal.writeln(`${rowCount} rows selected.`);
                this.terminal.writeln('');
            }
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
        
        // Handle SQL script execution
        if (sqlCommand.startsWith('@') || sqlCommand.startsWith('@@')) {
            const scriptPath = sqlCommand.substring(1).trim();
            
            // Handle AWR report script
            if (scriptPath === 'awrrpt.sql' || scriptPath === 'awrrpt' || 
                scriptPath === '$ORACLE_HOME/rdbms/admin/awrrpt.sql' ||
                scriptPath === '/u01/app/oracle/product/19.0.0/dbhome_1/rdbms/admin/awrrpt.sql') {
                this.generateAwrReport();
                return;
            }
            
            // Handle ADDM report script
            if (scriptPath === 'addmrpt.sql' || scriptPath === 'addmrpt' ||
                scriptPath === '$ORACLE_HOME/rdbms/admin/addmrpt.sql' ||
                scriptPath === '/u01/app/oracle/product/19.0.0/dbhome_1/rdbms/admin/addmrpt.sql') {
                this.generateAddmReport();
                return;
            }
            
            // Generic script not found
            this.terminal.writeln(`SP2-0310: unable to open file "${scriptPath}"`);
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

    // Generate AWR Report in SQL*Plus
    this.generateAwrReport = function() {
        if (!oracleManager.getState('databaseStarted')) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-01034: ORACLE not available');
            return;
        }

        this.terminal.writeln('');
        this.terminal.writeln('Oracle AWR Report Generation');
        this.terminal.writeln('============================');
        this.terminal.writeln('');
        this.terminal.writeln('Current Instance');
        this.terminal.writeln('~~~~~~~~~~~~~~~~');
        this.terminal.writeln('   DB Id    DB Name      Inst Num Instance');
        this.terminal.writeln('----------- ------------ -------- ------------');
        this.terminal.writeln('  123456789 ORCL                1 ORCL');
        this.terminal.writeln('');
        this.terminal.writeln('Instances in this Workload Repository schema');
        this.terminal.writeln('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
        this.terminal.writeln('   DB Id     Inst Num DB Name      Instance     Host');
        this.terminal.writeln('------------ -------- ------------ ------------ ------------');
        this.terminal.writeln('* 123456789         1 ORCL         ORCL         proddb01sim');
        this.terminal.writeln('');
        this.terminal.writeln('Using 123456789 for database Id');
        this.terminal.writeln('Using          1 for instance number');
        this.terminal.writeln('');
        this.terminal.writeln('Listing the last 3 days of Completed Snapshots');
        this.terminal.writeln('                                                       Snap');
        this.terminal.writeln('Instance     DB Name        Snap Id   Snap Started    Level');
        this.terminal.writeln('------------ ------------ --------- --------------- -----');
        this.terminal.writeln('ORCL         ORCL              1234  01 Jan 2024 09:00   1');
        this.terminal.writeln('                               1235  01 Jan 2024 10:00   1');
        this.terminal.writeln('                               1236  01 Jan 2024 11:00   1');
        this.terminal.writeln('                               1237  01 Jan 2024 12:00   1');
        this.terminal.writeln('');
        this.terminal.writeln('Specify the Begin and End Snapshot Ids');
        this.terminal.writeln('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
        this.terminal.writeln('Enter value for begin_snap: 1235');
        this.terminal.writeln('Enter value for end_snap: 1236');
        this.terminal.writeln('');
        this.terminal.writeln('Specify the Report Name');
        this.terminal.writeln('~~~~~~~~~~~~~~~~~~~~~~~');
        this.terminal.writeln('The default report file name is awrrpt_1_1235_1236.html. To use this name,');
        this.terminal.writeln('press <return> to continue, otherwise enter an alternative.');
        this.terminal.writeln('');
        this.terminal.writeln('Enter value for report_name: awrrpt_1_1235_1236.html');
        this.terminal.writeln('');
        this.terminal.writeln('AWR report generation in progress...');
        this.terminal.writeln('');
        
        // Create the actual report file
        const reportContent = this.generateAwrReportContent();
        this.fs.touch('/tmp/awrrpt_1_1235_1236.html', reportContent);
        
        this.terminal.writeln('Report written to awrrpt_1_1235_1236.html');
        this.terminal.writeln('');
    };

    // Generate ADDM Report in SQL*Plus
    this.generateAddmReport = function() {
        if (!oracleManager.getState('databaseStarted')) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-01034: ORACLE not available');
            return;
        }

        this.terminal.writeln('');
        this.terminal.writeln('Oracle ADDM Report Generation');
        this.terminal.writeln('==============================');
        this.terminal.writeln('');
        this.terminal.writeln('Current Instance');
        this.terminal.writeln('~~~~~~~~~~~~~~~~');
        this.terminal.writeln('   DB Id    DB Name      Inst Num Instance');
        this.terminal.writeln('----------- ------------ -------- ------------');
        this.terminal.writeln('  123456789 ORCL                1 ORCL');
        this.terminal.writeln('');
        this.terminal.writeln('Instances in this Workload Repository schema');
        this.terminal.writeln('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
        this.terminal.writeln('   DB Id     Inst Num DB Name      Instance     Host');
        this.terminal.writeln('------------ -------- ------------ ------------ ------------');
        this.terminal.writeln('* 123456789         1 ORCL         ORCL         proddb01sim');
        this.terminal.writeln('');
        this.terminal.writeln('Using 123456789 for database Id');
        this.terminal.writeln('Using          1 for instance number');
        this.terminal.writeln('');
        this.terminal.writeln('Listing the last 3 days of Completed Snapshots');
        this.terminal.writeln('                                                       Snap');
        this.terminal.writeln('Instance     DB Name        Snap Id   Snap Started    Level');
        this.terminal.writeln('------------ ------------ --------- --------------- -----');
        this.terminal.writeln('ORCL         ORCL              1234  01 Jan 2024 09:00   1');
        this.terminal.writeln('                               1235  01 Jan 2024 10:00   1');
        this.terminal.writeln('                               1236  01 Jan 2024 11:00   1');
        this.terminal.writeln('                               1237  01 Jan 2024 12:00   1');
        this.terminal.writeln('');
        this.terminal.writeln('Specify the Begin and End Snapshot Ids');
        this.terminal.writeln('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
        this.terminal.writeln('Enter value for begin_snap: 1235');
        this.terminal.writeln('Enter value for end_snap: 1236');
        this.terminal.writeln('');
        this.terminal.writeln('Specify the Report Name');
        this.terminal.writeln('~~~~~~~~~~~~~~~~~~~~~~~');
        this.terminal.writeln('The default report file name is addmrpt_1_1235_1236.txt. To use this name,');
        this.terminal.writeln('press <return> to continue, otherwise enter an alternative.');
        this.terminal.writeln('');
        this.terminal.writeln('Enter value for report_name: addmrpt_1_1235_1236.txt');
        this.terminal.writeln('');
        this.terminal.writeln('Creating ADDM task...');
        this.terminal.writeln('Running ADDM analysis...');
        this.terminal.writeln('');
        
        // Create the actual report file
        const reportContent = this.generateAddmReportContent();
        this.fs.touch('/tmp/addmrpt_1_1235_1236.txt', reportContent);
        
        this.terminal.writeln('Report written to addmrpt_1_1235_1236.txt');
        this.terminal.writeln('');
    };

    // Generate AWR Report HTML Content
    this.generateAwrReportContent = function() {
        return `<!DOCTYPE html>
<html>
<head>
    <title>Oracle AWR Report - ORCL Instance</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .header { text-align: center; margin: 20px 0; }
        .section { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>WORKLOAD REPOSITORY report for</h1>
        <h2>Database: ORCL</h2>
        <h3>Instance: ORCL</h3>
        <p>Snaps: 1235-1236</p>
        <p>Snap Time: 01-Jan-24 10:00 to 01-Jan-24 11:00 (1.00 hrs)</p>
    </div>

    <div class="section">
        <h3>Instance Efficiency Percentages</h3>
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Buffer Hit %</td><td>99.85</td></tr>
            <tr><td>Library Hit %</td><td>98.92</td></tr>
            <tr><td>Soft Parse %</td><td>95.67</td></tr>
            <tr><td>Execute to Parse %</td><td>88.34</td></tr>
            <tr><td>Latch Hit %</td><td>99.98</td></tr>
            <tr><td>Parse CPU to Parse Elapsed %</td><td>87.21</td></tr>
        </table>
    </div>

    <div class="section">
        <h3>Top 5 Timed Events</h3>
        <table>
            <tr><th>Event</th><th>Waits</th><th>Time(s)</th><th>Avg Wait(ms)</th><th>%Total Call Time</th></tr>
            <tr><td>SQL*Net message from client</td><td>12,345</td><td>7,234</td><td>586.1</td><td>65.3</td></tr>
            <tr><td>db file sequential read</td><td>45,678</td><td>1,234</td><td>27.0</td><td>11.1</td></tr>
            <tr><td>CPU time</td><td></td><td>987</td><td></td><td>8.9</td></tr>
            <tr><td>log file sync</td><td>2,345</td><td>456</td><td>194.5</td><td>4.1</td></tr>
            <tr><td>db file scattered read</td><td>8,901</td><td>234</td><td>26.3</td><td>2.1</td></tr>
        </table>
    </div>

    <div class="section">
        <h3>SQL Statistics</h3>
        <table>
            <tr><th>Statistic</th><th>Total</th><th>Per Second</th><th>Per Trans</th></tr>
            <tr><td>SQL Execute Count</td><td>156,789</td><td>43.6</td><td>12.3</td></tr>
            <tr><td>User Calls</td><td>12,345</td><td>3.4</td><td>1.0</td></tr>
            <tr><td>Parse Count (Total)</td><td>8,901</td><td>2.5</td><td>0.7</td></tr>
            <tr><td>Parse Count (Hard)</td><td>234</td><td>0.07</td><td>0.02</td></tr>
            <tr><td>Physical Reads</td><td>45,678</td><td>12.7</td><td>3.6</td></tr>
            <tr><td>Physical Writes</td><td>2,345</td><td>0.7</td><td>0.2</td></tr>
        </table>
    </div>

    <div class="section">
        <h3>Top SQL by Elapsed Time</h3>
        <table>
            <tr><th>SQL ID</th><th>Elapsed Time (s)</th><th>Executions</th><th>SQL Text</th></tr>
            <tr><td>8fq2m9yz7xkjp</td><td>456.78</td><td>12</td><td>SELECT * FROM DBA_USERS</td></tr>
            <tr><td>4gh8n2kx9mqlr</td><td>123.45</td><td>45</td><td>SELECT NAME FROM V$DATABASE</td></tr>
            <tr><td>7mp3k5vw2nxtr</td><td>78.90</td><td>8</td><td>SELECT TABLESPACE_NAME FROM DBA_TABLESPACES</td></tr>
        </table>
    </div>

    <div class="section">
        <p><i>Report generated by Oracle AWR on ${new Date().toLocaleString()}</i></p>
    </div>
</body>
</html>`;
    };

    // Generate ADDM Report Text Content
    this.generateAddmReportContent = function() {
        return `
          ADDM Report for Task 'ADDM_1235_1236'
          ----------------------------
          
Analysis Period
---------------
AWR snapshot range from 1235 to 1236.
Time period: 01-Jan-24 10:00:00 to 01-Jan-24 11:00:00 (1.00 hour)

Database Summary
----------------
Database Name:        ORCL
Database Version:     19.0.0.0.0
Instance Name:        ORCL
Host Name:           proddb01sim
Total DB Time:        52.8 minutes

Top 3 Findings Ordered by Impact
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

FINDING 1: SQL statements consuming significant database time were found.
IMPACT: 34.2 minutes of database time.

   RECOMMENDATION 1: SQL Tuning
   RATIONALE: SQL statements with high elapsed time should be tuned.
   ACTION: Consider running SQL Tuning Advisor on the following statements:
           SQL ID: 8fq2m9yz7xkjp - SELECT * FROM DBA_USERS
           SQL ID: 4gh8n2kx9mqlr - SELECT NAME FROM V$DATABASE
   
   RECOMMENDATION 2: Application Analysis
   RATIONALE: High frequency SQL statements may benefit from optimization.
   ACTION: Review application logic for unnecessary database calls.

FINDING 2: Individual database segments responsible for significant user I/O wait were found.
IMPACT: 12.1 minutes of database time.

   RECOMMENDATION 1: Segment Tuning
   RATIONALE: Hot segments should be investigated for optimization opportunities.
   ACTION: Consider partitioning or index optimization for:
           Table: SYSTEM.DBA_USERS
           Table: SYSTEM.DBA_TABLESPACES
   
   RECOMMENDATION 2: Storage Analysis
   RATIONALE: I/O bottlenecks may be reduced with better storage configuration.
   ACTION: Review storage layout and consider moving hot segments.

FINDING 3: The buffer cache was undersized, causing additional read I/O.
IMPACT: 6.7 minutes of database time.

   RECOMMENDATION 1: Memory Configuration
   RATIONALE: Increasing buffer cache can reduce physical I/O.
   ACTION: Consider increasing DB_CACHE_SIZE parameter.
   CURRENT VALUE: 256MB
   RECOMMENDED VALUE: 512MB or higher
   
   RECOMMENDATION 2: SGA Tuning
   RATIONALE: Overall SGA tuning may improve performance.
   ACTION: Review SGA_TARGET and consider enabling Automatic Memory Management.

Additional Information
~~~~~~~~~~~~~~~~~~~~~~
- No significant locking issues were detected.
- Log file sync waits are within acceptable limits.
- Network latency appears normal for client connections.
- No deadlocks were reported during the analysis period.

Summary
~~~~~~~
Total Findings: 3
Total Recommendations: 6
Estimated Performance Improvement: 25-40% reduction in response time

End of Report
Generated: ${new Date().toLocaleString()}
`;
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

        // Parse GRANT command - patterns:
        // GRANT privilege TO user
        // GRANT role TO user  
        // GRANT privilege TO role
        const grantMatch = sqlCommand.match(/grant\s+(.+?)\s+to\s+(\w+)/i);
        
        if (!grantMatch) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-00922: missing or invalid option');
            return;
        }

        const privilegeOrRole = grantMatch[1].trim().toUpperCase();
        const grantee = grantMatch[2].toUpperCase();

        // Check permissions - only SYSDBA or privileged users can grant system privileges/roles
        const systemPrivileges = ['DBA', 'CONNECT', 'RESOURCE', 'CREATE SESSION', 'CREATE TABLE', 'CREATE PROCEDURE', 'CREATE VIEW', 'CREATE TABLESPACE', 'ALTER SYSTEM'];
        const isSystemPrivilege = systemPrivileges.some(priv => privilegeOrRole.includes(priv));

        if (isSystemPrivilege && !asSysdba && currentUser !== 'SYS' && currentUser !== 'SYSTEM') {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-01031: insufficient privileges');
            return;
        }

        // Check if grantee exists (user or role)
        const granteeExists = oracleManager.userExists(grantee) || oracleManager.roleExists(grantee);
        if (!granteeExists) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln(`ORA-00942: user or role '${grantee}' does not exist`);
            return;
        }

        // Determine if we're granting a role or a privilege
        if (oracleManager.roleExists(privilegeOrRole)) {
            // Granting a role to a user
            if (oracleManager.roleExists(grantee)) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln('ORA-01924: role not granted or does not exist');
                return;
            }
            
            const result = oracleManager.grantRoleToUser(privilegeOrRole, grantee);
            if (!result.success) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln(result.error);
                return;
            }
            
            this.terminal.writeln('');
            this.terminal.writeln('Grant succeeded.');
            this.terminal.writeln('');
            return;
        } else {
            // Granting a privilege to a user or role
            if (oracleManager.roleExists(grantee)) {
                // Granting privilege to role
                const result = oracleManager.grantPrivilegeToRole(privilegeOrRole, grantee);
                if (!result.success) {
                    this.terminal.writeln('ERROR at line 1:');
                    this.terminal.writeln(result.error);
                    return;
                }
            } else {
                // Granting privilege to user (existing functionality)
                oracleManager.grantPrivilege(grantee, privilegeOrRole);
            }
            
            this.terminal.writeln('');
            this.terminal.writeln('Grant succeeded.');
            this.terminal.writeln('');
            return;
        }
    };

    // Handle REVOKE commands (enhanced for roles)  
    this.handleRevoke = function(sqlCommand, asSysdba, currentUser) {
        if (!oracleManager.getState('databaseStarted')) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-01034: ORACLE not available');
            return;
        }

        // Parse REVOKE command - patterns:
        // REVOKE privilege FROM user
        // REVOKE role FROM user
        const revokeMatch = sqlCommand.match(/revoke\s+(.+?)\s+from\s+(\w+)/i);
        
        if (!revokeMatch) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-00922: missing or invalid option');
            return;
        }

        const privilegeOrRole = revokeMatch[1].trim().toUpperCase();
        const revokee = revokeMatch[2].toUpperCase();

        // Check if revokee exists
        const revokeeExists = oracleManager.userExists(revokee) || oracleManager.roleExists(revokee);
        if (!revokeeExists) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln(`ORA-00942: user or role '${revokee}' does not exist`);
            return;
        }

        // Determine if we're revoking a role or a privilege
        if (oracleManager.roleExists(privilegeOrRole)) {
            // Revoking a role from a user
            const result = oracleManager.revokeRoleFromUser(privilegeOrRole, revokee);
            if (!result.success) {
                this.terminal.writeln('ERROR at line 1:');
                this.terminal.writeln(result.error);
                return;
            }
        } else {
            // Revoking a privilege - use existing revoke functionality
            // (This would need to be implemented in oracleManager if not already available)
            this.terminal.writeln('');
            this.terminal.writeln('Revoke succeeded.');
            this.terminal.writeln('');
            return;
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

    // Handle CREATE ROLE command
    this.handleCreateRole = function(sqlCommand, asSysdba, currentUser) {
        if (!oracleManager.getState('databaseStarted')) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-01034: ORACLE not available');
            return;
        }

        // Parse CREATE ROLE command
        // Pattern: CREATE ROLE role_name [IDENTIFIED BY password | NOT IDENTIFIED]
        const roleMatch = sqlCommand.match(/create\s+role\s+(\w+)(?:\s+identified\s+by\s+(\w+)|\s+not\s+identified)?/i);
        
        if (!roleMatch) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-00922: missing or invalid option');
            return;
        }

        const roleName = roleMatch[1].toUpperCase();
        const password = roleMatch[2]; // Optional password for role

        // Check if role already exists (roles and users share same namespace)
        if (oracleManager.userExists(roleName) || oracleManager.roleExists(roleName)) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln(`ORA-01921: role name '${roleName}' conflicts with another user or role name`);
            return;
        }

        // Create the role
        oracleManager.createRole(roleName, password);
        
        this.terminal.writeln('');
        this.terminal.writeln('Role created.');
        this.terminal.writeln('');
    };

    // Handle DROP ROLE command
    this.handleDropRole = function(sqlCommand, asSysdba, currentUser) {
        if (!oracleManager.getState('databaseStarted')) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-01034: ORACLE not available');
            return;
        }

        // Parse DROP ROLE command
        // Pattern: DROP ROLE role_name
        const roleMatch = sqlCommand.match(/drop\s+role\s+(\w+)/i);
        
        if (!roleMatch) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln('ORA-00922: missing or invalid option');
            return;
        }

        const roleName = roleMatch[1].toUpperCase();

        // Check if role exists
        if (!oracleManager.roleExists(roleName)) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln(`ORA-01919: role '${roleName}' does not exist`);
            return;
        }

        // Check for predefined roles that cannot be dropped
        const predefinedRoles = ['CONNECT', 'RESOURCE', 'DBA', 'PUBLIC'];
        if (predefinedRoles.includes(roleName)) {
            this.terminal.writeln('ERROR at line 1:');
            this.terminal.writeln(`ORA-01997: GRANT failed: '${roleName}' is a predefined role`);
            return;
        }

        // Drop the role
        oracleManager.dropRole(roleName);
        
        this.terminal.writeln('');
        this.terminal.writeln('Role dropped.');
        this.terminal.writeln('');
    };
};