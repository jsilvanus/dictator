'use client';

export function TriggerChip({ trigger }: { trigger: string }) {
  return <span className="badge">{trigger}</span>;
}
