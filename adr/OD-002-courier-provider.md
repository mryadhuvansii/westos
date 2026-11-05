# ADR-002: Courier/Logistics Provider Selection

## Status: PROPOSED (awaiting Operations sign-off)

## Decision
**Recommended: Multi-carrier** — Delhivery (primary, largest coverage) + BlueDart (premium, higher cost) + Ecom Express (cost-effective, fashion-focused).

## Rationale
| Criterion | Delhivery | BlueDart | Ecom Express |
|-----------|-----------|----------|--------------|
| Pin code coverage | Largest India coverage | Premium metros | Good Tier-2/3 |
| API quality | Good REST API | Good API | Moderate API |
| Pickup scheduling | Yes | Yes | Yes |
| Daily manifests | Yes | Yes | Yes |
| Tracking webhooks | Yes | Yes | Limited |
| Cost | Mid | High | Low |
| Fashion experience | Moderate | High | Strong |

## Implementation Implications
- Adapter pattern in `shipping` module (Doc 02 §7.95)
- Multi-carrier support with service codes, rate config, priority (Doc 04 §5.10)
- Daily manifests, pickup scheduling (Doc 04 §5.11)
- Label generation, tracking, pickup, manifests
- Buyback (Phase 11) requires courier partner for delivery-time verification

## Open Items
- [ ] Operations to confirm carrier contracts & API docs
- [ ] Pickup coverage confirmation for target pin codes
- [ ] Rate card integration into shipping cost calculator
- [ ] Tracking webhook endpoint configuration

## Owner
Operations + Engineering Lead

## Target Date
Phase 0, Week 1