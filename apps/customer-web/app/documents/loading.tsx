import {PageHeader,PageState} from "@miqo/ui";
export default function Loading(){return <main><PageHeader eyebrow="Documents" title="Documents & Records" description="Loading your MIQOS application records…"/><PageState state="LOADING" title="Loading records" message="Reading the current profile, scenarios, quote evidence and result records…"/></main>;}
