import {PageHeader,PageState} from "@miqo/ui";
export default function ProfileLoading(){
  return <main><PageHeader eyebrow="Your profile" title="Profile Review & Lock" description="Loading current profile state…"/><PageState state="LOADING" title="Loading profile" message="Reading the current profile version and validation evidence…"/></main>;
}
