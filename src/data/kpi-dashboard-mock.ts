import type { KpiPolarity } from "@/lib/kpi-score";

// Dummy team dashboard data (sample shape only). Each KPI has one value per month.
// Group names, KPI names and summaries are typed by members, so they stay in their own language.

export const KPI_DASHBOARD_MONTHS = ["Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026"];

export type KpiDashboardRow = {
  id: string;
  group: string;
  name: string;
  unit: string;
  target: number;
  polarity: KpiPolarity;
  values: (number | null)[];
};

export type KpiDashboardGroup = {
  name: string;
  description: string;
  summary: string;
};

export const KPI_DASHBOARD_GROUPS: KpiDashboardGroup[] = [
  {
    name: "IT Support & Infrastruktur",
    description: "Layanan berjalan stabil, waktu respon masih perlu dipercepat.",
    summary:
      "Kepuasan layanan IT naik dari 84% menjadi 88%, mendekati target 90%. Downtime jaringan masih di atas batas 15 jam per bulan.",
  },
  {
    name: "Aplikasi & Sistem",
    description: "Pengembangan sistem berjalan sesuai rencana.",
    summary:
      "Satu dari dua sistem aplikasi sudah selesai. Keberhasilan backup konsisten di atas 95% namun belum mencapai 100%.",
  },
  {
    name: "General Affairs",
    description: "Rencana kerja dan SLA layanan umumnya terpenuhi.",
    summary:
      "Penyelesaian rencana kerja GA mencapai 91%, di atas target 90%. Realisasi biaya ATK terhadap anggaran terkendali.",
  },
];

export const KPI_DASHBOARD_ROWS: KpiDashboardRow[] = [
  { id: "d1", group: "IT Support & Infrastruktur", name: "Kepuasan layanan IT (survei)", unit: "%", target: 90, polarity: "positive", values: [84, 85, 87, 88] },
  { id: "d2", group: "IT Support & Infrastruktur", name: "Downtime jaringan per bulan", unit: "jam", target: 15, polarity: "negative", values: [18, 14, 20, 16] },
  { id: "d3", group: "IT Support & Infrastruktur", name: "Waktu respon tiket", unit: "jam", target: 4, polarity: "negative", values: [6, 5.5, 5, 4.5] },
  { id: "d4", group: "Aplikasi & Sistem", name: "Keberhasilan backup", unit: "%", target: 100, polarity: "positive", values: [95, 96, 97, 96] },
  { id: "d5", group: "Aplikasi & Sistem", name: "Sistem aplikasi selesai", unit: "", target: 2, polarity: "positive", values: [0, 0, 1, 1] },
  { id: "d6", group: "Aplikasi & Sistem", name: "Project peremajaan jaringan", unit: "%", target: 100, polarity: "positive", values: [10, 25, 40, 55] },
  { id: "d7", group: "General Affairs", name: "Rencana kerja GA selesai", unit: "%", target: 90, polarity: "positive", values: [82, 86, 89, 91] },
  { id: "d8", group: "General Affairs", name: "Permintaan layanan sesuai SLA", unit: "%", target: 95, polarity: "positive", values: [88, 90, 92, 93] },
  { id: "d9", group: "General Affairs", name: "Realisasi biaya ATK vs anggaran", unit: "%", target: 100, polarity: "negative", values: [92, 97, 95, 99] },
  { id: "d10", group: "General Affairs", name: "Stok opname inventaris kantor", unit: "kali", target: 2, polarity: "positive", values: [0, 1, 1, 1] },
];
