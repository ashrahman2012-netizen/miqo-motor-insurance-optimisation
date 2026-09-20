import {createApplicationEnvironmentVM,type ApplicationEnvironment,type ApplicationEnvironmentVM} from "@miqo/ui";

export function resolveApplicationEnvironment():ApplicationEnvironmentVM|null {
  const declared=(process.env.MIQO_APPLICATION_ENVIRONMENT??process.env.MIQO_DATA_CLASSIFICATION??"").trim().toUpperCase();
  if(declared==="SYNTHETIC"||declared==="CERTIFICATION"||declared==="PRODUCTION") return createApplicationEnvironmentVM(declared as ApplicationEnvironment);
  return null;
}
