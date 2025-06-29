// Oracle Listener Commands
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
                
                // Check if extproc.ora is configured
                const extprocContent = this.fs.cat('/u01/app/oracle/product/19.0.0/dbhome_1/hs/admin/extproc.ora');
                if (extprocContent && extprocContent.includes('SET EXTPROC_DLLS=')) {
                    this.terminal.writeln('Reading extproc.ora configuration...');
                }
                
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
                
                if (oracleManager.getState('databaseStarted')) {
                    this.terminal.writeln('Services Summary...');
                    this.terminal.writeln('Service "ORCL" has 1 instance(s).');
                    this.terminal.writeln('  Instance "ORCL", status READY, has 1 handler(s) for this service...');
                    this.terminal.writeln('Service "ORCLXDB" has 1 instance(s).');
                    this.terminal.writeln('  Instance "ORCL", status READY, has 1 handler(s) for this service...');
                } else {
                    this.terminal.writeln('The listener supports no services');
                }
                
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
                this.terminal.writeln('Connecting to (DESCRIPTION=(ADDRESS=(PROTOCOL=IPC)(KEY=EXTPROC1521)))');
                this.terminal.writeln('TNS-12541: TNS:no listener');
                this.terminal.writeln(' TNS-12560: TNS:protocol adapter error');
                this.terminal.writeln('  TNS-00511: No listener');
                this.terminal.writeln('   Linux Error: 2: No such file or directory');
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
                this.terminal.writeln('Service "ORCLPDB" has 1 instance(s).');
                this.terminal.writeln('  Instance "ORCL", status READY, has 1 handler(s) for this service...');
                this.terminal.writeln('    Handler(s):');
                this.terminal.writeln('      "DEDICATED" established:0 refused:0 state:ready');
                this.terminal.writeln('         LOCAL SERVER');
                this.terminal.writeln('The command completed successfully');
            } else {
                this.terminal.writeln('Connecting to (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=proddb01sim)(PORT=1521)))');
                this.terminal.writeln('The listener supports no services');
                this.terminal.writeln('The command completed successfully');
            }
            break;
            
        case 'reload':
            if (!oracleManager.getState('listenerStarted')) {
                this.terminal.writeln('TNS-01190: The user is not authorized to execute the requested listener command');
            } else {
                this.terminal.writeln('Connecting to (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=proddb01sim)(PORT=1521)))');
                this.terminal.writeln('The command completed successfully');
                
                // Check if extproc.ora has been updated
                const extprocContent = this.fs.cat('/u01/app/oracle/product/19.0.0/dbhome_1/hs/admin/extproc.ora');
                if (extprocContent && extprocContent.includes('SET EXTPROC_DLLS=')) {
                    this.terminal.writeln('Reloading external procedure configuration...');
                }
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
            this.terminal.writeln('  reload   - Reload the listener');
            this.terminal.writeln('');
            this.terminal.writeln('Usage: lsnrctl <command>');
    }
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