# ADR-007: Search API Specification

## Status: PROPOSED

## Decision
**Server-side filtering on `/api/store`** with query params (`q`, `category`, `fit`, `collection`, `sort`, `page`, `limit`). Full-text search (Elasticsearch/Meilisearch) deferred to Phase 9+.

## Rationale
Current catalogue is small (8 sample products). Server-side filtering covers MVP requirements. Dedicated search engine adds infrastructure cost not justified at launch.

## API Contract
```
GET /api/store?q=straight&category=Men&fit=Slim&collection=New%20arrivals&sort=price-asc&page=1&limit=12
Response: { products[], total, page, limit, pageCount, settings, initialized }
```

## Future Enhancement
- Meilisearch or Algolia for faceted search, synonyms, typo tolerance
- Search analytics in `analytics` module

## Owner
Engineering

## Target Date
Phase 0, Week 2