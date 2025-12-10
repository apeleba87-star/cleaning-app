# 모바일 접속 문제 빠른 해결 스크립트
# 관리자 권한으로 실행 필요!

Write-Host "=== 모바일 접속 문제 해결 스크립트 ===" -ForegroundColor Green
Write-Host ""

# 1. PC의 IP 주소 확인
Write-Host "1. PC의 IP 주소 확인 중..." -ForegroundColor Yellow
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*" -and
    $_.IPAddress -notlike "172.17.*"
} | Select-Object IPAddress, InterfaceAlias

if ($ipAddresses) {
    Write-Host "   찾은 IP 주소:" -ForegroundColor Cyan
    foreach ($ip in $ipAddresses) {
        Write-Host "   - $($ip.IPAddress) ($($ip.InterfaceAlias))" -ForegroundColor White
    }
    $mainIP = ($ipAddresses | Select-Object -First 1).IPAddress
    Write-Host ""
    Write-Host "   모바일에서 접속할 주소: http://$mainIP:3000" -ForegroundColor Green
} else {
    Write-Host "   IP 주소를 찾을 수 없습니다." -ForegroundColor Red
}
Write-Host ""

# 2. 방화벽 규칙 확인
Write-Host "2. 방화벽 규칙 확인 중..." -ForegroundColor Yellow
$existingRule = netsh advfirewall firewall show rule name="Next.js Dev Server" 2>$null

if ($existingRule) {
    Write-Host "   기존 방화벽 규칙이 있습니다." -ForegroundColor Cyan
    Write-Host "   규칙 삭제 후 재생성..." -ForegroundColor Yellow
    netsh advfirewall firewall delete rule name="Next.js Dev Server" 2>$null | Out-Null
}

# 3. 방화벽 규칙 추가
Write-Host "3. 방화벽 규칙 추가 중..." -ForegroundColor Yellow
$result = netsh advfirewall firewall add rule name="Next.js Dev Server" dir=in action=allow protocol=TCP localport=3000 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ 방화벽 규칙이 성공적으로 추가되었습니다!" -ForegroundColor Green
} else {
    Write-Host "   ❌ 방화벽 규칙 추가 실패. 관리자 권한이 필요합니다." -ForegroundColor Red
    Write-Host "   오류: $result" -ForegroundColor Red
}
Write-Host ""

# 4. 서버 상태 확인
Write-Host "4. 서버 상태 확인 중..." -ForegroundColor Yellow
$serverStatus = netstat -ano | findstr :3000 | findstr LISTENING

if ($serverStatus) {
    Write-Host "   ✅ 서버가 포트 3000에서 실행 중입니다." -ForegroundColor Green
    
    # 0.0.0.0으로 바인딩되어 있는지 확인
    if ($serverStatus -match "0.0.0.0:3000") {
        Write-Host "   ✅ 서버가 외부 접속을 허용하도록 설정되어 있습니다 (0.0.0.0)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  서버가 localhost만 바인딩하고 있습니다." -ForegroundColor Yellow
        Write-Host "      다음 명령어로 재시작하세요: npm run dev:mobile" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ❌ 서버가 실행되고 있지 않습니다." -ForegroundColor Red
    Write-Host "      다음 명령어로 시작하세요: npm run dev:mobile" -ForegroundColor Cyan
}
Write-Host ""

# 5. 최종 안내
Write-Host "=== 최종 안내 ===" -ForegroundColor Green
Write-Host ""
Write-Host "1. 서버가 실행 중인지 확인:" -ForegroundColor Yellow
Write-Host "   npm run dev:mobile" -ForegroundColor Cyan
Write-Host ""
if ($mainIP) {
    Write-Host "2. 모바일 기기에서 접속:" -ForegroundColor Yellow
    Write-Host "   http://$mainIP:3000" -ForegroundColor Cyan
    Write-Host ""
}
Write-Host "3. PC와 모바일이 같은 WiFi 네트워크에 연결되어 있어야 합니다!" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. 여전히 안 되면 브라우저 개발자 도구 사용 (F12 → Ctrl+Shift+M)" -ForegroundColor Yellow
Write-Host ""


