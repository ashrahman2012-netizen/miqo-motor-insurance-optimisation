import {PageHeader,PageState} from "@miqo/ui";
export default function ResultsLoading(){
  return <main><PageHeader eyebrow="Your Results" title="Your Results" description="Loading persisted result and explanation evidence…"/><PageState state="LOADING" title="Loading Your Results" message="Reading the recommendation set, explanation, quotation evidence and integrity state…"/></main>;
}
