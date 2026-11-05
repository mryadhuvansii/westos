# ADR-0001: Observability Stack

## Status: PROPOSED

## Decision
**Loki + Prometheus + Grafana + Jaeger + Alertmanager** for logging, metrics, tracing, alerting. Health check endpoints: `/health`, `/readiness`.

## Stack
| Concern | Tool |
|---------|------|
| Logging | Loki (structured JSON logs) |
| Metrics | Prometheus |
| Dashboards | Grafana |
| Tracing | Jaeger |
| Alerting | Alertmanager |
| Health checks | `/health` (liveness), `/readiness` (readiness) |

## Metrics to Track
- Order success rate (>99% target, Phase 6)
- Payment success rate (>98% target, Phase 6)
- API latency (p50, p95, p99)
- Error rate by endpoint
- Inventory accuracy
- Buyback adoption (Phase 11)

## Alerts
- API error rate > 5% for 5 minutes
- Payment webhook failure
- Inventory reservation expiry spike
- Database connection failure

## Owner
DevOps/SRE

## Target Date
Phase 0, Week 2