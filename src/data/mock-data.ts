export interface TicketRecord {
  id: string;
  title: string;
  category: string;
  requester: string;
  division: string;
  location: string;
  reportedAt: string;
  reportedDate: string;
  priority: string;
  status: string;
  completedDays: number | null;
  description: string;
  resolution: string;
}

export const tickets: TicketRecord[] = [
  { id: "INC-2026-0148", title: "ERP access disconnected in Finance", category: "Network", requester: "Sinta Maharani", division: "Finance", location: "HO", reportedAt: "13/07/26", reportedDate: "2026-07-13", priority: "Critical", status: "Waiting for Client Approval", completedDays: null, description: "The ERP connection is unavailable on the Finance computer.", resolution: "The network route and ERP client session were restored, then the connection was tested successfully." },
  { id: "INC-2026-0147", title: "Label printer not detected", category: "Hardware", requester: "Dodi Firmansyah", division: "Purchase", location: "Factory", reportedAt: "13/07/26", reportedDate: "2026-07-13", priority: "Medium", status: "New", completedDays: null, description: "The label printer does not appear on the user's computer.", resolution: "" },
  { id: "INC-2026-0146", title: "Microsoft Outlook synchronization failed", category: "Software", requester: "Ayu Lestari", division: "Human Resources", location: "HO", reportedAt: "12/07/26", reportedDate: "2026-07-12", priority: "Low", status: "Waiting for Client Approval", completedDays: null, description: "New email is not arriving in Microsoft Outlook.", resolution: "The Outlook profile was repaired and mail synchronization was tested successfully." },
  { id: "INC-2026-0145", title: "Slow Wi-Fi in the third-floor meeting room", category: "Network", requester: "Bima Pratama", division: "Production", location: "Factory", reportedAt: "11/07/26", reportedDate: "2026-07-11", priority: "High", status: "In Progress", completedDays: null, description: "The Wi-Fi connection is unstable during meetings.", resolution: "" },
  { id: "INC-2026-0144", title: "Laptop repeatedly displays a blue screen", category: "Hardware", requester: "Lina Wijaya", division: "Legal", location: "HO", reportedAt: "10/07/26", reportedDate: "2026-07-10", priority: "High", status: "Completed", completedDays: 2, description: "The laptop repeatedly restarts and displays a blue screen.", resolution: "The faulty memory module was replaced and the laptop passed the stability test." },
  { id: "INC-2026-0143", title: "Design application installation request", category: "Software", requester: "Yoga Saputra", division: "Marketing", location: "Factory", reportedAt: "10/07/26", reportedDate: "2026-07-10", priority: "Low", status: "Completed", completedDays: 0, description: "Install a design application for business use.", resolution: "The approved design application was installed, activated, and tested with the requester." },
];

export const servers = [
  { name: "PROXMOX-01", role: "Primary hypervisor", ip: "10.10.1.11", status: "Healthy", cpu: 38, memory: 62, disk: 54, uptime: "128 days" },
  { name: "APP-PROD-01", role: "Application server", ip: "10.10.1.24", status: "Healthy", cpu: 44, memory: 71, disk: 48, uptime: "42 days" },
  { name: "DB-PROD-01", role: "PostgreSQL database", ip: "10.10.1.31", status: "Warning", cpu: 67, memory: 86, disk: 74, uptime: "91 days" },
  { name: "FILE-SRV-01", role: "File server", ip: "10.10.1.42", status: "Healthy", cpu: 21, memory: 52, disk: 68, uptime: "67 days" },
  { name: "DC-PRIMARY", role: "Domain controller", ip: "10.10.1.5", status: "Healthy", cpu: 18, memory: 43, disk: 31, uptime: "156 days" },
  { name: "WEB-LEGACY", role: "Legacy web server", ip: "10.10.1.51", status: "Critical", cpu: 94, memory: 92, disk: 88, uptime: "19 days" },
];

export interface BackupRecord {
  id: string;
  user: string;
  username: string;
  email: string;
  password: string;
  syncPath: string;
  lastBackup: string;
  lastBackupIso: string;
  status: string;
}

export const backupJobs: BackupRecord[] = [
  { id: "BKU-2026-0084", user: "Sinta Maharani", username: "sinta.maharani", email: "sinta.maharani@example.com", password: "Backup archive key A", syncPath: "C:\\Users\\Sinta\\Documents", lastBackup: "13/07/26 08:12", lastBackupIso: "2026-07-13T08:12", status: "Success" },
  { id: "BKU-2026-0083", user: "Ayu Lestari", username: "ayu.lestari", email: "ayu.lestari@example.com", password: "Backup archive key B", syncPath: "C:\\Users\\Ayu\\Work Files", lastBackup: "13/07/26 07:45", lastBackupIso: "2026-07-13T07:45", status: "Success" },
  { id: "BKU-2026-0082", user: "Yoga Saputra", username: "yoga.saputra", email: "yoga.saputra@example.com", password: "", syncPath: "D:\\Design Projects", lastBackup: "12/07/26 22:16", lastBackupIso: "2026-07-12T22:16", status: "Overdue" },
  { id: "BKU-2026-0081", user: "Bima Pratama", username: "bima.pratama", email: "bima.pratama@example.com", password: "Operations archive key", syncPath: "D:\\Operational Data", lastBackup: "12/07/26 18:02", lastBackupIso: "2026-07-12T18:02", status: "Failed" },
  { id: "BKU-2026-0080", user: "Lina Wijaya", username: "", email: "lina.wijaya@example.com", password: "Legal archive key", syncPath: "C:\\Users\\Lina\\Legal Documents", lastBackup: "13/07/26 06:38", lastBackupIso: "2026-07-13T06:38", status: "Success" },
];

export const assets = [
  { code: "AST-LTP-0284", name: "Lenovo ThinkPad T14 Gen 4", type: "Laptop", user: "Sinta Maharani", department: "Finance", status: "Active", health: 92 },
  { code: "AST-LTP-0271", name: "Dell Latitude 5440", type: "Laptop", user: "Ayu Lestari", department: "Human Resources", status: "Active", health: 87 },
  { code: "AST-SWT-0012", name: "Cisco CBS350-48P", type: "Network", user: "Infrastructure", department: "IT", status: "Active", health: 98 },
  { code: "AST-PRN-0038", name: "Zebra ZT411", type: "Printer", user: "Dodi Firmansyah", department: "Warehouse", status: "Under Repair", health: 54 },
  { code: "AST-AP-0047", name: "UniFi U6 Enterprise", type: "Access Point", user: "Meeting Room L3", department: "General", status: "Active", health: 83 },
];
