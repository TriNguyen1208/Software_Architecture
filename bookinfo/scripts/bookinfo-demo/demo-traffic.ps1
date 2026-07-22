$ErrorActionPreference = "Stop"

Write-Host "============================="
Write-Host "Step 6: Demo Traffic Routing"
Write-Host "============================="

Write-Host "`n[Action] Applying Gateway..."
kubectl apply -n bookinfo -f networking/bookinfo-gateway.yaml

Write-Host "`n[Action] Applying Destination Rules (Subsets)..."
kubectl apply -n bookinfo -f networking/destination-rule-all.yaml

Write-Host "`n[Action] Applying VirtualService to route all traffic to v1..."
kubectl apply -n bookinfo -f networking/virtual-service-all-v1.yaml

Write-Host "`nTraffic is now routed to v1. You can access the app at the Gateway IP."
Write-Host "To port forward: kubectl port-forward -n istio-system svc/istio-ingressgateway 8080:80"
