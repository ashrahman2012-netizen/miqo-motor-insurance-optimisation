import {Card,ComparisonStateBadge,ContentGrid,DefinitionList,LineageId,MoneyAmount,PageHeader,SectionHeading,StatusBadge} from "@miqo/ui";
import {dashboardFoundationFixture as dashboard} from "./fixture";

export default function CustomerDashboard(){
  return <main>
    <PageHeader eyebrow="Customer · Foundation proving surface" title="Customer dashboard" description="BUILD-001A proves the shared shell, semantic design system, environment identity and ViewModel-shaped presentation boundary. Workflow actions are intentionally not implemented in this increment."/>
    <ContentGrid columns={4}>
      <Card><p className="miqos-eyebrow">Profile status</p><StatusBadge status={dashboard.profileStatus}/><p>Factual profile presentation is locked/read-only.</p></Card>
      <Card><p className="miqos-eyebrow">Objective</p><h2 style={{fontSize:"1rem",marginBottom:".4rem"}}>{dashboard.objectiveLabel}</h2><p>Objective-specific result ordering only.</p></Card>
      <Card><p className="miqos-eyebrow">Active scenarios</p><strong style={{fontSize:"2rem"}}>{dashboard.activeScenarioCount}</strong><p>Synthetic fixture — no scenario execution here.</p></Card>
      <Card><p className="miqos-eyebrow">Results status</p><StatusBadge status={dashboard.resultStatus}/><p>Ready presentation state; handoff is not enabled.</p></Card>
    </ContentGrid>
    <SectionHeading title="Current journey" description="Status is supplied to the UI; the dashboard does not calculate workflow eligibility."/>
    <ContentGrid columns={3}>{dashboard.journey.map(step=><Card key={step.label}><p className="miqos-eyebrow">{step.label}</p><StatusBadge status={step.status}/></Card>)}</ContentGrid>
    <SectionHeading title="Foundation fixture" description="Synthetic content demonstrates information hierarchy without creating a live quotation or provider-specific interface."/>
    <ContentGrid columns={2}>
      <Card><h2>Current case</h2><DefinitionList items={[
        {label:"Case",value:<LineageId value={dashboard.caseId} label="Case ID"/>},
        {label:"Profile version",value:<LineageId value={dashboard.profileVersionId} label="Profile version ID"/>},
        {label:"Data mode",value:<StatusBadge status="SYNTHETIC"/>},
        {label:"Handoff",value:<StatusBadge status="NOT_AUTHORISED"/>},
      ]}/></Card>
      <Card emphasis><p className="miqos-eyebrow">Top result for selected objective</p><h2>{dashboard.surfacedResult.routeLabel}</h2><ComparisonStateBadge state={dashboard.surfacedResult.comparisonState}/><DefinitionList items={[
        {label:"Annual premium",value:<MoneyAmount pence={dashboard.surfacedResult.annualPremiumPence}/>},
        {label:"Compulsory excess",value:<MoneyAmount pence={dashboard.surfacedResult.compulsoryExcessPence}/>},
        {label:"Voluntary excess",value:<MoneyAmount pence={dashboard.surfacedResult.voluntaryExcessPence}/>},
        {label:"Policy type",value:dashboard.surfacedResult.policyType},
      ]}/><p style={{marginBottom:0}}>Synthetic proving data only. This screen does not execute a quote, select a provider, purchase or bind insurance.</p></Card>
    </ContentGrid>
  </main>;
}
