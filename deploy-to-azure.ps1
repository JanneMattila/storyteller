#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploys the Storyteller application to Azure App Service.

.DESCRIPTION
    This script creates a deployment package from the Node.js source files and deploys it
    to Azure App Service. No build step is needed — the app runs directly from source.
    Requires Azure CLI to be installed and authenticated (az login).

.PARAMETER AppName
    The name of the Azure App Service to deploy to.

.PARAMETER ResourceGroup
    The name of the Azure Resource Group containing the App Service.

.PARAMETER DeployEnvAsAppSettings
    Path to a .env file whose key=value pairs will be set as App Service app settings.

.PARAMETER WhatIf
    Show what would be deployed without actually deploying.

.EXAMPLE
    .\deploy-to-azure.ps1 -AppName "storyteller" -ResourceGroup "rg-app-services"

.EXAMPLE
    .\deploy-to-azure.ps1 -AppName "storyteller-dev" -ResourceGroup "rg-dev" -WhatIf
#>

param(
    [Parameter(Mandatory = $false, HelpMessage = "Azure App Service name")]
    [string]$AppName = "storyteller",
    
    [Parameter(Mandatory = $false, HelpMessage = "Azure Resource Group name")]
    [string]$ResourceGroup = "rg-app-services",
    
    [Parameter(Mandatory = $false, HelpMessage = "Path to .env file to deploy as app settings")]
    [string]$DeployEnvAsAppSettings,
    
    [Parameter(Mandatory = $false)]
    [switch]$WhatIf,
    
    [Parameter(Mandatory = $false, HelpMessage = "Open browser after deployment")]
    [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "  $Message" -ForegroundColor Gray
}

# Script start
Write-Host @"

╔══════════════════════════════════════════════════════════╗
║                                                          ║
║     Storyteller - Azure App Service Deployment           ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

Write-Info "App Service: $AppName"
Write-Info "Resource Group: $ResourceGroup"
Write-Info "WhatIf Mode: $WhatIf"
Write-Host ""

# Check if Azure CLI is installed
Write-Step "Checking prerequisites..."
try {
    $azVersion = az version --output json 2>&1 | ConvertFrom-Json
    Write-Success "Azure CLI version $($azVersion.'azure-cli') found"
} catch {
    Write-Error "Azure CLI not found. Please install from: https://aka.ms/installazurecliwindows"
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>&1
    Write-Success "Node.js $nodeVersion found"
} catch {
    Write-Error "Node.js not found. Please install from: https://nodejs.org/"
    exit 1
}

# Check if logged in to Azure
Write-Step "Checking Azure authentication..."
try {
    $account = az account show --output json 2>&1 | ConvertFrom-Json
    Write-Success "Logged in as: $($account.user.name)"
    Write-Info "Subscription: $($account.name) ($($account.id))"
} catch {
    Write-Error "Not logged in to Azure. Please run: az login"
    exit 1
}

# Verify App Service exists
Write-Step "Verifying App Service exists..."
try {
    $appService = az webapp show --name $AppName --resource-group $ResourceGroup --output json 2>&1 | ConvertFrom-Json
    Write-Success "App Service found: $($appService.defaultHostName)"
    Write-Info "Location: $($appService.location)"
    Write-Info "Plan: $($appService.appServicePlanName)"
} catch {
    Write-Error "App Service '$AppName' not found in resource group '$ResourceGroup'"
    Write-Info "Available app services:"
    az webapp list --resource-group $ResourceGroup --query "[].name" --output table
    exit 1
}

if ($WhatIf) {
    Write-Step "WhatIf Mode - Skipping deployment"
    Write-Info "Would deploy to: https://$($appService.defaultHostName)"
    exit 0
}

# Configure App Service - let Oryx run npm install during deployment
Write-Step "Configuring App Service..."
az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $AppName `
    --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true NODE_ENV=production STORIES_PATH=/home/site/stories `
    --output none

# Deploy .env file as app settings
if ($DeployEnvAsAppSettings) {
    if (-not (Test-Path $DeployEnvAsAppSettings)) {
        Write-Error "Env file not found: $DeployEnvAsAppSettings"
        exit 1
    }

    Write-Step "Setting app settings from $DeployEnvAsAppSettings..."
    $settings = @()
    foreach ($line in Get-Content $DeployEnvAsAppSettings) {
        $line = $line.Trim()
        # Skip blank lines and comments
        if ($line -eq '' -or $line.StartsWith('#')) { continue }
        # Only process lines with key=value
        if ($line -match '^([^=]+)=(.*)$') {
            $key = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            $settings += "$key=$value"
            Write-Info "$key = ****"
        }
    }

    if ($settings.Count -gt 0) {
        az webapp config appsettings set `
            --resource-group $ResourceGroup `
            --name $AppName `
            --settings @settings `
            --output none

        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to set app settings from env file"
            exit 1
        }
        Write-Success "Set $($settings.Count) app settings from env file"
    } else {
        Write-Info "No settings found in env file"
    }
}

# Create deployment package
Write-Step "Creating deployment package..."
$zipPath = "deploy.zip"
$zipFullPath = Join-Path (Get-Location) $zipPath

if (Test-Path $zipFullPath) {
    Remove-Item -Path $zipFullPath -Force
}

# Package source files needed for deployment (no build step — plain Node.js app)
$itemsToZip = @(
    "server.js",
    "package.json",
    "models",
    "routes",
    "services",
    "public"
)

# Verify all required files/folders exist
foreach ($item in $itemsToZip) {
    if (-not (Test-Path $item)) {
        Write-Error "Required path not found: $item"
        exit 1
    }
}

try {
    Compress-Archive -Path $itemsToZip -DestinationPath $zipFullPath -Force
    Write-Success "Deployment package created: $zipPath"
} catch {
    Write-Error "Failed to create deployment package: $_"
    exit 1
}

$zipSize = (Get-Item $zipFullPath).Length / 1MB
Write-Info "Package size: $([math]::Round($zipSize, 2)) MB"

# Deploy to Azure
Write-Step "Deploying to Azure App Service..."
Write-Info "This may take a few minutes..."

try {
    az webapp deploy `
        --resource-group $ResourceGroup `
        --name $AppName `
        --src-path $zipFullPath `
        --type zip `
        --async true `
        --output none
    
    if ($LASTEXITCODE -ne 0) {
        throw "Deployment command failed"
    }
    
    Write-Success "Deployment initiated successfully"
} catch {
    Write-Error "Deployment failed: $_"
    Write-Info "Check deployment logs: az webapp log tail --name $AppName --resource-group $ResourceGroup"
    exit 1
}

# Wait a moment for deployment to start
Write-Info "Waiting for deployment to process..."
Start-Sleep -Seconds 5

# Get deployment status
Write-Step "Checking deployment status..."
try {
    $deployments = az webapp log deployment list `
        --resource-group $ResourceGroup `
        --name $AppName `
        --query "[0]" `
        --output json | ConvertFrom-Json
    
    if ($deployments) {
        Write-Info "Status: $($deployments.status)"
        Write-Info "Deployed: $($deployments.received_time)"
    }
} catch {
    Write-Info "Unable to get deployment status (deployment may still be in progress)"
}

# Clean up deployment package
if (Test-Path $zipFullPath) {
    Remove-Item -Path $zipFullPath -Force
    Write-Info "Cleaned up deployment package"
}

# Final output
Write-Host @"

╔══════════════════════════════════════════════════════════╗
║                                                          ║
║              Deployment Completed!                       ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Green

Write-Host "Application URL: " -NoNewline
Write-Host "https://$($appService.defaultHostName)" -ForegroundColor Cyan

Write-Host "`nUseful commands:"
Write-Host "  View logs:       " -NoNewline
Write-Host "az webapp log tail --name $AppName --resource-group $ResourceGroup" -ForegroundColor Yellow
Write-Host "  Open in browser: " -NoNewline
Write-Host "az webapp browse --name $AppName --resource-group $ResourceGroup" -ForegroundColor Yellow
Write-Host "  SSH to container: " -NoNewline
Write-Host "az webapp ssh --name $AppName --resource-group $ResourceGroup" -ForegroundColor Yellow
Write-Host ""

# Open browser if requested
if ($OpenBrowser) {
    az webapp browse --name $AppName --resource-group $ResourceGroup
}

Write-Success "Deployment script completed successfully!"
