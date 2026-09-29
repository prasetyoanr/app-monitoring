# Service division modules

Each folder represents a service with a dedicated form or workflow.

- `it/`: IT support request template.
- `purchase/`: procurement request template.

Divisions without special requirements do not need a folder and can use the general form. For a new service, create a folder only when it needs a dedicated template, validation, or component. Register the template in `src/features/service-requests/template-registry.ts`.

The `Location` field is managed by the core form and applies to every division. A template can define additional fields, validation, and layout for a division. Use `ticketField` to store answers in core ticket information such as the title, category, or description.
