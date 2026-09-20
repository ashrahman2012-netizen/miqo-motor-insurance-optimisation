import {PageHeader,PageState} from "@miqo/ui";
export default function OptimiseLoading(){
  return <main><PageHeader eyebrow="Scenarios" title="Objective & Scenario Explorer" description="Loading optimisation policy and scenario evidence…"/><PageState state="LOADING" title="Loading scenario explorer" message="Reading the locked profile, current optimisation catalogue and persisted scenario evidence…"/></main>;
}
