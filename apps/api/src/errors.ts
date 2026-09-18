export class ConflictError extends Error {}
export class ValidationError extends Error {
  readonly issues: string[];
  constructor(message: string, issues: string[] = []) { super(message); this.issues = issues; }
}

export class PreQuoteIntegrityError extends ConflictError {
  readonly signals: ReadonlyArray<Readonly<{ruleId:string;evidence:Readonly<Record<string,unknown>>}>>;
  constructor(signals: ReadonlyArray<Readonly<{ruleId:string;evidence:Readonly<Record<string,unknown>>}>>) {
    super("PRE_QUOTE_INTEGRITY_BLOCKED");
    this.signals=signals;
  }
}
