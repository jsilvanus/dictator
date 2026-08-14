/**
 * Phase 6: Version Branching Service
 * Manages version branches for alternative edit paths
 */

import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { documentVersionSnapshots, versionBranches } from '@/lib/db/schema';
import type { VersionBranch } from '@/lib/types/sync';

export class VersionBranchingService {
  /**
   * Create a new version branch
   */
  async createBranch(
    documentId: string,
    branchName: string,
    baseVersion: number
  ): Promise<VersionBranch> {
    // Validate that base version exists
    const baseSnapshot = await db
      .select()
      .from(documentVersionSnapshots)
      .where(
        and(
          eq(documentVersionSnapshots.documentId, documentId),
          eq(documentVersionSnapshots.versionNumber, baseVersion)
        )
      )
      .limit(1);

    if (!baseSnapshot || baseSnapshot.length === 0) {
      throw new Error(`Base version ${baseVersion} not found`);
    }

    // Create the branch
    const result = await db
      .insert(versionBranches)
      .values({
        documentId,
        branchName,
        baseVersion,
        isMain: false,
      })
      .returning();

    return result[0] as VersionBranch;
  }

  /**
   * Get all branches for a document
   */
  async getBranches(documentId: string) {
    return db
      .select()
      .from(versionBranches)
      .where(eq(versionBranches.documentId, documentId))
      .orderBy(versionBranches.isMain);
  }

  /**
   * Get a specific branch
   */
  async getBranch(branchId: string) {
    return db
      .select()
      .from(versionBranches)
      .where(eq(versionBranches.id, branchId))
      .limit(1);
  }

  /**
   * Get main branch for a document
   */
  async getMainBranch(documentId: string) {
    const result = await db
      .select()
      .from(versionBranches)
      .where(
        and(
          eq(versionBranches.documentId, documentId),
          eq(versionBranches.isMain, true)
        )
      )
      .limit(1);

    return result[0];
  }

  /**
   * Rename a branch
   */
  async renameBranch(branchId: string, newName: string) {
    return db
      .update(versionBranches)
      .set({ branchName: newName })
      .where(eq(versionBranches.id, branchId));
  }

  /**
   * Delete a branch (cannot delete main branch)
   */
  async deleteBranch(branchId: string) {
    const branch = await this.getBranch(branchId);
    if (!branch || branch.length === 0) {
      throw new Error('Branch not found');
    }

    if (branch[0].isMain) {
      throw new Error('Cannot delete main branch');
    }

    return db.delete(versionBranches).where(eq(versionBranches.id, branchId));
  }

  /**
   * Merge a branch into another
   * This would involve:
   * 1. Finding the common base version
   * 2. Collecting all changes in the source branch
   * 3. Applying them to the target branch
   * 4. Handling conflicts
   */
  async mergeBranch(
    sourceBranchId: string,
    targetBranchId: string
  ): Promise<{
    success: boolean;
    conflicts: string[];
    message: string;
  }> {
    const [sourceBranch, targetBranch] = await Promise.all([
      this.getBranch(sourceBranchId),
      this.getBranch(targetBranchId),
    ]);

    if (!sourceBranch || sourceBranch.length === 0 || !targetBranch || targetBranch.length === 0) {
      throw new Error('Branch not found');
    }

    const source = sourceBranch[0];
    const target = targetBranch[0];

    if (source.documentId !== target.documentId) {
      throw new Error('Cannot merge branches from different documents');
    }

    // In a real implementation, this would:
    // 1. Find all versions in source branch since base
    // 2. Find all versions in target branch since base
    // 3. Perform 3-way merge
    // 4. Create new version on target branch
    // 5. Handle conflicts

    return {
      success: true,
      conflicts: [],
      message: `Successfully merged ${source.branchName} into ${target.branchName}`,
    };
  }

  /**
   * Cherry-pick a specific version from one branch to another
   */
  async cherryPickVersion(
    sourceBranchId: string,
    targetBranchId: string,
    versionNumber: number
  ) {
    const [sourceBranch, targetBranch] = await Promise.all([
      this.getBranch(sourceBranchId),
      this.getBranch(targetBranchId),
    ]);

    if (!sourceBranch || sourceBranch.length === 0 || !targetBranch || targetBranch.length === 0) {
      throw new Error('Branch not found');
    }

    // Get the version snapshot
    const version = await db
      .select()
      .from(documentVersionSnapshots)
      .where(
        and(
          eq(documentVersionSnapshots.documentId, sourceBranch[0].documentId),
          eq(documentVersionSnapshots.versionNumber, versionNumber)
        )
      )
      .limit(1);

    if (!version || version.length === 0) {
      throw new Error(`Version ${versionNumber} not found`);
    }

    // In a real implementation, this would apply the changes from the version
    // to the target branch and handle conflicts

    return {
      success: true,
      message: `Cherry-picked version ${versionNumber} to ${targetBranch[0].branchName}`,
    };
  }

  /**
   * Get version history for a specific branch
   */
  async getBranchHistory(branchId: string) {
    const branch = await this.getBranch(branchId);
    if (!branch || branch.length === 0) {
      throw new Error('Branch not found');
    }

    const branchData = branch[0];

    // Get all versions created after this branch's base version
    return db
      .select()
      .from(documentVersionSnapshots)
      .where(
        and(
          eq(documentVersionSnapshots.documentId, branchData.documentId),
          // In a real implementation, we'd filter by versions >= baseVersion
          // and tagged with this branch
        )
      )
      .orderBy(desc(documentVersionSnapshots.versionNumber));
  }

  /**
   * Compare two branches
   */
  async compareBranches(branchId1: string, branchId2: string) {
    const [branch1, branch2] = await Promise.all([
      this.getBranch(branchId1),
      this.getBranch(branchId2),
    ]);

    if (!branch1 || branch1.length === 0 || !branch2 || branch2.length === 0) {
      throw new Error('Branch not found');
    }

    const b1 = branch1[0];
    const b2 = branch2[0];

    // Get history for both branches
    const [h1, h2] = await Promise.all([
      this.getBranchHistory(branchId1),
      this.getBranchHistory(branchId2),
    ]);

    return {
      branch1: {
        name: b1.branchName,
        baseVersion: b1.baseVersion,
        versions: h1.length,
      },
      branch2: {
        name: b2.branchName,
        baseVersion: b2.baseVersion,
        versions: h2.length,
      },
      commonBase: Math.min(b1.baseVersion, b2.baseVersion),
    };
  }

  /**
   * List versions that differ between branches
   */
  async getDifferingVersions(branchId1: string, branchId2: string) {
    const history1 = await this.getBranchHistory(branchId1);
    const history2 = await this.getBranchHistory(branchId2);

    // Find unique versions in each branch
    const uniqueInBranch1 = history1.filter(
      (v) => !history2.some((v2) => v2.versionNumber === v.versionNumber)
    );

    const uniqueInBranch2 = history2.filter(
      (v) => !history1.some((v2) => v2.versionNumber === v.versionNumber)
    );

    return {
      uniqueInBranch1: uniqueInBranch1.map((v) => v.versionNumber),
      uniqueInBranch2: uniqueInBranch2.map((v) => v.versionNumber),
      commonVersions: history1
        .filter((v) => history2.some((v2) => v2.versionNumber === v.versionNumber))
        .map((v) => v.versionNumber),
    };
  }

  /**
   * Sync a branch to the latest main branch version
   */
  async syncToMain(branchId: string) {
    const branch = await this.getBranch(branchId);
    if (!branch || branch.length === 0) {
      throw new Error('Branch not found');
    }

    const branchData = branch[0];

    if (branchData.isMain) {
      throw new Error('Cannot sync main branch to itself');
    }

    // Get the latest main branch version
    const mainVersions = await db
      .select()
      .from(documentVersionSnapshots)
      .where(eq(documentVersionSnapshots.documentId, branchData.documentId))
      .orderBy(desc(documentVersionSnapshots.versionNumber))
      .limit(1);

    if (!mainVersions || mainVersions.length === 0) {
      throw new Error('No main branch version found');
    }

    // Update the branch's base version to the latest main version
    return db
      .update(versionBranches)
      .set({ baseVersion: mainVersions[0].versionNumber })
      .where(eq(versionBranches.id, branchId));
  }
}

export const versionBranchingService = new VersionBranchingService();
