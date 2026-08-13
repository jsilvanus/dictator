/**
 * Phase 4: Diff Service
 * Generates and manages diffs between versions
 */

import type { VersionDiff } from '@/lib/types/sync';

interface DiffLine {
  type: 'addition' | 'deletion' | 'context';
  content: string;
  lineNumber?: number;
}

export class DiffService {
  /**
   * Simple line-based diff algorithm (LCS-based)
   * Generates differences between two text versions
   */
  generateDiff(from: string, to: string): VersionDiff {
    const fromLines = from.split('\n');
    const toLines = to.split('\n');

    // Calculate line-based diff
    const diffLines = this.computeLineDiff(fromLines, toLines);

    // Extract additions and deletions
    const additions: string[] = [];
    const deletions: string[] = [];
    const modifications: Array<{ line: number; from: string; to: string }> = [];

    
    for (let i = 0; i < diffLines.length; i++) {
      const line = diffLines[i];
      if (line.type === 'addition') {
        additions.push(line.content);
      } else if (line.type === 'deletion') {
        deletions.push(line.content);
      }
    }

    // Generate unified diff format
    const unifiedDiff = this.generateUnifiedDiff(fromLines, toLines);

    return {
      from: 0, // Placeholder
      to: 1, // Placeholder
      additions,
      deletions,
      modifications,
      unifiedDiff,
    };
  }

  /**
   * Compute line-based LCS (Longest Common Subsequence) diff
   */
  private computeLineDiff(from: string[], to: string[]): DiffLine[] {
    const lcs = this.longestCommonSubsequence(from, to);
    const diff: DiffLine[] = [];

    let fromIdx = 0;
    let toIdx = 0;

    for (const lcsItem of lcs) {
      // Add deletions
      while (fromIdx < lcsItem.fromIndex) {
        diff.push({
          type: 'deletion',
          content: from[fromIdx],
          lineNumber: fromIdx,
        });
        fromIdx++;
      }

      // Add additions
      while (toIdx < lcsItem.toIndex) {
        diff.push({
          type: 'addition',
          content: to[toIdx],
          lineNumber: toIdx,
        });
        toIdx++;
      }

      // Add context (common line)
      diff.push({
        type: 'context',
        content: from[fromIdx],
        lineNumber: fromIdx,
      });

      fromIdx++;
      toIdx++;
    }

    // Add remaining deletions and additions
    while (fromIdx < from.length) {
      diff.push({
        type: 'deletion',
        content: from[fromIdx],
        lineNumber: fromIdx,
      });
      fromIdx++;
    }

    while (toIdx < to.length) {
      diff.push({
        type: 'addition',
        content: to[toIdx],
        lineNumber: toIdx,
      });
      toIdx++;
    }

    return diff;
  }

  /**
   * Calculate Longest Common Subsequence
   */
  private longestCommonSubsequence(
    from: string[],
    to: string[]
  ): Array<{ fromIndex: number; toIndex: number }> {
    const m = from.length;
    const n = to.length;

    // Create DP table
    const dp: number[][] = Array(m + 1)
      .fill(0)
      .map(() => Array(n + 1).fill(0));

    // Fill DP table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (from[i - 1] === to[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Reconstruct LCS
    const lcs: Array<{ fromIndex: number; toIndex: number }> = [];
    let i = m;
    let j = n;

    while (i > 0 && j > 0) {
      if (from[i - 1] === to[j - 1]) {
        lcs.unshift({ fromIndex: i - 1, toIndex: j - 1 });
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return lcs;
  }

  /**
   * Generate unified diff format (compatible with patch tools)
   */
  private generateUnifiedDiff(from: string[], to: string[]): string {
    const lines: string[] = [];
    const diff = this.computeLineDiff(from, to);

    lines.push('--- a');
    lines.push('+++ b');

    let hunkStart = -1;
    let hunkLines: string[] = [];

    for (const line of diff) {
      if (line.type === 'deletion') {
        if (hunkStart === -1) {
          hunkStart = from.indexOf(line.content);
        }
        hunkLines.push(`-${line.content}`);
      } else if (line.type === 'addition') {
        if (hunkStart === -1) {
          hunkStart = to.indexOf(line.content);
        }
        hunkLines.push(`+${line.content}`);
      } else if (line.type === 'context') {
        hunkLines.push(` ${line.content}`);
      }
    }

    // Add hunk header and lines
    if (hunkLines.length > 0) {
      lines.push(`@@ -1,${from.length} +1,${to.length} @@`);
      lines.push(...hunkLines);
    }

    return lines.join('\n');
  }

  /**
   * Calculate text similarity (0-100)
   */
  calculateSimilarity(from: string, to: string): number {
    if (from === to) return 100;
    if (from.length === 0 && to.length === 0) return 100;
    if (from.length === 0 || to.length === 0) return 0;

    const fromLines = from.split('\n');
    const toLines = to.split('\n');
    const lcs = this.longestCommonSubsequence(fromLines, toLines);

    const maxLength = Math.max(fromLines.length, toLines.length);
    const similarity = (lcs.length / maxLength) * 100;

    return Math.round(similarity);
  }

  /**
   * Apply a patch to text content
   */
  applyPatch(content: string, unifiedDiff: string): string | null {
    try {
      const lines = content.split('\n');
      const diffLines = unifiedDiff.split('\n');

      let currentLine = 0;
      for (const diffLine of diffLines) {
        if (diffLine.startsWith('-')) {
          // Deletion
          const content = diffLine.substring(1);
          if (lines[currentLine] === content) {
            lines.splice(currentLine, 1);
          }
        } else if (diffLine.startsWith('+')) {
          // Addition
          const content = diffLine.substring(1);
          lines.splice(currentLine, 0, content);
          currentLine++;
        } else if (!diffLine.startsWith('@') && !diffLine.startsWith('---') && !diffLine.startsWith('+++')) {
          // Context
          currentLine++;
        }
      }

      return lines.join('\n');
    } catch {
      return null;
    }
  }

  /**
   * Merge diffs from multiple sources (3-way merge)
   */
  merge3Way(
    base: string,
    version1: string,
    version2: string
  ): { content: string; conflicts: string[] } {
    const conflicts: string[] = [];
    const baseLines = base.split('\n');
    const v1Lines = version1.split('\n');
    const v2Lines = version2.split('\n');

    // Simple 3-way merge: if both changed similarly, accept; if conflicting, flag
    const result: string[] = [];

    const maxLen = Math.max(baseLines.length, v1Lines.length, v2Lines.length);

    for (let i = 0; i < maxLen; i++) {
      const baseLine = baseLines[i] || '';
      const v1Line = v1Lines[i] || '';
      const v2Line = v2Lines[i] || '';

      if (v1Line === v2Line) {
        // Same in both
        result.push(v1Line);
      } else if (baseLine === v1Line) {
        // v2 changed
        result.push(v2Line);
      } else if (baseLine === v2Line) {
        // v1 changed
        result.push(v1Line);
      } else {
        // Both changed differently - conflict
        result.push(`<<<<<<< HEAD\n${v1Line}\n=======\n${v2Line}\n>>>>>>>`);
        conflicts.push(`Line ${i + 1}: v1="${v1Line}" vs v2="${v2Line}"`);
      }
    }

    return {
      content: result.join('\n'),
      conflicts,
    };
  }
}

export const diffService = new DiffService();
