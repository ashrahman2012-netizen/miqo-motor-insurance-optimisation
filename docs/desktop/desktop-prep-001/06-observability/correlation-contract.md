# MIQOS Desktop Correlation & Trace Contract v1.0

**Gateway:** G6
**Status:** FROZEN AT G6

## 1. Standard

Use W3C Trace Context `traceparent` for Desktop → MIQOS API operation correlation.

The trace identifier contains no customer/personally identifying data.

## 2. Desktop generation

For each logical API operation, the native MIQOS transport creates or continues a standards-valid trace context.

Desktop logs record:

- trace ID;
- operation;
- session correlation ID;
- safe resource identifier if applicable.

The renderer must not encode customer data into trace identifiers.

## 3. Server handling

The API must:

- validate incoming `traceparent`;
- ignore/restart invalid trace context;
- correlate valid trace ID with the server request;
- retain its own server-generated request ID;
- include trace/request identifiers in structured server logging.

The server request ID and distributed trace ID are distinct concepts.

## 4. Fastify boundary

The current Fastify baseline already creates/logs request IDs through its logging infrastructure, but it does not currently define the Desktop trace propagation contract.

G6 therefore does not enable an unvalidated caller-controlled Fastify request ID header.

Instead, W3C trace context is parsed separately and correlated with the server's own request ID.

## 5. Error response correlation

Protected API error responses should return a safe correlation/reference ID usable by support.

A response must never echo tokens/security headers.

Logical response metadata:

~~~text
traceId
requestId
errorCode
~~~

Only safe identifiers need be exposed to the renderer.

## 6. Domain-audit relationship

A request trace may be attached to a newly generated domain/security audit event where an authoritative server operation creates such evidence.

Correlation does not convert operational logs into domain audit.

## 7. Security-sensitive reads

Raw-provider-evidence reads require:

- authenticated subject reference;
- server request ID;
- distributed trace ID;
- evidence resource ID;
- permission/outcome.

The operational Desktop log records only safe correlation metadata; the authoritative sensitive-read access audit is server-side.

## 8. Sampling

The initial Desktop support model does not require trace sampling because it stores only bounded local operational metadata and no remote span exporter.

If remote tracing is introduced later, sampling/privacy/export policy requires a separate observability decision.
