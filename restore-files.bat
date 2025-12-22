@echo off
chcp 65001
cd /d "%~dp0"
git checkout 5f84dbf -- app/business/stores/status/page.tsx
git checkout 5f84dbf -- app/api/business/stores/status/route.ts
git checkout 5f84dbf -- app/api/business/stores/[id]/status/route.ts
if exist "app\api\business\stores\[id]\problem-reports\route.ts" git checkout 5f84dbf -- app/api/business/stores/[id]/problem-reports/route.ts
if exist "app\api\business\stores\[id]\lost-items\route.ts" git checkout 5f84dbf -- app/api/business/stores/[id]/lost-items/route.ts
if exist "app\api\business\problem-reports\[id]\complete\route.ts" git checkout 5f84dbf -- app/api/business/problem-reports/[id]/complete/route.ts
if exist "app\api\business\problem-reports\[id]\confirm\route.ts" git checkout 5f84dbf -- app/api/business/problem-reports/[id]/confirm/route.ts
if exist "app\api\business\lost-items\[id]\confirm\route.ts" git checkout 5f84dbf -- app/api/business/lost-items/[id]/confirm/route.ts
echo.
echo Files restored from commit 5f84dbf
echo.
pause














