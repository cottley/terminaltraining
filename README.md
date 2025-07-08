# Oracle Database Training Environment

A comprehensive simulated terminal training environment for Oracle Database 19c installation and administration practice on Red Hat Enterprise Linux 9. This environment provides a realistic Linux terminal experience with a complete Oracle Database ecosystem simulation.

## Terminal Technology

This training environment is powered by **[xterm.js](https://xtermjs.org/)**, a full-featured terminal emulator library that runs in web browsers. xterm.js provides the realistic terminal experience with features like cursor navigation, text selection, command history, and keyboard shortcuts.

## Features Overview

### 🖥️ **Realistic Linux Terminal Simulation**
- Full RHEL 9 filesystem structure
- Authentic command prompt and shell behavior
- Mode-aware command history (separate for bash, SQL*Plus, RMAN)
- Tab completion for commands and file paths with directory-aware completion
- Cursor navigation with left/right arrow keys for line editing
- Text selection and automatic clipboard copying
- Pipe functionality with command chaining
- **Bash wildcard support** (`*`, `?`, `[abc]` patterns for file matching)
- Automatic .bash_profile processing on login shells
- `source` command for manual script sourcing

### 📦 **Complete Oracle Database Ecosystem**
- Oracle Database 19c Enterprise Edition simulation
- **Enhanced SQL*Plus** with comprehensive command support and datafile operations
- **Advanced database startup modes** - STARTUP, STARTUP MOUNT, STARTUP NOMOUNT with proper state transitions
- **RMAN (Recovery Manager)** with dynamic backup tracking and separate command history
- **Advanced tablespace management** - CREATE TABLESPACE with proper file size simulation
- Oracle Net Services (Listener and TNS configuration)
- Oracle Universal Installer simulation
- DBCA (Database Configuration Assistant)
- NETCA (Network Configuration Assistant)
- **Comprehensive role management system** (CREATE ROLE, DROP ROLE, GRANT role TO user)

### 🔧 **System Administration Tools**
- Package management (yum/dnf)
- Service management (systemctl)
- User and group management
- Firewall configuration (firewall-cmd)
- Kernel parameter tuning (sysctl)
- Resource limits configuration
- Environment variable management

### 📊 **Performance Monitoring & Diagnostics**
- AWR (Automatic Workload Repository) report generation
- ADDM (Automatic Database Diagnostic Monitor) analysis
- **Enhanced V$ performance views** (V$INSTANCE, V$SYSTEM_EVENT, V$SQL, V$TABLESPACE, V$SESSION)
- **Dynamic V$SESSION view** - Shows active sessions for all created database users
- **SQL*Plus performance analysis queries** with realistic wait event and SQL statistics
- **HTML Report Viewer** (lynx command for viewing AWR/ADDM reports in modal popup)
- System resource monitoring (ps, df, free, top simulation)

### 🔄 **Backup & Recovery Tools**
- **Dynamic RMAN backup tracking** - User-created backups appear in LIST BACKUP
- **Comprehensive backup scenarios** (full, incremental, compressed)
- **Complete restore procedures** - Practice shutdown, mount, restore, recover workflows
- **RESTORE DATABASE command** - Full database restoration from backup with realistic Oracle output
- **RECOVER DATABASE command** - Archive log application and media recovery simulation
- **ALTER DATABASE OPEN RESETLOGS** - Post-recovery database opening with proper validation
- **Point-in-time recovery simulation** with UNTIL TIME syntax
- Database validation and recovery testing
- Export/Import utilities (expdp/impdp)
- Archive log management
- **Flashback restore points** (create, list, and drop restore points)
- **Persistent backup history** across sessions with realistic metadata

### 🛡️ **Security & Patch Management**
- OPatch utility for Oracle patch management
- User authentication and authorization
- **Role-based access control and privilege management**
- Security policy configuration
- Oracle security best practices simulation

### 🗺️ **Spatial Extensions Support**
- ArcGIS Server installation simulation
- **Consistent library paths** - EXTPROC and OCP instructions use `/opt/arcgis/server/lib/libsde.so`
- ArcSDE library integration with proper virtual file system integration
- Oracle spatial functions via EXTPROC
- SDE schema setup for geodatabase support

### 📋 **Progress Tracking & Learning Support**
- **OCP (Oracle Certified Professional) Progress Tracker**
  - Real-time installation progress monitoring
  - Task-by-task completion tracking
  - Detailed hints and guidance system
  - **Enhanced troubleshooting scenarios** with `troubleshoot` command
  - **SQL permissions troubleshooting** (`troubleshoot sqlpermissions`)
  - Practice scenarios for skill development including complete backup & recovery workflows

### 🎮 **Interactive Features**
- Built-in tic-tac-toe game for breaks
- Interactive learning scenarios
- Error simulation for troubleshooting practice
- Gamified completion tracking

## Core Commands

### File System Operations
```bash
ls [-l] [-a] [-h] [-la] [-lh] [-lah] # List directory contents
cd <directory>        # Change directory
pwd                   # Print working directory
mkdir [-p] <dir>      # Create directories
touch <file>          # Create/update files
rm [-r] [-f] <file>   # Remove files/directories
cp [-r] [-i] <src> <dest>  # Copy files/directories
mv [-i] <src> <dest>  # Move/rename files/directories
chmod [-R] <mode> <file>  # Change file permissions
chown [-R] <owner>[:<group>] <file>  # Change file ownership
cat <file>            # Display file contents
echo [-e] <text>      # Display text (-e enables escape sequences)
lynx <file.html>      # View HTML files in modal viewer (Press ESC to close)
vim/vi/nano <file>    # Edit files (modal editor)
find <path> [options] # Search for files and directories

# Bash Wildcard Support
ls -la *              # List all files and directories with details
ls *.txt              # List all text files
ls file?.log          # List files like file1.log, filea.log, etc.
ls [abc]*             # List files starting with a, b, or c
chown oracle:oinstall *  # Change ownership of all files in current directory
chmod 755 *.sh        # Make all shell scripts executable
rm *.tmp              # Remove all temporary files
cat *.conf            # Display all configuration files
find /u01 -name "*.dbf"  # Find all database files

# Wildcard patterns supported:
# *     - matches any sequence of characters
# ?     - matches any single character
# [abc] - matches any character in the brackets
# [!abc] or [^abc] - matches any character NOT in the brackets

# Output redirection
command > file        # Redirect output to file
command >> file       # Append output to file  
command > /dev/null   # Discard output (no terminal output)

# Echo with escape sequences
echo -e "Hello\nWorld"     # Output: Hello (newline) World
echo -e "Name:\tOracle"    # Output: Name: (tab) Oracle  
echo -e "Path:\\bin"       # Output: Path:\bin
echo -e "Done\n"           # Output: Done (with trailing newline)
```

### Shell Scripting
```bash
# Create executable shell scripts
touch script.sh                    # Create script file
chmod +x script.sh                 # Make executable
./script.sh                        # Execute script

# Script requirements:
# - Must have execute permissions (chmod +x)
# - First line must be #!/bin/sh or #!/bin/bash
# - Commands are executed line by line
# - Empty lines and comments (#) are ignored

# Example script content:
#!/bin/bash
echo "Starting Oracle installation check"
echo -e "Database:\t$ORACLE_SID"
echo -e "Home:\t\t$ORACLE_HOME"
pwd
ls -la /u01/app/oracle
echo -e "Installation check complete\n"
```

### System Information
```bash
hostname              # Display system hostname
uname [-a]            # System information
date                  # Current date/time
df                    # Disk space usage
free                  # Memory usage
ps                    # Process list
whoami                # Current user
id [user]             # User/group information
reboot                # Restart system (preserves /root files)
```

### Package & Service Management
```bash
# Package Management
yum install <pkg>     # Install packages
yum update            # Update packages
yum list installed    # List installed packages

# Service Management (Traditional SysV style)
service <name> start      # Start a service
service <name> stop       # Stop a service
service <name> restart    # Restart a service
service <name> status     # Check service status
service <name> enable     # Enable service for auto-start
service <name> disable    # Disable service auto-start

# Systemd Service Management
systemctl <action>        # Modern systemd service control
firewall-cmd              # Firewall configuration

# Available Services
# System services: firewalld, sshd, chronyd, httpd
# Oracle services: oracle-db, oracle-listener
```

### User & Group Management
```bash
useradd <user>        # Add user
groupadd <group>      # Add group
passwd <user>         # Set password
su [-] <user>         # Switch user
```

### Environment Management
```bash
set                   # Display variables
export VAR=value      # Set environment variable
env                   # Display environment
env | grep <pattern>  # Filter environment variables

# .bash_profile Support
source ~/.bash_profile      # Manually reload profile settings
source <filename>           # Source any bash script
# Note: .bash_profile is automatically applied on login shells (su - user)
```

### Oracle Database Commands
```bash
# Installation & Setup
runInstaller          # Oracle software installation
dbca                  # Database creation
netca                 # Network configuration
./root.sh             # Post-installation scripts

# Database Operations
sqlplus               # SQL*Plus interface
startup               # Start database (NOMOUNT -> MOUNT -> OPEN)
startup mount         # Start database in MOUNT mode
startup nomount       # Start database in NOMOUNT mode
shutdown [immediate]  # Shutdown database
lsnrctl start/stop    # Listener control
tnsping <service>     # Network connectivity test

# Backup & Recovery
rman                  # Recovery Manager
expdp/impdp          # Data Pump utilities
adrci                # Automatic Diagnostic Repository

# Performance & Monitoring
awrrpt               # AWR report generation
addmrpt              # ADDM analysis
opatch               # Patch management
```

### Troubleshooting Commands
```bash
# Comprehensive troubleshooting help
troubleshoot                    # Show all available troubleshooting topics
troubleshoot startup            # Database startup issues
troubleshoot listener           # Listener connection problems
troubleshoot tablespace         # Tablespace full errors
troubleshoot performance        # Slow query performance
troubleshoot sqlpermissions     # SQL user permissions and grants
troubleshoot backup             # Backup and recovery issues
troubleshoot network            # TNS and connectivity problems
troubleshoot memory             # Out of memory errors
troubleshoot disk               # Disk space problems
troubleshoot permissions        # File permission issues
troubleshoot environment        # Environment variable problems
```

### RMAN Backup & Recovery Commands
```bash
# Connect to RMAN
rman target /                           # Connect to local database

# Backup Commands (with dynamic tracking)
BACKUP DATABASE;                        # Full database backup
BACKUP INCREMENTAL LEVEL 0 DATABASE;   # Level 0 incremental backup
BACKUP INCREMENTAL LEVEL 1 DATABASE;   # Level 1 incremental backup
BACKUP AS COMPRESSED BACKUPSET DATABASE; # Compressed backup
BACKUP TABLESPACE users;                # Tablespace backup
BACKUP ARCHIVELOG ALL;                  # Archive log backup

# Backup Management (shows user-created backups)
LIST BACKUP;                            # List all backup sets
LIST BACKUP BY FILE;                    # List backups by file
VALIDATE BACKUPSET;                     # Validate backup integrity
VALIDATE DATABASE;                      # Validate database files

# Restore & Recovery Commands
SHUTDOWN IMMEDIATE;                     # Shutdown for restore
STARTUP MOUNT;                          # Mount database for restore
RESTORE DATABASE;                       # Restore database from backup
RECOVER DATABASE;                       # Apply redo logs for recovery
ALTER DATABASE OPEN;                    # Open database after recovery
ALTER DATABASE OPEN RESETLOGS;          # Open with resetlogs after incomplete recovery

# Point-in-Time Recovery
SET UNTIL TIME = "TO_DATE('2024-01-01 10:00:00', 'YYYY-MM-DD HH24:MI:SS')";
RESTORE DATABASE UNTIL TIME "TO_DATE('2024-01-01 10:00:00', 'YYYY-MM-DD HH24:MI:SS')";
RECOVER DATABASE UNTIL TIME "TO_DATE('2024-01-01 10:00:00', 'YYYY-MM-DD HH24:MI:SS')";

# Flashback Restore Points
CREATE RESTORE POINT before_upgrade;    # Create restore point
LIST RESTORE POINT ALL;                 # List all restore points
DROP RESTORE POINT before_upgrade;      # Drop restore point
```

### SQL*Plus Database Recovery Commands
```sql
-- SQL*Plus Database Control Commands (SYSDBA required)
-- Note: These commands are executed within SQL*Plus after connecting as SYSDBA

-- Database Startup Modes
STARTUP;                                # Full startup (NOMOUNT -> MOUNT -> OPEN)
STARTUP MOUNT;                          # Start and mount database (for recovery)
STARTUP NOMOUNT;                        # Start instance only (no database mount)
SHUTDOWN IMMEDIATE;                     # Shutdown database immediately

-- Database State Transitions
ALTER DATABASE MOUNT;                   # Mount database from NOMOUNT state
ALTER DATABASE OPEN;                    # Open database from MOUNT state
ALTER DATABASE OPEN RESETLOGS;          # Open with resetlogs after recovery

-- Database Recovery Commands
RESTORE DATABASE;                       # Restore database from backup
RECOVER DATABASE;                       # Apply archive logs for recovery

-- Database Status Queries
SELECT NAME, OPEN_MODE FROM V$DATABASE; # Check database state
SELECT INSTANCE_NAME, STATUS FROM V$INSTANCE; # Check instance status

-- Example Complete Recovery Workflow:
-- 1. SHUTDOWN IMMEDIATE;
-- 2. STARTUP MOUNT;
-- 3. RESTORE DATABASE;
-- 4. RECOVER DATABASE;
-- 5. ALTER DATABASE OPEN RESETLOGS;
```

### Oracle Datafile Operations
```sql
-- SQL*Plus Datafile Management Commands
-- Note: These commands work within SQL*Plus after connecting as SYSDBA

-- Add Datafiles to Tablespaces
ALTER TABLESPACE USERS ADD DATAFILE 'users02.dbf' SIZE 100M;
ALTER TABLESPACE USERS ADD DATAFILE '/u01/app/oracle/oradata/ORCL/users03.dbf' 
  SIZE 500M AUTOEXTEND ON NEXT 50M MAXSIZE 2G;
ALTER TABLESPACE SYSTEM ADD DATAFILE 'system02.dbf' 
  SIZE 1G AUTOEXTEND ON NEXT 100M MAXSIZE UNLIMITED;

-- Resize Existing Datafiles
ALTER DATABASE DATAFILE 'users01.dbf' RESIZE 200M;
ALTER DATABASE DATAFILE '/u01/app/oracle/oradata/ORCL/system01.dbf' RESIZE 1G;
ALTER DATABASE DATAFILE 'sysaux01.dbf' RESIZE 800M;

-- Configure Autoextend Settings
ALTER DATABASE DATAFILE 'users01.dbf' AUTOEXTEND ON NEXT 10M MAXSIZE 2G;
ALTER DATABASE DATAFILE 'temp01.dbf' AUTOEXTEND ON NEXT 50M MAXSIZE UNLIMITED;
ALTER DATABASE DATAFILE 'undotbs01.dbf' AUTOEXTEND OFF;

-- Advanced Datafile Operations
ALTER DATABASE DATAFILE 'users02.dbf' 
  AUTOEXTEND ON NEXT 25M MAXSIZE 1G;

-- Tablespace Management
CREATE TABLESPACE users2 DATAFILE '/u01/app/oracle/oradata/ORCL/users02.dbf' SIZE 100M;
CREATE TABLESPACE temp2 DATAFILE '/u01/app/oracle/oradata/ORCL/temp02.dbf' SIZE 50M AUTOEXTEND ON NEXT 10M;
CREATE TABLESPACE app_data DATAFILE '/u01/app/oracle/oradata/ORCL/app_data01.dbf' SIZE 200M AUTOEXTEND ON NEXT 50M MAXSIZE 2G;

-- Query Database Information
SELECT NAME FROM V$DATABASE;                    -- Database name
SELECT TABLESPACE_NAME FROM DBA_TABLESPACES;    -- Available tablespaces (includes created ones)
SELECT USERNAME FROM DBA_USERS;                 -- Database user names only
SELECT * FROM DBA_USERS;                       -- Complete user information

-- Features:
-- • Creates actual .dbf files in the virtual filesystem with correct sizes
-- • CREATE TABLESPACE with proper size simulation in virtual filesystem
-- • Supports relative and absolute paths
-- • Validates tablespace existence and prevents duplicates
-- • Realistic Oracle error messages (ORA-00959, ORA-01119, etc.)
-- • Proper file ownership and permissions (oracle:oinstall)
-- • Size calculations with K/M/G units
-- • Autoextend metadata storage
-- • Dynamic DBA_TABLESPACES view updates
```

### Oracle Performance Monitoring Views
```sql
-- SQL*Plus Performance Monitoring Queries
-- Note: These views simulate real Oracle V$ performance views for training

-- Instance Information
SELECT * FROM V$INSTANCE;                       -- Complete instance details
SELECT INSTANCE_NAME, STATUS FROM V$INSTANCE;   -- Basic instance status (STARTED/MOUNTED/OPEN)
SELECT NAME, OPEN_MODE FROM V$DATABASE;         -- Database state (MOUNTED/READ WRITE)

-- System Wait Events Analysis
SELECT * FROM V$SYSTEM_EVENT;                   -- All system wait events
SELECT EVENT, TIME_WAITED, TOTAL_WAITS, AVERAGE_WAIT 
  FROM V$SYSTEM_EVENT 
  ORDER BY TIME_WAITED DESC;                    -- Top wait events by time

-- SQL Performance Analysis  
SELECT * FROM V$SQL;                            -- SQL statements in library cache
SELECT SQL_TEXT, EXECUTIONS, ELAPSED_TIME, CPU_TIME 
  FROM V$SQL 
  ORDER BY EXECUTIONS DESC;                     -- Top SQL by executions

-- Tablespace Information
SELECT * FROM V$TABLESPACE;                     -- Tablespace metadata
SELECT TABLESPACE_NAME FROM V$TABLESPACE;       -- Tablespace names only

-- Session Information (Enhanced)
SELECT * FROM V$SESSION;                        -- Complete session details with all created users
SELECT SID, USERNAME, STATUS, PROGRAM FROM V$SESSION;  -- Basic session information
SELECT SID, USERNAME, STATUS FROM V$SESSION WHERE USERNAME IS NOT NULL;  -- Active user sessions

-- Performance Monitoring Scenarios
-- Check database performance
SELECT EVENT, TIME_WAITED, TOTAL_WAITS 
  FROM V$SYSTEM_EVENT 
  WHERE EVENT LIKE '%file%' 
  ORDER BY TIME_WAITED DESC;

-- Find resource-intensive SQL
SELECT SQL_TEXT, EXECUTIONS, BUFFER_GETS, DISK_READS 
  FROM V$SQL 
  WHERE EXECUTIONS > 10 
  ORDER BY BUFFER_GETS DESC;

-- Monitor instance health
SELECT INSTANCE_NAME, STATUS, STARTUP_TIME, HOST_NAME 
  FROM V$INSTANCE;

-- Features:
-- • Realistic Oracle V$ view formatting and data
-- • Dynamic tablespace integration with simulation state
-- • Authentic wait event statistics and SQL performance metrics
-- • Case-insensitive query support (V$SQL and v$sql both work)
-- • Common DBA query patterns and performance analysis scenarios
-- • Real-world Oracle performance monitoring experience
```

### Oracle AWR and ADDM Reports
```bash
# Command Line Report Generation
awrrpt                                   # Generate AWR report (HTML format)
addmrpt                                  # Generate ADDM report (Text format)

# SQL*Plus Report Generation  
sqlplus / as sysdba
SQL> @awrrpt.sql                         # Execute AWR report script
SQL> @addmrpt.sql                        # Execute ADDM report script
SQL> @$ORACLE_HOME/rdbms/admin/awrrpt.sql  # Full path to AWR script
SQL> @/u01/app/oracle/product/19.0.0/dbhome_1/rdbms/admin/addmrpt.sql  # Full path to ADDM script

# AWR Report Features
-- • Automatic snapshot selection with realistic data
-- • Instance efficiency percentages (Buffer Hit %, Library Hit %, etc.)
-- • Top 5 timed events analysis with wait statistics
-- • SQL performance statistics and execution metrics
-- • Top SQL statements by elapsed time with SQL IDs
-- • Generates actual HTML report file: awrrpt_1_1235_1236.html

# ADDM Report Features  
-- • Automated performance analysis and recommendations
-- • Database time impact analysis (minutes of DB time)
-- • SQL tuning recommendations with specific SQL IDs
-- • Memory and storage configuration suggestions
-- • Segment tuning and I/O optimization advice
-- • Generates actual text report file: addmrpt_1_1235_1236.txt

# Report Workflow Example
awrrpt                                   # Generates /tmp/awrrpt_1_1235_1236.html
addmrpt                                  # Generates /tmp/addmrpt_1_1235_1236.txt
cat /tmp/awrrpt_1_1235_1236.html        # View AWR report content (raw HTML)
cat /tmp/addmrpt_1_1235_1236.txt        # View ADDM recommendations
lynx /tmp/awrrpt_1_1235_1236.html       # View AWR report in HTML viewer (modal)

# Oracle Admin Directory Structure
ls $ORACLE_HOME/rdbms/admin/             # Lists admin scripts including:
                                         # awrrpt.sql - AWR report script
                                         # addmrpt.sql - ADDM report script

# Features:
-- • Complete AWR and ADDM simulation with realistic Oracle output
-- • Actual script files created in $ORACLE_HOME/rdbms/admin/ during installation
-- • Professional HTML and text report generation with authentic formatting
-- • Integration with V$ performance views for consistent data
-- • Multiple access methods: command line tools and SQL*Plus scripts
-- • Realistic snapshot data and performance analysis recommendations
```

### HTML Report Viewing
```bash
# Lynx HTML Viewer - View HTML reports in modal popup
lynx <file.html>                         # Open HTML file in modal viewer
lynx /tmp/awrrpt_1_1235_1236.html        # View AWR report with proper HTML rendering
lynx $ORACLE_HOME/reports/report.html    # View any HTML file (supports environment variables)

# Lynx Viewer Features
-- • Full HTML rendering with proper styling (tables, headings, code blocks)
-- • Modal popup interface (90% screen coverage)
-- • Press ESC key to close viewer and return to terminal
-- • Click outside modal to close
-- • Styled content with professional formatting:
--   - Tables with borders and headers
--   - Syntax highlighted code blocks
--   - Proper typography for headings and text
--   - Oracle report-specific styling
-- • File validation (checks for .html/.htm extensions)
-- • Environment variable expansion support
-- • Focus management (returns focus to terminal after closing)

# Usage Examples
awrrpt                                   # Generate AWR HTML report
lynx /tmp/awrrpt_1_1235_1236.html        # View the generated report
addmrpt                                  # Generate ADDM text report (use cat to view)
cat /tmp/addmrpt_1_1235_1236.txt         # View ADDM text report

# Error Handling
lynx nonexistent.html                    # Shows "No such file or directory"
lynx textfile.txt                        # Shows "Not an HTML file"
lynx                                     # Shows usage information

# Features:
-- • Professional HTML report viewing experience
-- • Perfect for Oracle AWR/ADDM report analysis
-- • Modal interface doesn't interrupt terminal workflow
-- • Keyboard-friendly (ESC to close)
-- • Supports all standard HTML elements and styling
-- • Optimized for Oracle performance reports and documentation
```

### Oracle Role Management
```sql
-- SQL*Plus Role Management Commands
-- Note: These commands work within SQL*Plus after connecting as SYSDBA or DBA

-- Create Roles
CREATE ROLE app_user;                           -- Create basic role
CREATE ROLE app_admin IDENTIFIED BY password;   -- Create password-protected role
CREATE ROLE reporting_role NOT IDENTIFIED;     -- Create role without password

-- Drop Roles
DROP ROLE app_user;                             -- Drop custom role
-- Note: Cannot drop predefined roles (CONNECT, RESOURCE, DBA, PUBLIC)

-- Grant Privileges to Roles
GRANT CREATE SESSION TO app_user;               -- Grant system privilege to role
GRANT SELECT ON employees TO reporting_role;    -- Grant object privilege to role
GRANT CREATE TABLE, CREATE VIEW TO app_admin;   -- Grant multiple privileges

-- Grant Roles to Users
GRANT app_user TO scott;                        -- Grant role to user
GRANT app_admin TO hr_manager;                  -- Grant admin role to user
GRANT CONNECT, RESOURCE TO new_user;            -- Grant predefined roles

-- Revoke Roles from Users
REVOKE app_user FROM scott;                     -- Revoke role from user
REVOKE CONNECT FROM expired_user;               -- Revoke system role

-- Query Role and User Information
SELECT * FROM DBA_ROLES;                       -- List all roles in database
SELECT * FROM USER_ROLE_PRIVS;                 -- Show roles granted to current user
SELECT * FROM ROLE_TAB_PRIVS;                  -- Show table privileges granted to roles
SELECT * FROM DBA_USERS;                       -- List all database users with details
SELECT USERNAME FROM DBA_USERS;                -- List user names only

-- Example Workflow: Create Application Role
CREATE ROLE sales_role;
GRANT CREATE SESSION TO sales_role;
GRANT SELECT, INSERT, UPDATE ON sales_data TO sales_role;
GRANT sales_role TO sales_user1;
GRANT sales_role TO sales_user2;

-- Features:
-- • Complete role lifecycle management (create, grant, revoke, drop)
-- • Support for password-protected roles
-- • Integration with existing user and privilege system
-- • Realistic Oracle error messages and validation
-- • Role hierarchy and inheritance support
-- • Comprehensive role query views (DBA_ROLES, USER_ROLE_PRIVS, ROLE_TAB_PRIVS)
```

### Oracle Flashback Restore Points
```sql
-- SQL*Plus Flashback Restore Point Management
-- Note: These commands work within SQL*Plus after connecting as SYSDBA

-- Create Restore Points
CREATE RESTORE POINT before_upgrade;                 -- Create normal restore point
CREATE RESTORE POINT critical_point GUARANTEE FLASHBACK DATABASE;  -- Create guaranteed restore point

-- Query Restore Points
SELECT * FROM V$RESTORE_POINT;                       -- View all restore point details
SELECT NAME, TIME, GUARANTEE_, SCN FROM V$RESTORE_POINT;  -- View basic restore point info
SELECT NAME FROM V$RESTORE_POINT;                    -- List restore point names only

-- Drop Restore Points
DROP RESTORE POINT before_upgrade;                   -- Drop specific restore point
DROP RESTORE POINT critical_point;                   -- Drop guaranteed restore point

-- Example Workflow: Database Maintenance
CREATE RESTORE POINT before_patch;                   -- Create restore point before patching
-- ... perform database maintenance ...
SELECT * FROM V$RESTORE_POINT;                       -- Verify restore point exists
-- ... if maintenance successful ...
DROP RESTORE POINT before_patch;                     -- Clean up restore point

-- Example: Critical Operations
CREATE RESTORE POINT major_upgrade GUARANTEE FLASHBACK DATABASE;  -- Guaranteed point for major changes
-- ... perform critical operations ...
SELECT NAME, TIME, GUARANTEE_ FROM V$RESTORE_POINT;   -- Check restore point status
-- ... if operations successful ...
DROP RESTORE POINT major_upgrade;                    -- Remove guarantee restore point

-- Query Examples
-- List all restore points with timestamps
SELECT NAME, TIME, GUARANTEE_, SCN FROM V$RESTORE_POINT ORDER BY TIME;

-- Check for guaranteed restore points
SELECT NAME, GUARANTEE_, STORAGE_SIZE FROM V$RESTORE_POINT WHERE GUARANTEE_ = 'YES';

-- Count restore points
SELECT COUNT(*) as RESTORE_POINT_COUNT FROM V$RESTORE_POINT;

-- Features:
-- • Create normal and guaranteed restore points
-- • Automatic SCN (System Change Number) generation with realistic values
-- • Persistent storage across SQL*Plus sessions
-- • Realistic Oracle error messages (ORA-38778, ORA-38779, ORA-38780, ORA-38781)
-- • Duplicate name validation and prevention
-- • Proper timestamp formatting (YYYY-MM-DD HH24:MI:SS)
-- • Support for V$RESTORE_POINT queries with multiple output formats
-- • Integration with Oracle flashback database simulation
-- • Realistic guarantee flag and storage size tracking
-- • Case-insensitive restore point names (automatically converted to uppercase)
```

### Advanced Pipeline Operations
```bash
# Text Processing
cat file | grep pattern      # Search in file
ps aux | grep oracle        # Filter processes
env | grep -i oracle        # Filter environment
cat file | head -10         # First 10 lines
cat file | tail -20         # Last 20 lines
cat file | sort             # Sort content
cat file | uniq             # Remove duplicates
cat file | wc -l            # Count lines
```

### File Search Operations
```bash
# Basic find operations
find                          # List all files and directories from current location
find /etc                     # Find all items in /etc directory
find . -maxdepth 2           # Limit search to 2 directory levels deep
find /usr /var /opt          # Search multiple directories

# Search by name (supports wildcards * and ?)
find . -name "*.conf"         # Find files ending with .conf
find /etc -name "*oracle*"    # Find files with 'oracle' in the name
find . -name "script.sh"      # Find exact filename match
find . -iname "*.LOG"         # Case-insensitive search (matches .log, .Log, .LOG)

# Search by type
find /var -type f             # Find only files
find /usr -type d             # Find only directories  
find /etc -type l             # Find only symbolic links
find . -type f -name "*.sh"   # Find shell script files only

# Combined search options
find /u01 -type f -name "*oracle*" -maxdepth 3    # Find Oracle files, max 3 levels deep
find . -type d -iname "*log*" -maxdepth 2         # Find log directories, case-insensitive

# Execute commands on found items
find . -name "*.log" -exec ls -l {} \;            # Execute 'ls -l' on each found .log file
find /tmp -type f -name "*.tmp" -exec rm {} \;    # Delete all .tmp files in /tmp
find . -type f -name "*.sh" -exec chmod +x {} \;  # Make all .sh files executable

# Oracle-specific examples
find /u01/app/oracle -name "*.ora"                # Find Oracle configuration files
find /u01 -type f -name "sqlplus"                 # Find SQL*Plus executable
find /etc -name "*oracle*" -type f                # Find Oracle system configuration files
find . -name "*.dbf" -exec ls -lh {} \;          # Find database files with size info
find /u01/app/oracle -type d -name "*admin*"      # Find Oracle admin directories
```

### File Management Operations
```bash
# Directory Listing
ls                               # List files and directories
ls -l                            # Long format listing
ls -h                            # Human-readable file sizes (requires -l)
ls -a                            # Show all files (including hidden)
ls -la                           # Long format with all files
ls -lh                           # Long format with human-readable sizes
ls -lah                          # Long format, all files, human-readable sizes
ls -al                           # Same as -la (flags can be combined in any order)

# Copy Operations
cp file1.txt file2.txt           # Copy file to new name
cp file1.txt /root/              # Copy file to directory
cp -r dir1 dir2                  # Copy directory recursively
cp -i file1.txt file2.txt        # Interactive copy (prompts before overwrite)
cp -ri source_dir dest_dir       # Interactive recursive copy

# Examples with confirmation prompts
cp -i /etc/hosts /root/hosts     # Prompts: "cp: overwrite '/root/hosts'? (y/n)"
cp -i *.txt /root/               # Prompts for each existing file

# Move/Rename Operations
mv file1.txt file2.txt           # Rename file1.txt to file2.txt
mv file1.txt /root/              # Move file1.txt to /root directory
mv dir1 dir2                     # Rename directory dir1 to dir2
mv old_name new_name             # Rename files or directories
mv -i file1.txt file2.txt        # Interactive move (prompts before overwrite)

# Examples with confirmation prompts
mv -i script.sh script_old.sh    # Prompts: "mv: overwrite 'script_old.sh'? (y/n)"
mv -i *.log /root/logs/          # Prompts for each existing file in destination

# Permission Management
chmod 755 script.sh             # Make script executable (rwxr-xr-x)
chmod 644 config.txt            # Standard file permissions (rw-r--r--)
chmod 600 private.key           # Private file (rw-------)
chmod u+x program               # Add execute permission for owner
chmod g-w file.txt              # Remove write permission for group
chmod o=r public.txt            # Set others to read-only
chmod a+r shared.txt            # Add read permission for all
chmod -R 755 /root/scripts/     # Recursive permission change

# Common Oracle file permissions
chmod 640 /u01/app/oracle/oradata/ORCL/*.dbf    # Database files
chmod 755 /u01/app/oracle/product/19.0.0/dbhome_1/bin/*  # Oracle binaries
chmod 600 /root/.oracle_profile  # Private configuration

# Ownership Management
chown oracle script.sh                  # Change owner to oracle
chown oracle:oinstall file.txt          # Change owner and group
chown :dba database.dbf                 # Change group only (owner unchanged)
chown 1000:1000 file.txt                # Use numeric UID/GID
chown -R oracle:oinstall /u01/          # Recursive ownership change

# Common Oracle ownership patterns
chown -R oracle:oinstall /u01/app/oracle/         # Oracle software ownership
chown oracle:dba /u01/app/oracle/oradata/ORCL/*.dbf  # Database file ownership
chown oracle:oinstall /u01/app/oracle/admin/       # Admin directory ownership
chown root:oinstall /etc/oratab                    # System Oracle configuration

# Oracle automation scripts
# Example Oracle installation check script:
#!/bin/bash
echo "=== Oracle Installation Check ==="
echo "Checking Oracle user and groups..."
id oracle
echo "Checking Oracle directories..."
ls -la /u01/app/oracle/product/19.0.0/dbhome_1/bin/
echo "Checking database processes..."
ps aux | grep oracle
echo "Checking listener status..."
lsnrctl status

# Examples using /dev/null for silent operations:
ls -la /u01/app/oracle > /dev/null 2>&1   # Check if directory exists silently
systemctl status oracle-db > /dev/null    # Check service status without output
yum list installed | grep oracle > /dev/null  # Check if Oracle packages installed
```

### Oracle Troubleshooting Guide
```bash
# Interactive Troubleshooting System
troubleshoot                     # Show all available troubleshooting topics
oracle-troubleshoot              # Same as above

# Common Database Issues
troubleshoot startup             # Database won't start (ORA-01034)
troubleshoot listener            # Listener connection issues (TNS errors)
troubleshoot tablespace          # Tablespace full errors (ORA-01653)
troubleshoot performance         # Slow query performance
troubleshoot archive             # Archive log issues (ORA-00257)
troubleshoot network             # TNS and connectivity problems

# System Issues  
troubleshoot memory              # Out of memory errors (ORA-04031)
troubleshoot disk                # Disk space problems
troubleshoot permissions         # File permission issues
troubleshoot environment         # Environment variable problems

# Installation Issues
troubleshoot installation        # Installation failures
troubleshoot prerequisites       # Missing prerequisites
troubleshoot patches             # Patch application issues
```

## Oracle Installation Progress Tracking

### OCP Progress Commands
```bash
ocp                          # Show installation progress
ocp --hint                   # Get next task hint
ocp --hint-detail           # Detailed commands and explanation
ocp --scenarios             # Practice scenarios
ocp --simulate <scenario>   # Run practice scenarios
```

### Installation Tasks Tracked
1. **Prerequisites Setup**
   - Oracle groups creation (oinstall, dba, etc.)
   - Oracle user creation
   - Required packages installation
   - Kernel parameters configuration
   - Resource limits setup
   - Firewall port 1521 opening

2. **Oracle Software Installation**
   - Software extraction and installation
   - Root script execution
   - Environment configuration

3. **Database Creation & Network**
   - Database creation with DBCA
   - Listener configuration
   - Database and listener startup
   - Auto-start configuration (/etc/oratab)

4. **Spatial Extensions**
   - ArcGIS Server installation
   - SDE user and library setup
   - EXTPROC configuration for spatial functions

### Practice Scenarios
- **Performance Troubleshooting**: AWR analysis, session monitoring, SGA tuning
- **Backup & Recovery**: Complete 4-phase workflows (assessment, restore, point-in-time recovery, verification)
- **Security Configuration**: User management, auditing, role-based access, SQL permissions
- **Network Troubleshooting**: Listener issues, TNS configuration, connectivity
- **Storage Management**: Tablespace administration, space optimization
- **Troubleshooting Help**: `troubleshoot sqlpermissions` for SQL permission issues

## Spatial Database Features

The environment includes comprehensive spatial database capabilities:

### ArcGIS Server Integration
```bash
# Create spatial user
useradd -u 54330 -g oinstall -G dba arcgis
passwd arcgis

# Install ArcGIS Server
su - arcgis
cd /install
./ArcGIS_Server_Setup

# Configure spatial in Oracle
sqlplus / as sysdba
CREATE USER sde IDENTIFIED BY sde;
GRANT CONNECT, RESOURCE TO sde;
CREATE OR REPLACE LIBRARY sde_util AS '/opt/arcgis/server/lib/libsde.so';
```

### Spatial Function Testing
- SDE library integration with Oracle EXTPROC
- Spatial data engine configuration
- Geodatabase schema support
- Spatial query capabilities

## File System Structure

The simulation includes a complete RHEL 9 filesystem:
- `/bin`, `/sbin` - System binaries
- `/etc` - Configuration files (passwd, group, hosts, etc.)
- `/etc/systemd/system/` - Custom systemd service files
- `/usr/lib/systemd/system/` - System-provided systemd service files
- `/home` - User directories
- `/u01` - Oracle software directory
- `/install` - Installation files (Oracle, ArcGIS)
- `/opt` - Optional software packages
- Standard Linux directory tree

### Systemd Service Files

The environment includes realistic systemd service definitions:

**System Services** (`/etc/systemd/system/`):
- `firewalld.service` - Dynamic firewall daemon
- `sshd.service` - OpenSSH server daemon
- `chronyd.service` - NTP client/server
- `httpd.service` - Apache HTTP Server

**Oracle Services** (`/etc/systemd/system/`):
- `oracle-db.service` - Oracle Database service
- `oracle-listener.service` - Oracle Net Listener service

**System Targets** (`/usr/lib/systemd/system/`):
- `basic.target` - Basic system initialization
- `multi-user.target` - Multi-user system mode
- `network.target` - Network availability target
- `sysinit.target` - System initialization target

Service states persist across sessions and can be managed with the `service` command.

## Advanced Shell Features

### Bash Wildcard and Pattern Matching
The terminal environment supports comprehensive bash-style wildcard expansion:

**Wildcard Patterns:**
- `*` - Matches any sequence of characters (including none)
- `?` - Matches exactly one character  
- `[abc]` - Matches any single character from the set (a, b, or c)
- `[!abc]` or `[^abc]` - Matches any single character NOT in the set
- `[a-z]` - Matches any character in the range a through z

**Common Use Cases:**
```bash
# File management with wildcards
ls *.dbf                          # List all database files
chown oracle:oinstall *.log       # Change ownership of all log files
chmod 644 /etc/*.conf             # Set permissions on all config files
rm /tmp/*                         # Remove all files in /tmp directory
cp *.txt /backup/                 # Copy all text files to backup

# Pattern matching examples
ls file?.txt                      # Matches file1.txt, filea.txt, etc.
ls [abc]*.log                     # Matches files starting with a, b, or c
ls log[0-9][0-9]                  # Matches log01, log02, ..., log99
ls *[!~]                          # Matches files NOT ending with ~

# Oracle-specific examples
ls /u01/app/oracle/oradata/ORCL/*.dbf    # List all datafiles
chmod 640 /u01/app/oracle/admin/*/bdump/*.trc    # Set permissions on trace files
chown oracle:dba $ORACLE_HOME/bin/oracle*        # Change ownership of Oracle binaries
```

**Advanced Features:**
- Wildcards work with absolute and relative paths
- Pattern expansion occurs before command execution (standard bash behavior)
- If no matches found, the original pattern is passed to the command
- Supports nested directory wildcards: `/path/*/subdir/*.ext`
- Environment variables are expanded before wildcard matching

### Command History Separation
The terminal environment provides realistic command history management with mode-aware navigation:

- **Bash History**: Standard Linux commands (ls, cd, etc.) are stored in bash history
- **SQL*Plus History**: SQL commands are stored separately when in SQL*Plus mode
- **RMAN History**: RMAN commands have their own dedicated history
- **Mode Detection**: Arrow key navigation automatically uses the correct history based on current prompt
- **Persistent Storage**: All command histories are saved to browser localStorage
- **Cross-Session**: Command histories persist across browser sessions

```bash
# Each mode maintains separate command history:
[root@proddb01sim ~]# sqlplus / as sysdba    # Enter SQL*Plus
SQL> SELECT NAME FROM V$DATABASE;            # SQL command (stored in SQL history)
SQL> exit                                    # Return to bash
[root@proddb01sim ~]# rman target /          # Enter RMAN  
RMAN> BACKUP DATABASE;                       # RMAN command (stored in RMAN history)
RMAN> exit                                   # Return to bash
[root@proddb01sim ~]# ls -la                # Bash command (stored in bash history)

# Up/down arrows access the appropriate history for each mode
```

### .bash_profile Workflow
Realistic Linux login experience with automatic profile processing:

**Automatic Profile Loading:**
- Login shells (`su - username`) automatically source .bash_profile
- Environment variables are parsed and applied from profile files
- Supports `export VAR=value`, direct assignments, and variable expansion

**Profile Features:**
- **Oracle User**: Gets Oracle-specific environment (ORACLE_HOME, ORACLE_SID, PATH)
- **Root User**: Gets comprehensive system administrator environment
- **Other Users**: Get standard user environment settings
- **Manual Sourcing**: Use `source ~/.bash_profile` to reload settings

**Profile Syntax Support:**
```bash
# Supported .bash_profile syntax:
export ORACLE_HOME=/u01/app/oracle/product/19.0.0/dbhome_1
export PATH=$PATH:$ORACLE_HOME/bin
ORACLE_SID=ORCL
export LD_LIBRARY_PATH=$ORACLE_HOME/lib:$LD_LIBRARY_PATH

# Variable expansion works correctly:
export TNS_ADMIN=$ORACLE_HOME/network/admin
export PATH=/usr/local/bin:$PATH

# Source additional files:
source ~/.bashrc
. ~/.oracle_env
```

## Persistent State Management

- **Automatic Save**: All changes are automatically saved to browser localStorage
- **Session Persistence**: File system changes, user accounts, and progress persist across sessions
- **Progress Tracking**: Oracle installation progress is maintained between sessions
- **Configuration Retention**: System settings and environment variables are preserved
- **Reboot Behavior**: The `reboot` command resets the system to initial state while preserving `/root` folder contents
- **File Preservation**: Student work, scripts, and notes in `/root` are maintained across reboots

## Educational Value

This environment is designed for:
- **Oracle Database Administrators** learning installation and configuration
- **Students preparing for Oracle Certification (OCP)**
- **System Administrators** practicing Linux and Oracle integration
- **Database Professionals** wanting hands-on experience without infrastructure setup
- **Training Programs** requiring realistic simulation environments

## Technical Implementation

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Terminal Emulator**: [xterm.js](https://xtermjs.org/) - Full-featured terminal for the web
- **Simulation Engine**: Custom JavaScript command processor
- **File System**: Browser-based virtual filesystem with localStorage persistence
- **State Management**: Comprehensive state tracking for Oracle components

## Browser Compatibility

- Chrome/Chromium 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## Getting Started

1. Open the terminal training environment in your web browser
2. Start with basic Linux commands to familiarize yourself with the environment
3. Check your Oracle installation progress: `ocp`
4. Get started with Oracle installation: `ocp --hint-detail`
5. Follow the step-by-step guidance to complete Oracle Database installation
6. Practice with advanced scenarios: `ocp --scenarios`

## Tips for Best Learning Experience

- **Use Tab Completion**: Speed up command entry with Tab key (directory-aware for `cd` command)
- **Master Wildcards**: Use `*`, `?`, and `[abc]` patterns for efficient file operations
- **Practice Commands**: Try different options and variations with wildcard combinations
- **Read Error Messages**: The simulation provides realistic error messages for learning
- **Follow OCP Guidance**: Use the built-in progress tracker for structured learning
- **Experiment Safely**: The simulation environment is safe for experimentation
- **Practice Pipe Operations**: Master Linux text processing with pipes and filters
- **Test Datafile Operations**: Practice adding and resizing datafiles in SQL*Plus (sizes persist across reloads)
- **Use Command History**: Each mode (bash/SQL*Plus/RMAN) has separate command history
- **Leverage .bash_profile**: Customize your environment and practice shell configuration
- **Combine Features**: Use wildcards with pipes: `ls *.log | grep error`

## Support & Documentation

For Oracle Database documentation and best practices, refer to:
- Oracle Database Installation Guide
- Oracle Database Administrator's Guide
- Oracle Database Performance Tuning Guide
- Oracle Database Backup and Recovery User's Guide

---

**Note**: This is a training simulation designed for educational purposes. While it closely mimics real Oracle Database and Linux behavior, it should be used alongside actual Oracle documentation and hands-on experience with real systems for comprehensive learning.