import { itSupportTemplate } from "@/features/divisions/it/request-template";
import { purchaseRequestTemplate } from "@/features/divisions/purchase/request-template";

import type { ServiceRequestTemplate } from "./template-types";

export type {
  ServiceRequestField,
  ServiceRequestFieldType,
  ServiceRequestTemplate,
  TicketField,
} from "./template-types";

export const genericServiceRequestTemplate: ServiceRequestTemplate = {
  key: "generic-request",
  serviceDivision: "",
  label: "General Request",
  description: "Send your request to the destination division.",
  fields: [
    {
      key: "title",
      label: "Request title",
      type: "text",
      required: true,
      maxLength: 200,
      placeholder: "Example: Request for document information",
      ticketField: "title",
    },
    {
      key: "description",
      label: "Describe your request",
      type: "textarea",
      maxLength: 10_000,
      placeholder: "Describe your request in detail.",
      ticketField: "description",
    },
  ],
};

export const serviceRequestTemplates = [
  itSupportTemplate,
  purchaseRequestTemplate,
] as const satisfies readonly ServiceRequestTemplate[];

const templatesByKey = new Map(
  serviceRequestTemplates.map((template) => [template.key, template]),
);

export function getServiceRequestTemplate(key: string | null | undefined) {
  return key ? templatesByKey.get(key) ?? null : null;
}
