$ErrorActionPreference = "Stop"

Write-Host "============================="
Write-Host "Step 5: Verifying Bookinfo"
Write-Host "============================="

Write-Host "`n[Verify] Checking Pods..."
kubectl get pods -n bookinfo -o wide

Write-Host "`n[Verify] Checking sidecars (expecting 2 containers per pod)..."
kubectl get pods -n bookinfo -o custom-columns=NAME:.metadata.name,CONTAINERS:.spec.containers[*].name

Write-Host "`n[Verify] Checking Services..."
kubectl get services -n bookinfo

Write-Host "`nVerification completed."
