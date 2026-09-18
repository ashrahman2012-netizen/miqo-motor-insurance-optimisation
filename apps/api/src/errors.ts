export class ConflictError extends Error {}
export class ValidationError extends Error {
  readonly issues: string[];
  constructor(message: string, issues: string[] = []) { super(message); this.issues = issues; }
}
