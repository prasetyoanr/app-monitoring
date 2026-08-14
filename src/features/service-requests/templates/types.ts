export type ServiceRequestFieldType =
  | "text"
  | "textarea"
  | "select"
  | "number"
  | "date"
  | "master-category"
  | "master-location"
  | "photo";

export type TicketField = "title" | "category" | "location" | "description";

export interface ServiceRequestField {
  key: string;
  label: string;
  type: ServiceRequestFieldType;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  helpText?: string;
  options?: readonly string[];
  ticketField?: TicketField;
}

export interface ServiceRequestTemplate {
  key: string;
  serviceDivision: string;
  label: string;
  description: string;
  fallbackLocation?: string;
  fields: readonly ServiceRequestField[];
}
