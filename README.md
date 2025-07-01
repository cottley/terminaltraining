# Oracle Database Training Environment

A comprehensive simulated terminal training environment for Oracle Database 19c installation and administration practice on Red Hat Enterprise Linux 9. This environment provides a realistic Linux terminal experience with a complete Oracle Database ecosystem simulation.

## Terminal Technology

This training environment is powered by **[xterm.js](https://xtermjs.org/)**, a full-featured terminal emulator library that runs in web browsers. xterm.js provides the realistic terminal experience with features like cursor navigation, text selection, command history, and keyboard shortcuts.

## Features Overview

### 🖥️ **Realistic Linux Terminal Simulation**
- Full RHEL 9 filesystem structure
- Authentic command prompt and shell behavior
- Command history with arrow key navigation
- Tab completion for commands and file paths
- Cursor navigation with left/right arrow keys for line editing
- Text selection and automatic clipboard copying
- Pipe functionality with command chaining

### 📦 **Complete Oracle Database Ecosystem**
- Oracle Database 19c Enterprise Edition simulation
- SQL*Plus with comprehensive command support
- RMAN (Recovery Manager) backup and recovery tools
- Oracle Net Services (Listener and TNS configuration)
- Oracle Universal Installer simulation
- DBCA (Database Configuration Assistant)
- NETCA (Network Configuration Assistant)

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
- V$ performance views simulation
- SQL*Plus performance queries
- System resource monitoring (ps, df, free, top simulation)

### 🔄 **Backup & Recovery Tools**
- RMAN backup scenarios (full, incremental, compressed)
- Database validation and recovery testing
- Export/Import utilities (expdp/impdp)
- Archive log management
- Point-in-time recovery simulation

### 🛡️ **Security & Patch Management**
- OPatch utility for Oracle patch management
- User authentication and authorization
- Security policy configuration
- Oracle security best practices simulation

### 🗺️ **Spatial Extensions Support**
- ArcGIS Server installation simulation
- ArcSDE library integration
- Oracle spatial functions via EXTPROC
- SDE schema setup for geodatabase support

### 📋 **Progress Tracking & Learning Support**
- **OCP (Oracle Certified Professional) Progress Tracker**
  - Real-time installation progress monitoring
  - Task-by-task completion tracking
  - Detailed hints and guidance system
  - Comprehensive troubleshooting help
  - Practice scenarios for skill development

### 🎮 **Interactive Features**
- Built-in tic-tac-toe game for breaks
- Interactive learning scenarios
- Error simulation for troubleshooting practice
- Gamified completion tracking

## Core Commands

### File System Operations
```bash
ls [-l] [-a] [-la] [-al] # List directory contents
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
echo <text>           # Display text
vim/vi/nano <file>    # Edit files (modal editor)

# Output redirection
command > file        # Redirect output to file
command >> file       # Append output to file  
command > /dev/null   # Discard output (no terminal output)
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
pwd
ls -la /u01/app/oracle
echo "Installation check complete"
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
startup/shutdown      # Database control
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

### File Management Operations
```bash
# Directory Listing
ls                               # List files and directories
ls -l                            # Long format listing
ls -a                            # Show all files (including hidden)
ls -la                           # Long format with all files
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
- **Backup & Recovery**: RMAN scenarios, validation, point-in-time recovery
- **Security Configuration**: User management, auditing, role-based access
- **Network Troubleshooting**: Listener issues, TNS configuration, connectivity
- **Storage Management**: Tablespace administration, space optimization

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

- **Use Tab Completion**: Speed up command entry with Tab key
- **Practice Commands**: Try different options and variations
- **Read Error Messages**: The simulation provides realistic error messages for learning
- **Follow OCP Guidance**: Use the built-in progress tracker for structured learning
- **Experiment Safely**: The simulation environment is safe for experimentation
- **Practice Pipe Operations**: Master Linux text processing with pipes and filters

## Support & Documentation

For Oracle Database documentation and best practices, refer to:
- Oracle Database Installation Guide
- Oracle Database Administrator's Guide
- Oracle Database Performance Tuning Guide
- Oracle Database Backup and Recovery User's Guide

---

**Note**: This is a training simulation designed for educational purposes. While it closely mimics real Oracle Database and Linux behavior, it should be used alongside actual Oracle documentation and hands-on experience with real systems for comprehensive learning.