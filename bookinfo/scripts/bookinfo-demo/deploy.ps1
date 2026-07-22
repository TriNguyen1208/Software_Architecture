$ErrorActionPreference = "Stop"

Write-Host "============================="
Write-Host "Step 4: Deploying Istio & Bookinfo"
Write-Host "============================="

Write-Host "`n[Action] Installing Istio demo profile..."
try {
    istioctl install --set profile=demo -y
} catch {
    Write-Host "Failed to install Istio. Make sure istioctl is in PATH." -ForegroundColor Red
    exit 1
}

Write-Host "`n[Action] Creating bookinfo namespace..."
kubectl create namespace bookinfo

Write-Host "`n[Action] Labeling namespace for sidecar injection..."
kubectl label namespace bookinfo istio-injection=enabled

Write-Host "`n[Action] Applying Bookinfo manifests..."
# Assuming script is run from the repository root
kubectl apply -n bookinfo -f platform/kube/bookinfo.yaml

Write-Host "`nDeployment initiated. Run verify.ps1 to check status."
