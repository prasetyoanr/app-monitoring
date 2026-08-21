import type { ServiceRequestTemplate } from "../../service-requests/template-types";

export const purchaseRequestTemplate: ServiceRequestTemplate = {
  key: "purchase-request",
  serviceDivision: "Purchase",
  label: "Purchase Request",
  description: "Submit a goods or services request to the Purchase division.",
  fields: [
    {
      key: "title",
      label: "Request title",
      type: "text",
      required: true,
      maxLength: 200,
      placeholder: "Example: Printer toner procurement",
      ticketField: "title",
    },
    {
      key: "purchaseType",
      label: "Request type",
      type: "select",
      required: true,
      options: ["Goods", "Services", "Urgent purchase"],
      ticketField: "category",
    },
    {
      key: "itemName",
      label: "Item or service name",
      type: "text",
      required: true,
      maxLength: 200,
      placeholder: "Example: HP 85A toner",
    },
    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      required: true,
      placeholder: "Example: 2",
    },
    {
      key: "neededBy",
      label: "Required by date",
      type: "date",
      required: true,
    },
    {
      key: "description",
      label: "Reason and specifications",
      type: "textarea",
      required: true,
      maxLength: 10_000,
      placeholder: "Enter the reason, specifications, or supporting information.",
      ticketField: "description",
    },
  ],
};
