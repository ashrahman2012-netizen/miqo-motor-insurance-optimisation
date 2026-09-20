import {PageHeader,PageState} from "@miqo/ui";
export default function QuotesLoading(){
  return <main><PageHeader eyebrow="Quotes" title="Quote Comparison" description="Loading quotation evidence…"/><PageState state="LOADING" title="Loading quote comparison" message="Reading the selected objective, scenario lineage and normalised quotation evidence…"/></main>;
}
