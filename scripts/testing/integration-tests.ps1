# Integration Tests for Focused To-Do
# Tests the complete API workflows end-to-end

param(
    [switch]$Verbose,       # Verbose output
    [string]$BaseUrl = "http://localhost:8080"
)

$ErrorCount = 0
$TestResults = @()

Write-Host "🔗 FOCUSED TO-DO INTEGRATION TESTS" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host ""

# Function to log test results
function Log-TestResult($TestName, $Status, $Details = "", $Duration = 0) {
    $global:TestResults += [PSCustomObject]@{
        TestName = $TestName
        Status = $Status
        Details = $Details
        Duration = $Duration
    }
    
    $statusIcon = if ($Status -eq "PASS") { "✅" } elseif ($Status -eq "FAIL") { "❌" } else { "⚠️" }
    $color = if ($Status -eq "PASS") { "Green" } elseif ($Status -eq "FAIL") { "Red" } else { "Yellow" }
    
    Write-Host "$statusIcon $TestName`: $Status" -ForegroundColor $color
    if ($Details) {
        Write-Host "   $Details" -ForegroundColor Gray
    }
    if ($Duration -gt 0) {
        Write-Host "   Duration: $($Duration)ms" -ForegroundColor Gray
    }
}

# Function to make HTTP requests
function Invoke-ApiRequest($Method, $Endpoint, $Body = $null) {
    $url = "$BaseUrl$Endpoint"
    $headers = @{ "Content-Type" = "application/json" }
    
    try {
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -Body $jsonBody
        } else {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers
        }
        return @{ Success = $true; Data = $response }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message; StatusCode = $_.Exception.Response.StatusCode }
    }
}

# Test 1: Health Check
function Test-HealthCheck {
    Write-Host "`n🏥 Testing Health Check" -ForegroundColor Yellow
    
    $startTime = Get-Date
    $result = Invoke-ApiRequest "GET" "/api/health"
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    
    if ($result.Success) {
        if ($result.Data.status -eq "ok" -and $result.Data.timestamp -gt 0) {
            Log-TestResult "Health Check" "PASS" "Status: $($result.Data.status)" $duration
        } else {
            $global:ErrorCount++
            Log-TestResult "Health Check" "FAIL" "Invalid health response format"
        }
    } else {
        $global:ErrorCount++
        Log-TestResult "Health Check" "FAIL" "API not accessible: $($result.Error)"
    }
}

# Test 2: Project CRUD Operations
function Test-ProjectCRUD {
    Write-Host "`n📋 Testing Project CRUD Operations" -ForegroundColor Yellow
    
    $projectId = $null
    
    # Test Create Project
    $startTime = Get-Date
    $createData = @{
        name = "Test Project $(Get-Date -Format 'yyyyMMdd-HHmmss')"
        description = "Integration test project"
        color = "#FF0000"
        icon = "🧪"
    }
    
    $result = Invoke-ApiRequest "POST" "/api/projects" $createData
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    
    if ($result.Success -and $result.Data.data.id) {
        $projectId = $result.Data.data.id
        Log-TestResult "Create Project" "PASS" "Project ID: $projectId" $duration
    } else {
        $global:ErrorCount++
        Log-TestResult "Create Project" "FAIL" "Failed to create: $($result.Error)"
        return
    }
    
    # Test Get Projects (should include our new project)
    $startTime = Get-Date
    $result = Invoke-ApiRequest "GET" "/api/projects"
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    
    if ($result.Success) {
        $projects = $result.Data.data
        $ourProject = $projects | Where-Object { $_.id -eq $projectId }
        
        if ($ourProject) {
            Log-TestResult "Get Projects" "PASS" "Found $($projects.Count) projects including ours" $duration
        } else {
            $global:ErrorCount++
            Log-TestResult "Get Projects" "FAIL" "Our project not found in list"
        }
    } else {
        $global:ErrorCount++
        Log-TestResult "Get Projects" "FAIL" "Failed to get projects: $($result.Error)"
    }
    
    return $projectId
}

# Test 3: Task CRUD Operations
function Test-TaskCRUD($ProjectId) {
    if (-not $ProjectId) {
        Log-TestResult "Task CRUD" "SKIP" "No project available"
        return
    }
    
    Write-Host "`n✅ Testing Task CRUD Operations" -ForegroundColor Yellow
    
    $taskId = $null
    
    # Test Create Task
    $startTime = Get-Date
    $createData = @{
        project_id = $ProjectId
        title = "Test Task $(Get-Date -Format 'HHmmss')"
        description = "Integration test task"
        priority = 5
    }
    
    $result = Invoke-ApiRequest "POST" "/api/tasks" $createData
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    
    if ($result.Success -and $result.Data.data.id) {
        $taskId = $result.Data.data.id
        Log-TestResult "Create Task" "PASS" "Task ID: $taskId" $duration
    } else {
        $global:ErrorCount++
        Log-TestResult "Create Task" "FAIL" "Failed to create: $($result.Error)"
        return
    }
    
    # Test Get Tasks for Project
    $startTime = Get-Date
    $result = Invoke-ApiRequest "GET" "/api/tasks?project_id=$ProjectId"
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    
    if ($result.Success) {
        $tasks = $result.Data.data
        $ourTask = $tasks | Where-Object { $_.id -eq $taskId }
        
        if ($ourTask) {
            Log-TestResult "Get Tasks" "PASS" "Found $($tasks.Count) tasks including ours" $duration
        } else {
            $global:ErrorCount++
            Log-TestResult "Get Tasks" "FAIL" "Our task not found in list"
        }
    } else {
        $global:ErrorCount++
        Log-TestResult "Get Tasks" "FAIL" "Failed to get tasks: $($result.Error)"
    }
    
    return $taskId
}

# Test 4: Task Reordering
function Test-TaskReordering($ProjectId, $TaskId) {
    if (-not $ProjectId -or -not $TaskId) {
        Log-TestResult "Task Reordering" "SKIP" "No project or task available"
        return
    }
    
    Write-Host "`n🔄 Testing Task Reordering" -ForegroundColor Yellow
    
    # Create a second task first
    $createData = @{
        project_id = $ProjectId
        title = "Second Test Task"
        description = "For reordering test"
        priority = 3
    }
    
    $result = Invoke-ApiRequest "POST" "/api/tasks" $createData
    if (-not $result.Success) {
        Log-TestResult "Task Reordering" "SKIP" "Could not create second task"
        return
    }
    
    $secondTaskId = $result.Data.data.id
    
    # Test Reorder
    $startTime = Get-Date
    $reorderData = @{
        tasks = @(
            @{ id = $secondTaskId; position = 1 },
            @{ id = $TaskId; position = 2 }
        )
    }
    
    $result = Invoke-ApiRequest "POST" "/api/tasks/reorder" $reorderData
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    
    if ($result.Success) {
        Log-TestResult "Task Reordering" "PASS" "Reordered 2 tasks" $duration
    } else {
        $global:ErrorCount++
        Log-TestResult "Task Reordering" "FAIL" "Failed to reorder: $($result.Error)"
    }
}

# Test 5: Error Handling
function Test-ErrorHandling {
    Write-Host "`n❌ Testing Error Handling" -ForegroundColor Yellow
    
    # Test 404 - Nonexistent endpoint
    $startTime = Get-Date
    $result = Invoke-ApiRequest "GET" "/api/nonexistent"
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    
    if (-not $result.Success -and $result.StatusCode -eq 404) {
        Log-TestResult "404 Error Handling" "PASS" "Correctly returned 404" $duration
    } else {
        $global:ErrorCount++
        Log-TestResult "404 Error Handling" "FAIL" "Expected 404, got: $($result.StatusCode)"
    }
    
    # Test 400 - Invalid data
    $startTime = Get-Date
    $invalidData = @{
        name = ""  # Empty name should be invalid
        description = "Invalid project"
    }
    
    $result = Invoke-ApiRequest "POST" "/api/projects" $invalidData
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    
    if (-not $result.Success -and ($result.StatusCode -eq 400 -or $result.StatusCode -eq "BadRequest")) {
        Log-TestResult "400 Error Handling" "PASS" "Correctly rejected invalid data" $duration
    } else {
        $global:ErrorCount++
        Log-TestResult "400 Error Handling" "FAIL" "Expected 400, got: $($result.StatusCode)"
    }
    
    # Test 405 - Method not allowed
    $startTime = Get-Date
    $result = Invoke-ApiRequest "DELETE" "/api/health"
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    
    if (-not $result.Success -and ($result.StatusCode -eq 405 -or $result.StatusCode -eq "MethodNotAllowed")) {
        Log-TestResult "405 Error Handling" "PASS" "Correctly returned 405" $duration
    } else {
        $global:ErrorCount++
        Log-TestResult "405 Error Handling" "FAIL" "Expected 405, got: $($result.StatusCode)"
    }
}

# Test 6: API Response Format
function Test-ResponseFormat {
    Write-Host "`n📋 Testing API Response Format" -ForegroundColor Yellow
    
    $startTime = Get-Date
    $result = Invoke-ApiRequest "GET" "/api/projects"
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    
    if ($result.Success) {
        $response = $result.Data
        
        # Check if response has expected structure
        if ($response.PSObject.Properties['success'] -and 
            $response.PSObject.Properties['data'] -and 
            $response.PSObject.Properties['timestamp']) {
            Log-TestResult "Response Format" "PASS" "Correct API response structure" $duration
        } else {
            $global:ErrorCount++
            Log-TestResult "Response Format" "FAIL" "Invalid response structure"
            
            if ($Verbose) {
                Write-Host "Response structure:" -ForegroundColor Gray
                $response | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Gray
            }
        }
    } else {
        $global:ErrorCount++
        Log-TestResult "Response Format" "FAIL" "Could not get API response: $($result.Error)"
    }
}

# Test 7: Performance Test
function Test-Performance {
    Write-Host "`n⚡ Testing API Performance" -ForegroundColor Yellow
    
    $healthTimes = @()
    $iterations = 10
    
    # Test multiple health check requests
    for ($i = 1; $i -le $iterations; $i++) {
        $startTime = Get-Date
        $result = Invoke-ApiRequest "GET" "/api/health"
        $duration = ((Get-Date) - $startTime).TotalMilliseconds
        
        if ($result.Success) {
            $healthTimes += $duration
        }
        
        if ($Verbose) {
            Write-Host "  Request $i`: $($duration)ms" -ForegroundColor Gray
        }
    }
    
    if ($healthTimes.Count -gt 0) {
        $avgTime = ($healthTimes | Measure-Object -Average).Average
        $maxTime = ($healthTimes | Measure-Object -Maximum).Maximum
        $minTime = ($healthTimes | Measure-Object -Minimum).Minimum
        
        if ($avgTime -lt 1000) { # Less than 1 second average
            Log-TestResult "Performance Test" "PASS" "Avg: $([math]::Round($avgTime))ms, Min: $([math]::Round($minTime))ms, Max: $([math]::Round($maxTime))ms"
        } else {
            Log-TestResult "Performance Test" "WARN" "Slow response - Avg: $([math]::Round($avgTime))ms"
        }
    } else {
        $global:ErrorCount++
        Log-TestResult "Performance Test" "FAIL" "All requests failed"
    }
}

# Main execution
$overallStartTime = Get-Date

# Check if backend is accessible
Write-Host "Checking backend accessibility..." -ForegroundColor Gray
try {
    $testConnection = Invoke-WebRequest -Uri $BaseUrl -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend is accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend is not accessible at $BaseUrl" -ForegroundColor Red
    Write-Host "Please ensure the backend is running before running integration tests." -ForegroundColor Yellow
    exit 1
}

# Run all tests
Test-HealthCheck
$projectId = Test-ProjectCRUD
$taskId = Test-TaskCRUD $projectId
Test-TaskReordering $projectId $taskId
Test-ErrorHandling
Test-ResponseFormat
Test-Performance

# Generate summary report
Write-Host "`n📊 INTEGRATION TEST SUMMARY" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

$TestResults | Format-Table -AutoSize
$overallDuration = ((Get-Date) - $overallStartTime).TotalSeconds

$passCount = ($TestResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($TestResults | Where-Object { $_.Status -eq "FAIL" }).Count
$warnCount = ($TestResults | Where-Object { $_.Status -eq "WARN" }).Count
$skipCount = ($TestResults | Where-Object { $_.Status -eq "SKIP" }).Count

Write-Host "Results: $passCount passed, $failCount failed, $warnCount warnings, $skipCount skipped" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "Total Duration: $([math]::Round($overallDuration, 2)) seconds" -ForegroundColor Gray

# Exit with error code if any tests failed
if ($ErrorCount -gt 0) {
    Write-Host "`n❌ $ErrorCount integration test(s) failed" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`n✅ All integration tests passed!" -ForegroundColor Green
    exit 0
}