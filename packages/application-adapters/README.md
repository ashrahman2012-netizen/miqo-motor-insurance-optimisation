# @miqo/application-adapters

Pure API/read-model → application ViewModel mapping. No network access, persistence, React, provider adapters or business-rule authority.

BUILD-001B introduces the customer dashboard composition adapter. It consumes persisted objective/scenario/quote/recommendation evidence and never re-ranks quotations or upgrades eligibility/comparability state.

BUILD-001H adds customer-facing Documents & Records, Activity and Help & Support composition. These adapters are presentation projections only: they do not generate insurer documents, expose raw provider payloads to customers, mutate audit evidence, create support tickets, or perform messaging/document-upload actions.
