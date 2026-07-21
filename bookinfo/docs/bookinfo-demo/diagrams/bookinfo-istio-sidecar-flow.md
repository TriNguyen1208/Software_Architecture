# Sơ đồ: Sidecar Flow

```mermaid
flowchart LR
    subgraph ProductPagePod[productpage Pod]
        PPA[productpage container]
        PPE[istio-proxy]
    end

    subgraph ReviewsPod[reviews Pod]
        RE[istio-proxy]
        RA[reviews container]
    end

    PPA --> PPE
    PPE -->|network| RE
    RE --> RA
```
