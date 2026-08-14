import type { ServiceRequestTemplate } from "./types";

export const itSupportTemplate: ServiceRequestTemplate = {
  key: "it-support",
  serviceDivision: "IT Team",
  label: "Bantuan IT",
  description: "Laporkan kendala perangkat, aplikasi, akses, atau jaringan kepada tim IT.",
  fields: [
    {
      key: "title",
      label: "Judul permintaan",
      type: "text",
      required: true,
      maxLength: 200,
      placeholder: "Contoh: Laptop tidak dapat terhubung ke Wi-Fi",
      ticketField: "title",
    },
    {
      key: "category",
      label: "Kategori",
      type: "master-category",
      required: true,
      ticketField: "category",
    },
    {
      key: "location",
      label: "Lokasi",
      type: "master-location",
      required: true,
      ticketField: "location",
    },
    {
      key: "description",
      label: "Jelaskan kebutuhan",
      type: "textarea",
      required: true,
      maxLength: 10_000,
      placeholder: "Tuliskan kendala atau kebutuhan Anda secara rinci.",
      ticketField: "description",
    },
    {
      key: "supportingPhoto",
      label: "Foto pendukung",
      type: "photo",
      helpText: "Opsional. Foto membantu petugas memahami kendala lebih cepat.",
    },
  ],
};
