# MIQOS-CXM-FORM-SUBMIT-001 — Direct Form Submission Gateway & Attachment Delivery

## Scope

This execution item connects the standalone/hosted MIQOS Customer Information Request Form **CIRF-1.2.2** to the MIQOS API without using `mailto:`.

The runtime remains **SYNTHETIC / NON-PRODUCTION / NON-CUSTOMER**. The real-customer data gate remains closed.

## Customer flow

```text
CIRF-1.2.2
  -> POST /api/v1/customer-information-requests/submit
  -> multipart validation + idempotency
  -> customer/intake database transaction
  -> HTML snapshot rendered to PDF by local Chrome/Chromium
  -> PDF + Excel attached to Gmail API message
  -> Gmail acceptance
  -> success response
  -> browser confirmation page
```

A success response is only returned when both `pdfGenerated=true` and `emailAccepted=true`.

## Request contract

Content type: `multipart/form-data`.

Required headers:

- `X-MIQOS-Form-Version: CIRF-1.2.2`
- `Idempotency-Key: <payload.clientSubmissionId>`

Required parts:

- `payload` — JSON matching `miqos.customer-information-request.v1`
- `html` — completed HTML snapshot
- `excel` — Excel-compatible export
- `subject` — must begin `[MIQOS NEW CUSTOMER]`
- `formVersion` — `CIRF-1.2.2`
- `renderPdf` — `true`

The multipart request is bounded to 6.5 MB. HTML is capped at 4.5 MB and Excel at 1.5 MB.

## Persistence and idempotency

Migration `0015_cxm_direct_form_submission.sql` adds:

- `customer_intake_submission.source_channel`
  - `CONTROLLED_MAILBOX`
  - `DIRECT_FORM`
- direct form submissions require `source_mailbox IS NULL`
- `customer_form_delivery`
  - one delivery record per intake submission
  - unique idempotency key
  - HTML, Excel and PDF SHA-256 hashes
  - PDF generation state
  - Gmail provider message ID
  - delivery state `PENDING | SENT | FAILED`
  - delivery-attempt count
  - synthetic-only constraint

The database intake transaction commits before the external Gmail call. If PDF rendering or Gmail delivery fails, the delivery record is marked `FAILED`. A retry with the same idempotency key reuses the same customer/intake submission and retries only the delivery work.

A completed `SENT` idempotent replay returns the original success result and does not send a second email.

## PDF renderer

The gateway renders the completed HTML snapshot with a locally installed headless Chrome/Chromium/Edge executable.

Auto-detection covers common Windows, macOS and Linux locations. Override with:

```text
MIQO_CHROME_EXECUTABLE=<absolute executable path>
```

The generated output must begin with the PDF signature before it is accepted.

## Gmail delivery

The server uses the Gmail API and OAuth refresh-token flow. Credentials stay server-side.

Required runtime settings:

```text
MIQO_GMAIL_CLIENT_ID=
MIQO_GMAIL_CLIENT_SECRET=
MIQO_GMAIL_REFRESH_TOKEN=
MIQO_GMAIL_SENDER=miqos.new@gmail.com
MIQO_GMAIL_RECIPIENT=miqos.new@gmail.com
```

The authorized Google account must have Gmail send permission. Do not place any of these secrets in the HTML, repository, screenshots, issues, PR comments, or chat.

The ChatGPT Gmail connection is separate and is not a credential source for this runtime.

## Local synthetic-file mode

To allow a downloaded `file://` form to call the local gateway, the API must be explicitly configured:

```text
MIQO_DATA_CLASSIFICATION=SYNTHETIC
MIQO_LIVE_PROVIDERS_ENABLED=false
MIQO_FORM_SUBMISSION_ENABLED=true
MIQO_ALLOW_FILE_ORIGIN=true
DATABASE_URL=postgresql://miqo:miqo@127.0.0.1:5432/miqo
```

`MIQO_ALLOW_FILE_ORIGIN=true` admits the browser `Origin: null` value only for this explicitly enabled synthetic local workflow. It is not a production setting.

Typical local sequence:

```text
npm ci
npm run db:up
npm run db:migrate
npm run dev:api
```

The form targets:

```text
http://127.0.0.1:4000/api/v1/customer-information-requests/submit
```

## Failure semantics

- invalid multipart/payload -> 422
- idempotency conflict -> 409
- gateway disabled / real-data boundary conflict -> 409
- PDF or Gmail delivery failure after persistence -> 502
- success -> 201
- completed idempotent replay -> 200

A 502 does **not** create another customer/intake record on retry.

## Certification

Automated proof includes:

- SQL schema/source-channel contract
- direct-form multipart route
- synthetic customer creation
- identity deduplication
- PDF attachment generation adapter boundary
- PDF + Excel Gmail attachment contract
- `Origin: null` local-file CORS path when explicitly enabled
- completed idempotent replay with no second send
- failed Gmail delivery followed by successful retry against the same committed submission

Actual Gmail acceptance remains an environment credential gate until an OAuth client/refresh token is configured in the runtime.
