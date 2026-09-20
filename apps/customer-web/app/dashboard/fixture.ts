export interface DashboardFoundationVM {
  readonly profileStatus:"LOCKED";readonly objectiveLabel:string;readonly activeScenarioCount:number;readonly resultStatus:"READY";
  readonly caseId:string;readonly profileVersionId:string;
  readonly journey:ReadonlyArray<{readonly label:string;readonly status:"PASS"|"READY"|"LOCKED"}>;
  readonly surfacedResult:{readonly routeLabel:string;readonly annualPremiumPence:number;readonly compulsoryExcessPence:number;readonly voluntaryExcessPence:number;readonly policyType:string;readonly comparisonState:"DIRECTLY_COMPARABLE"};
}
export const dashboardFoundationFixture:DashboardFoundationVM={
  profileStatus:"LOCKED",objectiveLabel:"Lowest annual premium",activeScenarioCount:4,resultStatus:"READY",caseId:"CASE-SYN-001",profileVersionId:"RPV-SYN-001",
  journey:[{label:"Profile",status:"LOCKED"},{label:"Objective",status:"PASS"},{label:"Scenarios",status:"PASS"},{label:"Quotes",status:"PASS"},{label:"Your Results",status:"READY"}],
  surfacedResult:{routeLabel:"Synthetic Direct Route",annualPremiumPence:64215,compulsoryExcessPence:25000,voluntaryExcessPence:50000,policyType:"Comprehensive",comparisonState:"DIRECTLY_COMPARABLE"},
};
