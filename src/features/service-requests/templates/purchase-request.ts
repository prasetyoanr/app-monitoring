import type { ServiceRequestTemplate } from "./types";

export const purchaseRequestTemplate: ServiceRequestTemplate = {
  key: "purchase-request",
  serviceDivision: "Purchase",
  label: "Permintaan Purchase",
  description: "Ajukan kebutuhan barang atau jasa kepada divisi Purchase.",
  fallbackLocation: "Tidak ditentukan",
  fields: [
    {
      key: "title",
      label: "Judul permintaan",
      type: "text",
      required: true,
      maxLength: 200,
      placeholder: "Contoh: Pengadaan toner printer",
      ticketField: "title",
    },
    {
      key: "purchaseType",
      label: "Jenis kebutuhan",
      type: "select",
      required: true,
      options: ["Barang", "Jasa", "Pembelian mendesak"],
      ticketField: "category",
    },
    {
      key: "itemName",
      label: "Nama barang atau jasa",
      type: "text",
      required: true,
      maxLength: 200,
      placeholder: "Contoh: Toner HP 85A",
    },
    {
      key: "quantity",
      label: "Jumlah kebutuhan",
      type: "number",
      required: true,
      placeholder: "Contoh: 2",
    },
    {
      key: "neededBy",
      label: "Tanggal dibutuhkan",
      type: "date",
      required: true,
    },
    {
      key: "description",
      label: "Alasan dan spesifikasi kebutuhan",
      type: "textarea",
      required: true,
      maxLength: 10_000,
      placeholder: "Tuliskan alasan kebutuhan, spesifikasi, atau informasi pendukung.",
      ticketField: "description",
    },
  ],
};
