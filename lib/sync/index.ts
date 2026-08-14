/* eslint-disable simple-import-sort/exports */
export type { ConflictResolution, DevicePreferences, MergeResult } from './conflict-resolution';
export type { SyncBatch, SyncQueueItem } from './service';

// Phase 4: Version History
export { versionHistoryService, VersionHistoryService } from './version-history';
export { diffService, DiffService } from './diff-service';
export { recoveryService, RecoveryService } from './recovery-service';

// Phase 5: Real-time Sync
export { syncNotificationService, SyncNotificationService } from './sync-notification';

// Phase 6: Branching & Performance
export { versionBranchingService, VersionBranchingService } from './version-branching';
export { syncPerformanceService, SyncPerformanceService } from './sync-performance';

// Phase 0-3: Original services
export { conflictResolutionService, ConflictResolutionService } from './conflict-resolution';
export { syncService, SyncService } from './service';
/* eslint-enable simple-import-sort/exports */
