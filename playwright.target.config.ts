import {defineConfig} from "@playwright/test";
export default defineConfig({testDir:"./e2e-target",timeout:45000,use:{baseURL:"http://127.0.0.1:3000",trace:"retain-on-failure"},webServer:[
 {command:"PORT=4000 MIQO_DATA_CLASSIFICATION=SYNTHETIC MIQO_LIVE_PROVIDERS_ENABLED=false DATABASE_URL=$DATABASE_URL CUSTOMER_WEB_URL=http://127.0.0.1:3000 ADMIN_WEB_URL=http://127.0.0.1:3001 npm run dev -w @miqo/api",url:"http://127.0.0.1:4000/health",reuseExistingServer:false,timeout:30000},
 {command:"NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 NEXT_PUBLIC_ADMIN_WEB_URL=http://127.0.0.1:3001 npm run dev -w @miqo/customer-web -- --hostname 127.0.0.1",url:"http://127.0.0.1:3000",reuseExistingServer:false,timeout:60000},
 {command:"NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 npm run dev -w @miqo/admin-web -- --hostname 127.0.0.1",url:"http://127.0.0.1:3001",reuseExistingServer:false,timeout:60000}
],projects:[{name:"chromium",use:{browserName:"chromium"}}]});
