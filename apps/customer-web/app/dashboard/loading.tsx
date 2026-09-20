import {PageHeader,PageState} from "@miqo/ui";
export default function DashboardLoading(){
  return <main><PageHeader eyebrow="Customer" title="Customer dashboard" description="Your motor insurance journey, optimised."/><PageState state="LOADING" title="Loading dashboard" message="Reading your current application state…"/></main>;
}
