# ADR-021: Feature Flag Design

## Status: PROPOSED

## Decision
**Environment-based feature flags** stored in `store_settings` (buyback already uses this pattern). Admin toggle in settings UI. No separate feature flag service at launch.

## Implementation
```ts
// StoreSettings type
{ upiId: string; buybackEnabled: boolean; revision: number }
// Future flags: enableCod, enablePrepaid, enableReturns, enableWishlist, enableBuybackClaims
```

## Rollout Strategy
- Default: all flags off except core catalogue/browse
- Admin enables flags per store
- Buyback flag controls program info display only (cannot enable claims/credits yet — Doc 06 §11.1)

## Future
- LaunchDarkly or similar for percentage rollouts
- User-segmented flags

## Owner
Architecture

## Target Date
Phase 0, Week 2