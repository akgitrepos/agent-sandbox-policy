export interface ReplaySummary {
  readonly totalEvents: number;
  readonly allowCount: number;
  readonly denyCount: number;
  readonly requireApprovalCount: number;
}
