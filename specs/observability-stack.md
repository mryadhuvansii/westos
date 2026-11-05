# Observability Stack Specification

## Endpoints
- `GET /health` — Liveness probe (returns 200 if worker is running)
- `GET /readiness` — Readiness probe (returns 200 if DB and dependencies are reachable)

## Metrics (Prometheus)
| Metric | Type | Description |
|--------|------|-------------|
| http_requests_total | Counter | Total HTTP requests by method, route, status |
| http_request_duration_seconds | Histogram | Request latency by route |
| orders_created_total | Counter | Orders created by status |
| payment_success_total | Counter | Successful payments |
| payment_failure_total | Counter | Failed payments by reason |
| inventory_reservation_errors_total | Counter | Inventory reservation failures |
| active_users_total | Gauge | Currently active customer sessions |

## Logs (Loki)
Structured JSON logs with fields: `timestamp`, `level`, `service`, `request_id`, `route`, `message`, `error`.

## Tracing (Jaeger)
Distributed tracing for cross-module operations: order creation → inventory reservation → payment → shipping.

## Alerts (Alertmanager)
| Alert | Condition | Severity |
|-------|-----------|----------|
| High error rate | API error rate > 5% for 5 min | critical |
| Payment webhook failure | Webhook returns non-200 for 5 min | critical |
| Database unreachable | Readiness probe fails for 2 min | critical |
| Inventory spike | Reservation expiry rate > normal baseline | warning |

## Owner
DevOps/SRE

## Target Date
Phase 0, Week 2