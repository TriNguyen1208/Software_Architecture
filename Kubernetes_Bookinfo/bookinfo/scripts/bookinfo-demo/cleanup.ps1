$ErrorActionPreference = "Continue"

Write-Host "============================="
Write-Host "Step 7: Cleanup"
Write-Host "============================="

Write-Host "`n[Action] Deleting Bookinfo namespace..."
kubectl delete namespace bookinfo

Write-Host "`n[Cleanup] Bookinfo demo resources have been deleted."
Write-Host "If you wish to uninstall Istio, run: istioctl uninstall -y --purge; kubectl delete namespace istio-system"
