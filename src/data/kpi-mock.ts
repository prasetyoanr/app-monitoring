import type { KpiOwnerRole, KpiScorecardStatus } from "@/lib/kpi-approval";
import type {
  KpiActuals,
  KpiAggregation,
  KpiFrequency,
  KpiKind,
  KpiPolarity,
} from "@/lib/kpi-score";
import type { DowntimeWeek } from "@/lib/kpi-downtime";
import type { KpiSurveyEvidence } from "@/lib/kpi-survey";

// Dummy data for the UI prototype. Not connected to the database.
// System labels are English; the text typed by members (objectives, KPI names,
// data sources, notes) stays in whatever language they wrote it in.

export type KpiAdapterKey =
  | "survey.satisfaction"
  | "tickets.downtime"
  | "backup.success_rate"
  | "activities.completion";

export type KpiSourceKey = "manual" | KpiAdapterKey;

export type KpiAdapter = {
  key: KpiAdapterKey;
  label: string;
  description: string;
  unit: string;
  // How the feature combines its records into one actual for a checkpoint.
  aggregation: KpiAggregation;
  // Sample values "pulled" from the related feature for each checkpoint.
  sample: { mid: number; end: number | null; sampleSize: number };
};

export const KPI_ADAPTERS: KpiAdapter[] = [
  {
    key: "survey.satisfaction",
    label: "Satisfaction survey",
    description: "Persentase jawaban rating 4–5 pada pertanyaan instalasi dan perbaikan dari survei terpilih.",
    unit: "%",
    aggregation: "average",
    sample: { mid: 86, end: null, sampleSize: 48 },
  },
  {
    key: "tickets.downtime",
    label: "Server/network downtime",
    description: "Total outage hours from Inbox tickets in the network category.",
    unit: "Jam",
    aggregation: "cumulative",
    sample: { mid: 12, end: null, sampleSize: 9 },
  },
  {
    key: "backup.success_rate",
    label: "Backup success rate",
    description: "Ratio of successful backups from the Backup User feature.",
    unit: "%",
    aggregation: "average",
    sample: { mid: 96, end: null, sampleSize: 120 },
  },
  {
    key: "activities.completion",
    label: "Activity completion",
    description: "Share of completed work plans from GA Activities.",
    unit: "%",
    aggregation: "average",
    sample: { mid: 78, end: null, sampleSize: 23 },
  },
];

export type KpiAttachment = {
  id: string;
  type: "file" | "link";
  title: string;
  // Link attachment.
  url?: string;
  host?: string;
  isSpreadsheet?: boolean;
  // File attachment. In the prototype a file is never uploaded; previewUrl only lives in the tab.
  fileName?: string;
  fileSize?: number;
  previewUrl?: string;
  addedBy: string;
  addedAt: string;
};

export type KpiItem = {
  id: string;
  metricType?: "standard" | "weekly_downtime";
  downtimeWeeks?: DowntimeWeek[];
  objective: string;
  name: string;
  weight: number;
  unit: string;
  target: number;
  // How often a value is recorded, chosen by the member.
  frequency: KpiFrequency;
  // How the recorded values become one actual: average, sum, or latest.
  aggregation: KpiAggregation;
  polarity: KpiPolarity;
  kind: KpiKind;
  source: KpiSourceKey;
  surveyIds?: string[];
  computedActuals?: KpiActuals;
  surveyEvidence?: Record<number, KpiSurveyEvidence>;
  // Where the data comes from, in the member's own words (e.g. a report name).
  dataSource: string;
  // Optional description of the calculation, in the member's own words.
  formulaNote: string;
  // Used only when source === "manual": value per assessment period.
  actuals: KpiActuals;
  // Supporting files or links for this KPI.
  attachments: KpiAttachment[];
};

export type KpiMember = {
  id: string;
  name: string;
  division: string;
  position: string;
  role: KpiOwnerRole;
  status: KpiScorecardStatus;
  reviewNote?: string;
  reviewedBy?: string;
  items: KpiItem[];
  revision?: number;
};

type KpiOptions = Partial<Omit<KpiItem, "id" | "objective" | "name" | "weight" | "unit" | "target">>;

function freq(type: KpiFrequency["type"], customMonths = 2): KpiFrequency {
  return { type, customMonths };
}

function kpi(
  id: string,
  objective: string,
  name: string,
  weight: number,
  unit: string,
  target: number,
  options: KpiOptions = {},
): KpiItem {
  return {
    id,
    objective,
    name,
    weight,
    unit,
    target,
    frequency: freq("yearly"),
    aggregation: "average",
    polarity: "positive",
    kind: "routine",
    source: "manual",
    dataSource: "",
    formulaNote: "",
    actuals: {},
    attachments: [],
    ...options,
  };
}

function linkAttachment(id: string, title: string, url: string, addedBy: string, addedAt: string): KpiAttachment {
  const parsed = new URL(url);
  return {
    id,
    type: "link",
    title,
    url,
    host: parsed.hostname,
    isSpreadsheet: parsed.hostname === "docs.google.com" && parsed.pathname.startsWith("/spreadsheets"),
    addedBy,
    addedAt,
  };
}

function fileAttachment(id: string, title: string, fileName: string, fileSize: number, addedBy: string, addedAt: string): KpiAttachment {
  return { id, type: "file", title, fileName, fileSize, addedBy, addedAt };
}

export const KPI_MOCK_MEMBERS: KpiMember[] = [
  {
    id: "m-andi",
    name: "Andi Pratama",
    division: "IT Team",
    position: "IT Staff",
    role: "service_agent",
    status: "submitted",
    items: [
      kpi("k1", "Meningkatkan Produktifitas Karyawan Atas Kebutuhan Fasilitas Alat Kerja", "Hasil survei Kepuasan Instalasi Jaringan dan Perbaikan Perangkat Kerja di HO dan Pabrik", 20, "%", 90, {
        frequency: freq("half_yearly"),
        source: "survey.satisfaction",
        dataSource: "Laporan Survey Triwulanan",
        formulaNote: "(Rata2 Capaian / Target) * 100%",
      }),
      kpi("k2", "Menjaga Stabilitas Kinerja Karyawan", "Tidak Terdapat Downtime Server/Jaringan Kantor Head Office & Pabrik Karena Faktor Internal (Jumlah Jam Bulanan)", 20, "Jam", 15, {
        polarity: "negative",
        aggregation: "cumulative",
        kind: "improvement",
        source: "tickets.downtime",
        dataSource: "Laporan Gangguan Jaringan",
        formulaNote: "((100% - (Rata2 Jumlah Jam Terjadinya Downtime x 15%)) / Target) * Bobot",
      }),
      kpi("k3", "Perlindungan Terhadap Data Internal Perusahaan", "Terbackupnya Data/File Karyawan Head Office & Pabrik Ke Dalam Server", 20, "%", 100, {
        source: "backup.success_rate",
        dataSource: "Laporan Back up Server",
        formulaNote: "(Capaian / Target) * 100%",
      }),
      kpi("k4", "Memastikan penggunaan sistem berjalan lancar", "Pembuatan Sistem Aplikasi", 20, "Sistem", 2, {
        frequency: freq("half_yearly"),
        aggregation: "cumulative",
        kind: "improvement",
        dataSource: "BAST Penggunaan Sistem",
        actuals: { 6: 1 },
        attachments: [
          linkAttachment("e1", "Tracker pengerjaan sistem", "https://docs.google.com/spreadsheets/d/sample-tracker/edit", "Andi Pratama", "2026-09-12"),
          fileAttachment("e2", "BAST sistem absensi", "bast-sistem-absensi.pdf", 248000, "Andi Pratama", "2026-09-14"),
        ],
      }),
      kpi("k5", "Pengendalian Atas Keamanan Aset Perusahaan", "Terlaksananya Stok Opname Kategori Inventaris Kantor", 10, "Kali", 2, {
        frequency: freq("quarterly"),
        aggregation: "cumulative",
        dataSource: "Laporan Opname Asset: Inv. Kantor",
        formulaNote: "(Capaian / Target) x Bobot",
        actuals: { 3: 1, 6: 1 },
        attachments: [fileAttachment("e3", "Laporan stok opname Q2", "stok-opname-q2.xlsx", 184000, "Andi Pratama", "2026-07-03")],
      }),
      kpi("k6", "Meningkatkan Produktifitas Karyawan Atas Kebutuhan Fasilitas Alat Kerja", "Project Peremajaan Jaringan di Pabrik", 10, "%", 100, {
        frequency: freq("custom", 4),
        aggregation: "latest",
        kind: "improvement",
        dataSource: "Laporan progres project",
        actuals: { 4: 35 },
      }),
    ],
  },
  {
    id: "m-dewi",
    name: "Dewi Lestari",
    division: "IT Team",
    position: "IT Staff",
    role: "service_agent",
    status: "draft",
    items: [],
  },
  {
    id: "m-maya",
    name: "Maya Kusuma",
    division: "General Affairs",
    position: "Supervisor",
    role: "approver",
    status: "submitted",
    items: [
      kpi("y1", "Menjamin kelancaran operasional kantor", "Rencana kerja GA selesai tepat waktu", 50, "%", 90, {
        frequency: freq("quarterly"),
        source: "activities.completion",
        dataSource: "Rencana kerja GA (fitur GA Activities)",
      }),
      kpi("y2", "Efisiensi biaya operasional", "Realisasi biaya ATK terhadap anggaran", 50, "%", 100, {
        frequency: freq("custom", 2),
        polarity: "negative",
        dataSource: "Laporan pemakaian ATK bulanan",
        formulaNote: "Rata-rata realisasi biaya dibanding anggaran",
        actuals: { 2: 90, 4: 94, 6: 97 },
        attachments: [linkAttachment("e4", "Anggaran ATK vs realisasi", "https://docs.google.com/spreadsheets/d/sample-budget/edit", "Maya Kusuma", "2026-09-20")],
      }),
    ],
  },
  {
    id: "m-hendra",
    name: "Hendra Wijaya",
    division: "General Affairs",
    position: "Manager",
    role: "final_approver",
    status: "approved",
    items: [
      kpi("h1", "Pengendalian biaya departemen", "Realisasi anggaran departemen", 50, "%", 100, {
        frequency: freq("half_yearly"),
        polarity: "negative",
        dataSource: "Laporan keuangan semester",
        actuals: { 6: 94 },
      }),
      kpi("h2", "Peningkatan sistem kerja", "Inisiatif perbaikan proses terlaksana", 50, "Kali", 4, {
        frequency: freq("quarterly"),
        aggregation: "cumulative",
        kind: "improvement",
        dataSource: "Daftar inisiatif departemen",
        actuals: { 3: 1, 6: 1 },
      }),
    ],
  },
  {
    id: "m-sari",
    name: "Sari Wulandari",
    division: "General Affairs",
    position: "GA Staff",
    role: "receptionist",
    status: "draft",
    items: [
      kpi("s1", "Menjamin kelancaran operasional kantor", "Rencana kerja GA terselesaikan tepat waktu", 40, "%", 90, {
        frequency: freq("quarterly"),
        source: "activities.completion",
        dataSource: "Rencana kerja GA (fitur GA Activities)",
      }),
      kpi("s2", "Efisiensi biaya ATK", "Realisasi biaya ATK terhadap anggaran", 30, "%", 100, {
        frequency: freq("monthly"),
        polarity: "negative",
        dataSource: "Laporan pemakaian ATK bulanan",
        actuals: { 1: 90, 2: 94, 3: 92, 4: 95, 5: 93, 6: 92 },
      }),
      kpi("s3", "Kepuasan layanan GA", "Permintaan layanan diselesaikan sesuai SLA", 20, "%", 95, {
        frequency: freq("half_yearly"),
        dataSource: "Rekap permintaan layanan",
        actuals: { 6: 88 },
      }),
    ],
  },
  {
    id: "m-rudi",
    name: "Rudi Hartono",
    division: "Produksi",
    position: "Supervisor",
    role: "service_agent",
    status: "rejected",
    reviewNote: "Target kehadiran terlalu rendah. Naikkan ke 98% dan lengkapi lampiran.",
    items: [
      kpi("r1", "Disiplin kerja tim produksi", "Tingkat kehadiran tim", 60, "%", 90, {
        frequency: freq("half_yearly"),
        dataSource: "Rekap absensi",
        actuals: { 6: 93 },
      }),
      kpi("r2", "Keselamatan kerja", "Jumlah insiden kerja", 40, "Kasus", 2, {
        frequency: freq("quarterly"),
        polarity: "negative",
        aggregation: "cumulative",
        dataSource: "Laporan K3",
        actuals: { 3: 1, 6: 1 },
      }),
    ],
  },
];

export type KpiPersona = "admin" | string;

export const KPI_ADMIN_PERSONA = "admin";
