# Collections Feature - Implementation Todo

## Overview
Transform the empty Collections section into "Theme Threads" - auto-discovered temporal clusters that answer "What was I exploring?"

## Phase 1: Reading Pipeline (Priority: HIGH)
- [ ] Create "Unread" smart collection (auto-populated, auto-emptied)
- [ ] Create "This Week" temporal view
- [ ] Add basic reading streak/history tracking
- [ ] Integrate into existing search sidebar
- [ ] Deploy to 10% of users for validation

## Phase 2: Theme Threads Core (Priority: HIGH)
- [ ] Database schema: `collections` and `bookmark_collections` tables
- [ ] Job queue integration: `cluster` job type after embed job
- [ ] Clustering algorithm: HDBSCAN on existing embeddings + temporal weighting
- [ ] API endpoints: `GET /collections`, `GET /collections/:id/items`
- [ ] Search sidebar widget showing "Related Collections"

## Phase 3: Collection Types (Priority: MEDIUM)
- [ ] Temporal clusters (Theme Threads) - 3+ items within 14 days
- [ ] Tag co-occurrence collections
- [ ] Domain affinity patterns
- [ ] Quality thresholds: min 3 items, 75% confidence

## Phase 4: Polish & Discovery (Priority: LOW)
- [ ] "Surprise Me" serendipity feature
- [ ] Collection timeline visualization
- [ ] Cross-pollination suggestions
- [ ] Seasonal/anniversary patterns

## Technical Tasks
- [ ] Pre-compute clusters in job queue (no real-time vector search)
- [ ] Zero new AI calls (reuse existing embeddings/artifacts)
- [ ] Performance: Daily job <30min for 100k items
- [ ] Add "hide collection" user feedback mechanism

## Validation Checkpoints
- [ ] Reading Pipeline: Measure engagement % with unread items
- [ ] Theme Threads: Manual review of detected clusters on production data
- [ ] User interviews: 5 users per persona (Research Rabbit, Aspiring Learner, Content Curator)

## Success Metrics
- Target: 15% of searches include Collection click
- Target: 40% of active users view ≥1 Collection weekly
- Target: <10% "not helpful" rate

## Notes
- Keep read-only (no manual collection creation)
- Contextual appearance only (search sidebar), avoid standalone Collections page initially
- Focus on retrospective discovery, not upfront organization
