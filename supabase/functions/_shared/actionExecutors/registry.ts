import { ActionExecutor } from "./types.ts";
import { githubCreateIssue } from "./github.ts";
import { googleCalendarCreateEvent, gmailCreateDraft } from "./google.ts";

/**
 * Registry of action_type -> executor function.
 * Add new providers here.
 */
const executorRegistry: Record<string, ActionExecutor> = {
  github_create_issue: githubCreateIssue,
  calendar_create_event: googleCalendarCreateEvent,
  gmail_create_draft: gmailCreateDraft,
};

export function getExecutor(actionType: string): ActionExecutor | null {
  return executorRegistry[actionType] || null;
}

export function listSupportedActions(): string[] {
  return Object.keys(executorRegistry);
}
