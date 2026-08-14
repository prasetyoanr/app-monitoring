import { itSupportTemplate } from "./it-support";
import { purchaseRequestTemplate } from "./purchase-request";
import type { ServiceRequestTemplate } from "./types";

export type { ServiceRequestField, ServiceRequestFieldType, ServiceRequestTemplate, TicketField } from "./types";

export const serviceRequestTemplates: readonly ServiceRequestTemplate[] = [
  itSupportTemplate,
  purchaseRequestTemplate,
];

export function getServiceRequestTemplate(key: string) {
  return serviceRequestTemplates.find((template) => template.key === key) ?? null;
}
