import {PageHeader,PageState} from "@miqo/ui";
export default function AdminAuditLoading(){
  return <main><PageHeader eyebrow="Administration" title="Audit & Trace Console" description="Loading append-only evidence and lineage…"/><PageState state="LOADING" title="Loading audit evidence" message="Reading lifecycle events, end-to-end selection lineage and provider evidence…"/></main>;
}
