# Comprehensive Test Runner for Focused To-Do
# Runs all tests: backend, frontend, integration tests

param(
    [switch]$Coverage,      # Generate coverage reports
    [switch]$Verbose,       # Verbose output
    [switch]$Watch,         # Watch mode for development
    [switch]$Integration,   # Run integration tests
    [string]$Filter = "",   # Filter specific tests
    [switch]$Parallel      # Run tests in parallel where possible
)

$RootDir = Get-Location
$ErrorCount = 0
$TestResults = @()

Write-Host "🧪 FOCUSED TO-DO COMPREHENSIVE TEST SUITE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Function to log test results
function Log-TestResult($Component, $Status, $Details = "", $Duration = 0) {
    $global:TestResults += [PSCustomObject]@{
        Component = $Component
        Status = $Status
        Details = $Details
        Duration = $Duration
    }
    
    $statusIcon = if ($Status -eq "PASS") { "✅" } elseif ($Status -eq "FAIL") { "❌" } else { "⚠️" }
    $color = if ($Status -eq "PASS") { "Green" } elseif ($Status -eq "FAIL") { "Red" } else { "Yellow" }
    
    Write-Host "$statusIcon $Component`: $Status" -ForegroundColor $color
    if ($Details) {
        Write-Host "   $Details" -ForegroundColor Gray
    }
    if ($Duration -gt 0) {
        Write-Host "   Duration: $($Duration)ms" -ForegroundColor Gray
    }
}

# Function to run backend tests
function Test-Backend {
    Write-Host "🔧 BACKEND TESTS (Go)" -ForegroundColor Yellow
    Write-Host "--------------------" -ForegroundColor Yellow
    
    Set-Location "$RootDir/backend"
    
    try {
        # Enable CGO for SQLite
        $env:CGO_ENABLED = "1"
        
        $startTime = Get-Date
        
        if ($Coverage) {
            Write-Host "Running with coverage..." -ForegroundColor Gray
            $output = go test -v -race -coverprofile=coverage.out ./... 2>&1
            $exitCode = $LASTEXITCODE
            
            if ($exitCode -eq 0) {
                # Generate HTML coverage report
                go tool cover -html=coverage.out -o coverage.html
                Log-TestResult "Backend Tests" "PASS" "Coverage report: backend/coverage.html" ((Get-Date) - $startTime).TotalMilliseconds
            }
        } else {
            $output = go test -v -race ./... 2>&1
            $exitCode = $LASTEXITCODE
        }
        
        if ($Verbose) {
            Write-Host $output -ForegroundColor Gray
        }
        
        if ($exitCode -eq 0) {
            $testCount = ($output | Select-String "PASS:").Count
            if (-not $Coverage) {
                Log-TestResult "Backend Tests" "PASS" "$testCount tests passed" ((Get-Date) - $startTime).TotalMilliseconds
            }
        } else {
            $global:ErrorCount++
            Log-TestResult "Backend Tests" "FAIL" "Exit code: $exitCode"
            if (-not $Verbose) {
                Write-Host $output -ForegroundColor Red
            }
        }
        
    } catch {
        $global:ErrorCount++
        Log-TestResult "Backend Tests" "FAIL" "Exception: $_"
    }
    
    Set-Location $RootDir
}

# Function to run frontend tests
function Test-Frontend {
    Write-Host "`n⚛️ FRONTEND TESTS (React/Jest)" -ForegroundColor Yellow
    Write-Host "------------------------------" -ForegroundColor Yellow
    
    Set-Location "$RootDir/frontend"
    
    try {
        $startTime = Get-Date
        
        # Build test command
        $testArgs = @("test")
        if (-not $Watch) { $testArgs += "--watchAll=false" }
        if ($Coverage) { $testArgs += "--coverage" }
        if ($Verbose) { $testArgs += "--verbose" }
        if ($Filter) { $testArgs += "--testNamePattern=$Filter" }
        
        Write-Host "Running: npm $($testArgs -join ' ')" -ForegroundColor Gray
        
        $output = npm @testArgs 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($Verbose) {
            Write-Host $output -ForegroundColor Gray
        }
        
        if ($exitCode -eq 0) {
            # Parse test results
            $passedTests = ($output | Select-String "✓" | Measure-Object).Count
            $testSuites = ($output | Select-String "Test Suites:.*passed" | Select-Object -First 1)
            
            Log-TestResult "Frontend Tests" "PASS" "$passedTests tests passed" ((Get-Date) - $startTime).TotalMilliseconds
            
            if ($Coverage) {
                Log-TestResult "Frontend Coverage" "INFO" "Report: frontend/coverage/lcov-report/index.html"
            }
        } else {
            $global:ErrorCount++
            Log-TestResult "Frontend Tests" "FAIL" "Exit code: $exitCode"
            if (-not $Verbose) {
                Write-Host $output -ForegroundColor Red
            }
        }
        
    } catch {
        $global:ErrorCount++
        Log-TestResult "Frontend Tests" "FAIL" "Exception: $_"
    }
    
    Set-Location $RootDir
}

# Function to run shared types tests
function Test-SharedTypes {
    Write-Host "`n📦 SHARED TYPES TESTS" -ForegroundColor Yellow
    Write-Host "--------------------" -ForegroundColor Yellow
    
    Set-Location "$RootDir/shared"
    
    try {
        $startTime = Get-Date
        
        # Check if types compile
        $output = npm run build 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Log-TestResult "Shared Types" "PASS" "TypeScript compilation successful" ((Get-Date) - $startTime).TotalMilliseconds
        } else {
            $global:ErrorCount++
            Log-TestResult "Shared Types" "FAIL" "TypeScript compilation failed"
            Write-Host $output -ForegroundColor Red
        }
        
    } catch {
        $global:ErrorCount++
        Log-TestResult "Shared Types" "FAIL" "Exception: $_"
    }
    
    Set-Location $RootDir
}

# Function to run integration tests
function Test-Integration {
    if (-not $Integration) { return }
    
    Write-Host "`n🔗 INTEGRATION TESTS" -ForegroundColor Yellow
    Write-Host "-------------------" -ForegroundColor Yellow
    
    try {
        $startTime = Get-Date
        
        # Check if backend is running
        Write-Host "Checking backend availability..." -ForegroundColor Gray
        $backendRunning = $false
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing -TimeoutSec 2
            $backendRunning = $true
        } catch {
            Write-Host "Backend not running, starting test instance..." -ForegroundColor Yellow
            
            # Start backend for testing
            Set-Location "$RootDir/backend"
            $env:CGO_ENABLED = "1"
            go build -o bin/focused-todo-test.exe ./cmd/focused-todo
            $backendProcess = Start-Process -FilePath "bin/focused-todo-test.exe" -WindowStyle Hidden -PassThru
            Start-Sleep -Seconds 3
            Set-Location $RootDir
            
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing -TimeoutSec 5
                $backendRunning = $true
            } catch {
                if ($backendProcess) { Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue }
                throw "Could not start backend for integration tests"
            }
        }
        
        if ($backendRunning) {
            # Run API endpoint tests
            $apiTests = @(
                @{ Endpoint = "/api/health"; Method = "GET"; ExpectedStatus = 200 },
                @{ Endpoint = "/api/projects"; Method = "GET"; ExpectedStatus = 200 }
            )
            
            $passedApiTests = 0
            foreach ($test in $apiTests) {
                try {
                    $response = Invoke-WebRequest -Uri "http://localhost:8080$($test.Endpoint)" -Method $test.Method -UseBasicParsing -TimeoutSec 5
                    if ($response.StatusCode -eq $test.ExpectedStatus) {
                        $passedApiTests++
                        if ($Verbose) {
                            Write-Host "✅ $($test.Method) $($test.Endpoint) - $($response.StatusCode)" -ForegroundColor Green
                        }
                    } else {
                        if ($Verbose) {
                            Write-Host "❌ $($test.Method) $($test.Endpoint) - Expected $($test.ExpectedStatus), got $($response.StatusCode)" -ForegroundColor Red
                        }
                    }
                } catch {
                    if ($Verbose) {
                        Write-Host "❌ $($test.Method) $($test.Endpoint) - Error: $_" -ForegroundColor Red
                    }
                }
            }
            
            if ($passedApiTests -eq $apiTests.Count) {
                Log-TestResult "Integration Tests" "PASS" "$passedApiTests/$($apiTests.Count) API tests passed" ((Get-Date) - $startTime).TotalMilliseconds
            } else {
                $global:ErrorCount++
                Log-TestResult "Integration Tests" "FAIL" "Only $passedApiTests/$($apiTests.Count) API tests passed"
            }
        }
        
        # Clean up test backend if we started it
        if ($backendProcess) {
            Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
        }
        
    } catch {
        $global:ErrorCount++
        Log-TestResult "Integration Tests" "FAIL" "Exception: $_"
    }
}

# Function to run linting
function Test-Linting {
    Write-Host "`n🔍 LINTING & CODE QUALITY" -ForegroundColor Yellow
    Write-Host "-------------------------" -ForegroundColor Yellow
    
    # Frontend linting
    Set-Location "$RootDir/frontend"
    try {
        $startTime = Get-Date
        $output = npm run lint 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Log-TestResult "Frontend Lint" "PASS" "No linting errors" ((Get-Date) - $startTime).TotalMilliseconds
        } else {
            Log-TestResult "Frontend Lint" "WARN" "Linting issues found"
            if ($Verbose) {
                Write-Host $output -ForegroundColor Yellow
            }
        }
    } catch {
        Log-TestResult "Frontend Lint" "WARN" "Linting check failed: $_"
    }
    
    # TypeScript type checking
    try {
        $startTime = Get-Date
        $output = npm run type-check 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Log-TestResult "TypeScript Check" "PASS" "No type errors" ((Get-Date) - $startTime).TotalMilliseconds
        } else {
            $global:ErrorCount++
            Log-TestResult "TypeScript Check" "FAIL" "Type errors found"
            if (-not $Verbose) {
                Write-Host $output -ForegroundColor Red
            }
        }
    } catch {
        $global:ErrorCount++
        Log-TestResult "TypeScript Check" "FAIL" "Type checking failed: $_"
    }
    
    Set-Location $RootDir
}

# Main execution
$overallStartTime = Get-Date

# Run test suites
if ($Parallel -and -not $Watch) {
    Write-Host "Running tests in parallel..." -ForegroundColor Gray
    
    $jobs = @()
    $jobs += Start-Job -ScriptBlock { 
        param($RootDir, $Coverage, $Verbose, $Filter)
        Set-Location $RootDir
        & "$RootDir/test-all.ps1" -Backend -Coverage:$Coverage -Verbose:$Verbose -Filter $Filter
    } -ArgumentList $RootDir, $Coverage, $Verbose, $Filter
    
    $jobs += Start-Job -ScriptBlock { 
        param($RootDir, $Coverage, $Verbose, $Filter)
        Set-Location $RootDir
        & "$RootDir/test-all.ps1" -Frontend -Coverage:$Coverage -Verbose:$Verbose -Filter $Filter
    } -ArgumentList $RootDir, $Coverage, $Verbose, $Filter
    
    # Wait for all jobs to complete
    $jobs | Wait-Job | Receive-Job
    $jobs | Remove-Job
} else {
    # Run sequentially
    Test-SharedTypes
    Test-Backend
    Test-Frontend
    Test-Linting
    Test-Integration
}

# Generate summary report
Write-Host "`n📊 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

$TestResults | Format-Table -AutoSize
$overallDuration = ((Get-Date) - $overallStartTime).TotalSeconds

$passCount = ($TestResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($TestResults | Where-Object { $_.Status -eq "FAIL" }).Count
$warnCount = ($TestResults | Where-Object { $_.Status -eq "WARN" }).Count

Write-Host "Results: $passCount passed, $failCount failed, $warnCount warnings" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "Total Duration: $([math]::Round($overallDuration, 2)) seconds" -ForegroundColor Gray

if ($Coverage) {
    Write-Host "`n📈 COVERAGE REPORTS:" -ForegroundColor Cyan
    Write-Host "Backend: backend/coverage.html" -ForegroundColor Gray
    Write-Host "Frontend: frontend/coverage/lcov-report/index.html" -ForegroundColor Gray
}

# Exit with error code if any tests failed
if ($ErrorCount -gt 0) {
    Write-Host "`n❌ $ErrorCount test suite(s) failed" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`n✅ All tests passed!" -ForegroundColor Green
    exit 0
}