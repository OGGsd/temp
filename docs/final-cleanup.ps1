# Final AxieStudio Documentation Cleanup Script
# Comprehensive removal of all remaining Langflow references

Write-Host "🎯 Final AxieStudio Cleanup - Removing ALL Langflow References" -ForegroundColor Green
Write-Host "📋 Systematic replacement of remaining Langflow references" -ForegroundColor Yellow

# Define comprehensive replacement mappings
$replacements = @{
    # Core product name replacements
    "Langflow" = "AxieStudio"
    "langflow" = "axiestudio"
    
    # Specific phrases that need context-aware replacement
    "third-party integrations with Langflow" = "third-party integrations with AxieStudio"
    "Langflow's" = "AxieStudio's"
    "langflow's" = "axiestudio's"
    "in Langflow" = "in AxieStudio"
    "with Langflow" = "with AxieStudio"
    "to Langflow" = "to AxieStudio"
    "from Langflow" = "from AxieStudio"
    "using Langflow" = "using AxieStudio"
    "Langflow agents" = "AxieStudio agents"
    "Langflow flows" = "AxieStudio flows"
    "Langflow components" = "AxieStudio components"
    "Langflow server" = "AxieStudio server"
    "Langflow instance" = "AxieStudio instance"
    "Langflow codebase" = "AxieStudio codebase"
    "Langflow documentation" = "AxieStudio documentation"
    "Langflow docs" = "AxieStudio docs"
    "Langflow version" = "AxieStudio version"
    "Langflow quickstart" = "AxieStudio quickstart"
    "Use Langflow" = "Use AxieStudio"
    "Integrate" = "Integrate"
    "connect Langflow" = "connect AxieStudio"
    "your Langflow" = "your AxieStudio"
    "the Langflow" = "the AxieStudio"
    "Langflow MCP" = "AxieStudio MCP"
    "Langflow API" = "AxieStudio API"
    "Langflow file" = "AxieStudio file"
    "Langflow visual" = "AxieStudio visual"
    "Langflow engine" = "AxieStudio engine"
    "Langflow's engine" = "AxieStudio's engine"
    "Langflow team" = "AxieStudio team"
    "Contribute" = "Contribute"
    "contribute" = "contribute"
    
    # Environment and technical references
    "LANGFLOW_" = "AXIESTUDIO_"
    "langflow." = "axiestudio."
    "from langflow" = "from axiestudio"
    "import langflow" = "import axiestudio"
    
    # URL and domain replacements
    "docs.langflow.org" = "docs.axiestudio.se"
    "www.langflow.org" = "www.axiestudio.se"
    "langflow.org" = "axiestudio.se"
    
    # Docker and package references
    "langflowai/langflow" = "axiestudio/axiestudio"
    "langflow:latest" = "axiestudio:latest"
    "langflow-" = "axiestudio-"
    
    # File and path references
    "/langflow/" = "/axiestudio/"
    "\\langflow\\" = "\\axiestudio\\"
    ".langflow" = ".axiestudio"
    
    # GitHub references
    "langflow-ai" = "axiestudio"
    "AxieStudio-ai" = "axiestudio"
    
    # Component and integration specific
    "Langflow-specific" = "AxieStudio-specific"
    "langflow-specific" = "axiestudio-specific"
}

# Function to safely replace content in files
function Update-FileContent {
    param(
        [string]$FilePath,
        [hashtable]$Replacements
    )
    
    try {
        $content = Get-Content -Path $FilePath -Raw -Encoding UTF8
        $originalContent = $content
        $changed = $false
        
        foreach ($find in $Replacements.Keys) {
            $replace = $Replacements[$find]
            if ($content -match [regex]::Escape($find)) {
                $content = $content -replace [regex]::Escape($find), $replace
                $changed = $true
            }
        }
        
        if ($changed) {
            Set-Content -Path $FilePath -Value $content -Encoding UTF8 -NoNewline
            Write-Host "✅ Updated: $FilePath" -ForegroundColor Green
            return $true
        }
        
        return $false
    }
    catch {
        Write-Host "❌ Error updating $FilePath : $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Get all MDX files recursively
$files = Get-ChildItem -Path "." -Include "*.mdx" -Recurse | Where-Object {
    # Exclude build, cache, and node_modules directories
    $_.FullName -notmatch "\\(build|\.docusaurus|node_modules|\.git)\\"
}

$totalFiles = 0
$updatedFiles = 0

Write-Host "🔍 Processing $($files.Count) documentation files..." -ForegroundColor Cyan

foreach ($file in $files) {
    $totalFiles++
    if (Update-FileContent -FilePath $file.FullName -Replacements $replacements) {
        $updatedFiles++
    }
}

Write-Host "`n🎉 Final Cleanup Complete!" -ForegroundColor Green
Write-Host "📊 Statistics:" -ForegroundColor Yellow
Write-Host "   Total files processed: $totalFiles" -ForegroundColor White
Write-Host "   Files updated: $updatedFiles" -ForegroundColor White
Write-Host "   Files unchanged: $($totalFiles - $updatedFiles)" -ForegroundColor White

Write-Host "`n🚀 All Langflow references have been replaced with AxieStudio!" -ForegroundColor Cyan
Write-Host "   Your documentation is now fully rebranded." -ForegroundColor White
