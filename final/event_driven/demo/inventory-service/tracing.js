const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://jaeger:4318/v1/traces'
  }),
  metricReader: new PrometheusExporter({
    port: 9464
  }),
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
