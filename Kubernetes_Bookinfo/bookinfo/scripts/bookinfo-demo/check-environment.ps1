$ErrorActionPreference = "Stop"

Write-Host "============================="
Write-Host "Step 2: Checking Environment"
Write-Host "============================="

Write-Host "`n[Check] Docker version:"
docker version

Write-Host "`n[Check] Kubernetes Client version:"
kubectl version --client

Write-Host "`n[Check] Kubernetes Cluster nodes:"
kubectl get nodes

Write-Host "`n[Check] Istio CLI version:"
try {
    istioctl version
} catch {
    Write-Host "Warning: istioctl is not installed or not in PATH. Please install it for Istio features." -ForegroundColor Yellow
}

Write-Host "`nEnvironment check completed."
