import type { ServiceRequestTemplate } from "../../service-requests/template-types";

export const itSupportTemplate: ServiceRequestTemplate = {
  key: "it-support",
  serviceDivision: "IT Team",
  label: "IT Support",
  description: "Report device, application, access, or network issues to the IT team.",
  fields: [
    {
      key: "title",
      label: "Request title",
      type: "text",
      required: true,
      maxLength: 200,
      placeholder: "Example: Laptop cannot connect to Wi-Fi",
      ticketField: "title",
    },
    {
      key: "category",
      label: "Category",
      type: "master-category",
      required: true,
      ticketField: "category",
    },
    {
      key: "description",
      label: "Describe your request",
      type: "textarea",
      maxLength: 10_000,
      placeholder: "Describe the issue or request in detail.",
      ticketField: "description",
    },
    {
      key: "supportingPhoto",
      label: "Supporting photo",
      type: "photo",
      helpText: "Optional. A photo helps the team understand the issue faster.",
    },
  ],
};
