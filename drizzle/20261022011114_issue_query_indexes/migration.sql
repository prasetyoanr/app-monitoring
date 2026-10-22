CREATE INDEX "troubleshooting_issues_source_workflow_idx" ON "troubleshooting_issues" ("source","workflow_status");--> statement-breakpoint
CREATE INDEX "troubleshooting_issues_service_lane_idx" ON "troubleshooting_issues" ("service_lane") WHERE "service_lane" is not null;--> statement-breakpoint
CREATE INDEX "troubleshooting_issues_approver_idx" ON "troubleshooting_issues" ("approver_id");--> statement-breakpoint
CREATE INDEX "troubleshooting_issues_final_approver_idx" ON "troubleshooting_issues" ("final_approver_id");