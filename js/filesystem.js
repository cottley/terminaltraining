// RHEL 9 Filesystem Structure
class FileSystem {
    constructor() {
        // Try to load saved state first
        const savedState = this.loadState();
        
        if (savedState) {
            this.root = savedState.root;
            this.currentPath = savedState.currentPath;
            this.currentUser = savedState.currentUser;
        } else {
            // Initialize with default state
            this.root = {
                type: 'directory',
                name: '/',
                permissions: 'drwxr-xr-x',
                owner: 'root',
                group: 'root',
                size: 4096,
                modified: new Date(),
                children: {
                    'bin': { 
                        type: 'directory', 
                        permissions: 'drwxr-xr-x', 
                        owner: 'root', 
                        group: 'root', 
                        size: 4096, 
                        children: {
                            'ls': { type: 'file', permissions: '-rwxr-xr-x', owner: 'root', group: 'root', size: 12345, content: '' },
                            'cat': { type: 'file', permissions: '-rwxr-xr-x', owner: 'root', group: 'root', size: 8765, content: '' },
                            'echo': { type: 'file', permissions: '-rwxr-xr-x', owner: 'root', group: 'root', size: 5432, content: '' },
                            'pwd': { type: 'file', permissions: '-rwxr-xr-x', owner: 'root', group: 'root', size: 3456, content: '' },
                            'mkdir': { type: 'file', permissions: '-rwxr-xr-x', owner: 'root', group: 'root', size: 4567, content: '' },
                            'rm': { type: 'file', permissions: '-rwxr-xr-x', owner: 'root', group: 'root', size: 6789, content: '' },
                            'touch': { type: 'file', permissions: '-rwxr-xr-x', owner: 'root', group: 'root', size: 2345, content: '' },
                            'bash': { type: 'file', permissions: '-rwxr-xr-x', owner: 'root', group: 'root', size: 98765, content: '' },
                            'sh': { type: 'file', permissions: '-rwxr-xr-x', owner: 'root', group: 'root', size: 45678, content: '' }
                        }
                    },
                    'boot': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {} },
                    'dev': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {} },
                    'etc': { 
                        type: 'directory', 
                        permissions: 'drwxr-xr-x', 
                        owner: 'root', 
                        group: 'root', 
                        size: 4096,
                        children: {
                            'hosts': { type: 'file', permissions: '-rw-r--r--', owner: 'root', group: 'root', size: 158, content: '127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4\n::1         localhost localhost.localdomain localhost6 localhost6.localdomain6\n192.168.1.100   proddb01sim' },
                            'hostname': { type: 'file', permissions: '-rw-r--r--', owner: 'root', group: 'root', size: 20, content: 'proddb01sim' },
                            'redhat-release': { type: 'file', permissions: '-rw-r--r--', owner: 'root', group: 'root', size: 45, content: 'Red Hat Enterprise Linux release 9.0 (Plow)' },
                            'passwd': { type: 'file', permissions: '-rw-r--r--', owner: 'root', group: 'root', size: 950, content: 'root:x:0:0:root:/root:/bin/bash\nbin:x:1:1:bin:/bin:/sbin/nologin\ndaemon:x:2:2:daemon:/sbin:/sbin/nologin\nadm:x:3:4:adm:/var/adm:/sbin/nologin\nlp:x:4:7:lp:/var/spool/lpd:/sbin/nologin\nsync:x:5:0:sync:/sbin:/bin/sync\nshutdown:x:6:0:shutdown:/sbin:/sbin/shutdown\nhalt:x:7:0:halt:/sbin:/sbin/halt\nmail:x:8:12:mail:/var/spool/mail:/sbin/nologin\noperator:x:11:0:operator:/root:/sbin/nologin\ngames:x:12:100:games:/usr/games:/sbin/nologin\nftp:x:14:50:FTP User:/var/ftp:/sbin/nologin\nnobody:x:65534:65534:Kernel Overflow User:/:/sbin/nologin\ndbus:x:81:81:System message bus:/:/sbin/nologin\nsystemd-network:x:192:192:systemd Network Management:/:/sbin/nologin' },
                            'group': { type: 'file', permissions: '-rw-r--r--', owner: 'root', group: 'root', size: 350, content: 'root:x:0:\nbin:x:1:\ndaemon:x:2:\nsys:x:3:\nadm:x:4:\ntty:x:5:\ndisk:x:6:\nlp:x:7:\nmem:x:8:\nkmem:x:9:\nwheel:x:10:\ncdrom:x:11:\nmail:x:12:\nman:x:15:\ndialout:x:18:\nfloppy:x:19:\ngames:x:20:\ntape:x:33:\nvideo:x:39:\nftp:x:50:\nlock:x:54:\naudio:x:63:\nnobody:x:65534:\nusers:x:100:\nsystemd-network:x:192:\ndbus:x:81:' },
                            'sysctl.conf': { type: 'file', permissions: '-rw-r--r--', owner: 'root', group: 'root', size: 280, content: '# System default kernel parameters\nfs.aio-max-nr = 65536\nfs.file-max = 1024000\nkernel.shmall = 268435456\nkernel.shmmax = 68719476736\nkernel.shmmni = 4096\nkernel.sem = 32000 1024000000 500 1024\nnet.ipv4.ip_local_port_range = 32768 65535\nnet.core.rmem_default = 212992\nnet.core.rmem_max = 212992\nnet.core.wmem_default = 212992\nnet.core.wmem_max = 212992' },
                            'security': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {
                                'limits.conf': { type: 'file', permissions: '-rw-r--r--', owner: 'root', group: 'root', size: 200, content: '# System default resource limits\n# End of file' }
                            }},
                            'selinux': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {
                                'config': { type: 'file', permissions: '-rw-r--r--', owner: 'root', group: 'root', size: 458, content: '# This file controls the state of SELinux on the system.\n# SELINUX= can take one of these three values:\n#     enforcing - SELinux security policy is enforced.\n#     permissive - SELinux prints warnings instead of enforcing.\n#     disabled - No SELinux policy is loaded.\nSELINUX=permissive\n# SELINUXTYPE= can take one of these three values:\n#     targeted - Targeted processes are protected,\n#     minimum - Modification of targeted policy. Only selected processes are protected.\n#     mls - Multi Level Security protection.\nSELINUXTYPE=targeted' }
                            }},
                            'systemd': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {
                                'system': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {
                                    'oracle-db.service': { 
                                        type: 'file', 
                                        permissions: '-rw-r--r--', 
                                        owner: 'root', 
                                        group: 'root', 
                                        size: 456, 
                                        content: '[Unit]\nDescription=Oracle Database Service\nAfter=network.target\n\n[Service]\nType=forking\nUser=oracle\nGroup=oinstall\nExecStart=/u01/app/oracle/product/19.0.0/dbhome_1/bin/dbstart\nExecStop=/u01/app/oracle/product/19.0.0/dbhome_1/bin/dbshut\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target' 
                                    },
                                    'oracle-listener.service': { 
                                        type: 'file', 
                                        permissions: '-rw-r--r--', 
                                        owner: 'root', 
                                        group: 'root', 
                                        size: 412, 
                                        content: '[Unit]\nDescription=Oracle Net Listener\nAfter=network.target\n\n[Service]\nType=forking\nUser=oracle\nGroup=oinstall\nExecStart=/u01/app/oracle/product/19.0.0/dbhome_1/bin/lsnrctl start\nExecStop=/u01/app/oracle/product/19.0.0/dbhome_1/bin/lsnrctl stop\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target' 
                                    },
                                    'firewalld.service': { 
                                        type: 'file', 
                                        permissions: '-rw-r--r--', 
                                        owner: 'root', 
                                        group: 'root', 
                                        size: 280, 
                                        content: '[Unit]\nDescription=firewalld - dynamic firewall daemon\nBefore=network-pre.target\nWants=network-pre.target\n\n[Service]\nType=dbus\nBusName=org.fedoraproject.FirewallD1\nExecStart=/usr/sbin/firewalld --nofork\nExecReload=/bin/kill -HUP $MAINPID\n\n[Install]\nWantedBy=multi-user.target' 
                                    },
                                    'sshd.service': { 
                                        type: 'file', 
                                        permissions: '-rw-r--r--', 
                                        owner: 'root', 
                                        group: 'root', 
                                        size: 312, 
                                        content: '[Unit]\nDescription=OpenSSH server daemon\nDocumentation=man:sshd(8) man:sshd_config(5)\nAfter=network.target sshd-keygen.service\nWants=sshd-keygen.service\n\n[Service]\nType=notify\nExecStart=/usr/sbin/sshd -D\nExecReload=/bin/kill -HUP $MAINPID\nKillMode=process\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target' 
                                    },
                                    'httpd.service': { 
                                        type: 'file', 
                                        permissions: '-rw-r--r--', 
                                        owner: 'root', 
                                        group: 'root', 
                                        size: 298, 
                                        content: '[Unit]\nDescription=The Apache HTTP Server\nAfter=network.target remote-fs.target nss-lookup.target\n\n[Service]\nType=notify\nExecStart=/usr/sbin/httpd $OPTIONS -DFOREGROUND\nExecReload=/usr/sbin/httpd $OPTIONS -k graceful\nExecStop=/bin/kill -WINCH ${MAINPID}\nKillSignal=SIGCONT\nPrivateTmp=true\n\n[Install]\nWantedBy=multi-user.target' 
                                    },
                                    'chronyd.service': { 
                                        type: 'file', 
                                        permissions: '-rw-r--r--', 
                                        owner: 'root', 
                                        group: 'root', 
                                        size: 267, 
                                        content: '[Unit]\nDescription=NTP client/server\nDocumentation=man:chronyd(8) man:chrony.conf(5)\nAfter=ntpdate.service sntp.service ntpd.service\nConflicts=ntpd.service systemd-timesyncd.service\n\n[Service]\nType=forking\nPIDFile=/var/run/chronyd.pid\nExecStart=/usr/sbin/chronyd\n\n[Install]\nWantedBy=multi-user.target' 
                                    }
                                }}
                            }}
                        }
                    },
                    'home': { 
                        type: 'directory', 
                        permissions: 'drwxr-xr-x', 
                        owner: 'root', 
                        group: 'root', 
                        size: 4096,
                        children: {}
                    },
                    'install': {
                        type: 'directory',
                        permissions: 'drwxr-xr-x',
                        owner: 'root',
                        group: 'root',
                        size: 4096,
                        children: {
                            'ArcGIS_Server_Setup': { 
                                type: 'file', 
                                permissions: '-rwxr-xr-x', 
                                owner: 'root', 
                                group: 'root', 
                                size: 1024000, 
                                content: '#!/bin/bash\n# ArcGIS Server 10.9.1 Installation Script\n# This installer sets up ArcGIS Server with Oracle spatial integration\n' 
                            },
                            'LINUX.X64_193000_db_home.zip': {
                                type: 'file',
                                permissions: '-rw-r--r--',
                                owner: 'root',
                                group: 'root',
                                size: 3221225472,
                                content: '# Oracle Database 19c Installation Archive\n# Binary content simulation'
                            }
                        }
                    },
                    'lib': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {} },
                    'lib64': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {} },
                    'media': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {} },
                    'mnt': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {} },
                    'opt': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {} },
                    'proc': { type: 'directory', permissions: 'dr-xr-xr-x', owner: 'root', group: 'root', size: 0, children: {} },
                    'root': { type: 'directory', permissions: 'dr-xr-x---', owner: 'root', group: 'root', size: 4096, children: {} },
                    'run': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {} },
                    'sbin': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {} },
                    'srv': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {} },
                    'sys': { type: 'directory', permissions: 'dr-xr-xr-x', owner: 'root', group: 'root', size: 0, children: {} },
                    'tmp': { type: 'directory', permissions: 'drwxrwxrwt', owner: 'root', group: 'root', size: 4096, children: {} },
                    'u01': { 
                        type: 'directory', 
                        permissions: 'drwxr-xr-x', 
                        owner: 'root', 
                        group: 'root', 
                        size: 4096,
                        children: {}
                    },
                    'usr': { 
                        type: 'directory', 
                        permissions: 'drwxr-xr-x', 
                        owner: 'root', 
                        group: 'root', 
                        size: 4096, 
                        children: {
                            'lib': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {
                                'systemd': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {
                                    'system': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {
                                        'basic.target': { 
                                            type: 'file', 
                                            permissions: '-rw-r--r--', 
                                            owner: 'root', 
                                            group: 'root', 
                                            size: 456, 
                                            content: '[Unit]\nDescription=Basic System\nDocumentation=man:systemd.special(7)\nRequires=sysinit.target\nWants=sockets.target timers.target paths.target slices.target\nAfter=sysinit.target sockets.target paths.target slices.target tmp.mount\nConflicts=rescue.service rescue.target\nAllowIsolate=yes' 
                                        },
                                        'multi-user.target': { 
                                            type: 'file', 
                                            permissions: '-rw-r--r--', 
                                            owner: 'root', 
                                            group: 'root', 
                                            size: 398, 
                                            content: '[Unit]\nDescription=Multi-User System\nDocumentation=man:systemd.special(7)\nRequires=basic.target\nConflicts=rescue.service rescue.target graphical.target\nAfter=basic.target rescue.service rescue.target\nAllowIsolate=yes' 
                                        },
                                        'network.target': { 
                                            type: 'file', 
                                            permissions: '-rw-r--r--', 
                                            owner: 'root', 
                                            group: 'root', 
                                            size: 278, 
                                            content: '[Unit]\nDescription=Network\nDocumentation=man:systemd.special(7)\nRefuseManualStart=yes\nAfter=network-pre.target\nBefore=network-online.target' 
                                        },
                                        'sysinit.target': { 
                                            type: 'file', 
                                            permissions: '-rw-r--r--', 
                                            owner: 'root', 
                                            group: 'root', 
                                            size: 312, 
                                            content: '[Unit]\nDescription=System Initialization\nDocumentation=man:systemd.special(7)\nConflicts=emergency.service emergency.target\nWants=local-fs.target swap.target\nAfter=local-fs.target swap.target emergency.service emergency.target' 
                                        }
                                    }}
                                }}
                            }},
                            'sbin': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {} },
                            'bin': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {} }
                        }
                    },
                    'var': { type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', size: 4096, children: {} }
                }
            };
            this.currentPath = '/root';
            this.currentUser = 'root';
        }
    }

    // Save state to localStorage
    saveState() {
        try {
            const state = {
                root: this.root,
                currentPath: this.currentPath,
                currentUser: this.currentUser
            };
            localStorage.setItem('fileSystemState', JSON.stringify(state));
        } catch (e) {
            console.error('Failed to save filesystem state:', e);
        }
    }

    // Load state from localStorage
    loadState() {
        try {
            const savedState = localStorage.getItem('fileSystemState');
            if (savedState) {
                return JSON.parse(savedState);
            }
        } catch (e) {
            console.error('Failed to load filesystem state:', e);
        }
        return null;
    }

    // Update all modification methods to save state
    mkdir(path) {
        const pathArray = this.resolvePath(path);
        const dirName = pathArray.pop();
        const parentNode = this.getNode(pathArray);
        
        if (parentNode && parentNode.type === 'directory') {
            parentNode.children[dirName] = {
                type: 'directory',
                permissions: 'drwxr-xr-x',
                owner: this.currentUser,
                group: this.currentUser === 'root' ? 'root' : 'users',
                size: 4096,
                modified: new Date(),
                children: {}
            };
            this.saveState();
            return true;
        }
        return false;
    }

    touch(path, content = '') {
        const pathArray = this.resolvePath(path);
        const fileName = pathArray.pop();
        const parentNode = this.getNode(pathArray);
        
        if (parentNode && parentNode.type === 'directory') {
            parentNode.children[fileName] = {
                type: 'file',
                permissions: '-rw-r--r--',
                owner: this.currentUser,
                group: this.currentUser === 'root' ? 'root' : 'users',
                size: content.length,
                modified: new Date(),
                content: content
            };
            this.saveState();
            return true;
        }
        return false;
    }

    rm(path, recursive = false) {
        const pathArray = this.resolvePath(path);
        const name = pathArray.pop();
        const parentNode = this.getNode(pathArray);
        
        if (parentNode && parentNode.type === 'directory' && parentNode.children[name]) {
            const target = parentNode.children[name];
            if (target.type === 'directory' && Object.keys(target.children).length > 0 && !recursive) {
                return false;
            }
            delete parentNode.children[name];
            this.saveState();
            return true;
        }
        return false;
    }

    cd(path) {
        if (path === '~') {
            this.currentPath = this.currentUser === 'root' ? '/root' : `/home/${this.currentUser}`;
            this.saveState();
            return true;
        }
        
        const newPath = path.startsWith('/') ? path : 
            this.currentPath === '/' ? `/${path}` : `${this.currentPath}/${path}`;
        const resolvedArray = this.resolvePath(newPath);
        const normalizedPath = resolvedArray.length === 0 ? '/' : '/' + resolvedArray.join('/');
        
        if (this.isDirectory(normalizedPath)) {
            this.currentPath = normalizedPath;
            this.saveState();
            return true;
        }
        return false;
    }

    updateFile(path, content) {
        const pathArray = this.resolvePath(path);
        const node = this.getNode(pathArray);
        
        if (node && node.type === 'file') {
            node.content = content;
            node.size = content.length;
            node.modified = new Date();
            this.saveState();
            return true;
        }
        return false;
    }

    appendToFile(path, content) {
        const currentContent = this.cat(path);
        if (currentContent !== null) {
            const result = this.updateFile(path, currentContent + content);
            this.saveState();
            return result;
        }
        return false;
    }

    resolvePath(path) {
        let parts;
        let current;
        
        if (path.startsWith('/')) {
            // Absolute path - start from root
            parts = path.split('/').filter(p => p);
            current = [];
        } else {
            // Relative path - start from current directory
            parts = path.split('/').filter(p => p);
            current = this.currentPath.split('/').filter(p => p);
        }
        
        // Process all path parts (both absolute and relative need .. processing)
        for (const part of parts) {
            if (part === '..') {
                // Only pop if not at root level
                if (current.length > 0) {
                    current.pop();
                }
            } else if (part !== '.') {
                current.push(part);
            }
        }
        
        return current;
    }

    getNode(pathArray) {
        let node = this.root;
        for (const part of pathArray) {
            if (node.type === 'directory' && node.children && node.children[part]) {
                node = node.children[part];
            } else {
                return null;
            }
        }
        return node;
    }

    exists(path) {
        const pathArray = this.resolvePath(path);
        return this.getNode(pathArray) !== null;
    }

    isDirectory(path) {
        const pathArray = this.resolvePath(path);
        const node = this.getNode(pathArray);
        return node && node.type === 'directory';
    }

    isFile(path) {
        const pathArray = this.resolvePath(path);
        const node = this.getNode(pathArray);
        return node && node.type === 'file';
    }


    ls(path = '.') {
        const pathArray = this.resolvePath(path);
        const node = this.getNode(pathArray);
        
        if (node && node.type === 'directory') {
            return Object.entries(node.children).map(([name, child]) => ({
                name,
                ...child
            }));
        }
        return null;
    }

    cat(path) {
        const pathArray = this.resolvePath(path);
        const node = this.getNode(pathArray);
        
        if (node && node.type === 'file') {
            return node.content || '';
        }
        return null;
    }

    pwd() {
        return this.currentPath;
    }


    // Helper methods for user and group management
    getNextUid() {
        const passwdContent = this.cat('/etc/passwd');
        if (!passwdContent) return 1000;
        
        const lines = passwdContent.split('\n').filter(line => line.trim());
        let maxUid = 999;
        
        lines.forEach(line => {
            const parts = line.split(':');
            const uid = parseInt(parts[2]);
            if (uid >= 1000 && uid < 65534 && uid > maxUid) {
                maxUid = uid;
            }
        });
        
        return maxUid + 1;
    }

    getNextGid() {
        const groupContent = this.cat('/etc/group');
        if (!groupContent) return 1000;
        
        const lines = groupContent.split('\n').filter(line => line.trim());
        let maxGid = 999;
        
        lines.forEach(line => {
            const parts = line.split(':');
            const gid = parseInt(parts[2]);
            if (gid >= 1000 && gid < 65534 && gid > maxGid) {
                maxGid = gid;
            }
        });
        
        return maxGid + 1;
    }


}