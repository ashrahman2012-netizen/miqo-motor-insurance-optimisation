import {composeCustomerDocumentsPageVM} from "@miqo/application-adapters";
import type {ApplicationEnvironment,CustomerDocumentsPageVM} from "@miqo/application-contracts";
import {loadCustomerDashboard} from "../dashboard/load-dashboard";

export async function loadDocumentsPage(args:{
  profileId:string|null;
  environment:ApplicationEnvironment;
}):Promise<CustomerDocumentsPageVM>{
  const dashboard=await loadCustomerDashboard(args);
  return composeCustomerDocumentsPageVM({dashboard});
}
