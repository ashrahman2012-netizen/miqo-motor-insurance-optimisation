import {composeCustomerSupportPageVM} from "@miqo/application-adapters";
import type {ApplicationEnvironment,CustomerSupportPageVM} from "@miqo/application-contracts";

export async function loadSupportPage(args:{
  profileId:string|null;
  environment:ApplicationEnvironment;
}):Promise<CustomerSupportPageVM>{
  return composeCustomerSupportPageVM(args);
}
