<#
.SYNOPSIS
Deploys the Gemini API Key to Supabase Edge Functions.

.DESCRIPTION
This script uses the Supabase CLI to log in and set the GEMINI_API_KEY secret 
for the PharMinds Algeria project, then redeploys the Edge Functions so they 
can use the new key.
#>

$ProjectRef = "bwtgavgdwihqdlbpystw"
$ApiKey = "AIzaSyCVGO1kIFZY7yfiWKay9zCk51h1hDjOw_Y"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " PharMinds Supabase API Key Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Ensure Supabase CLI is available
Write-Host "[1/4] Checking for Supabase CLI..."
try {
    $SupabaseExists = Get-Command "npx" -ErrorAction SilentlyContinue
    if (-not $SupabaseExists) {
        throw "Node.js (npx) is not installed. Please install Node.js."
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "[2/4] Logging into Supabase (browser will open)..."
Write-Host "IMPORTANT: Please complete the login in your browser, then return to this window." -ForegroundColor Yellow
npx -y supabase@latest login

Write-Host ""
Write-Host "[3/4] Setting GEMINI_API_KEY secret..."
# The token is passed via pipe to secrets set
$ApiKey | npx -y supabase@latest secrets set GEMINI_API_KEY --project-ref $ProjectRef

Write-Host ""
Write-Host "[4/4] Redeploying Edge Functions..."
Write-Host "Deploying scan-prescription..."
npx -y supabase@latest functions deploy scan-prescription --project-ref $ProjectRef

Write-Host "Deploying ai-chat..."
npx -y supabase@latest functions deploy ai-chat --project-ref $ProjectRef

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host " Deployment Complete! " -ForegroundColor Green
Write-Host " The AI features should now be working." -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null
