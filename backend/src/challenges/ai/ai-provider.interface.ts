export interface ChallengeInput {
  rawText: string;
  budget: number;
  peopleCount: number;
  city: string;
  shopContext: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

export interface AiTask {
  type: 'main' | 'side' | 'hidden';
  description: string;
  tips: string[];
  shopHint: string | null;
}

export interface AiPlan {
  id: string;
  title: string;
  difficulty: '地狱' | '普通' | '简单';
  hp: number;
  mp: number;
  estimatedSave: number;
  tasks: AiTask[];
}

export interface ChallengeOutput { plans: AiPlan[]; }

export interface ReportInput {
  savedAmount: number;
  budget: number;
  peopleCount: number;
  city: string;
  tasksCompleted: number;
  cityAvgSave: number;
}

export interface ReportOutput {
  headline: string;
  rankTitle: string;
  percentile: number;
  hpConsumed: number;
  mpUsed: number;
  flavorText: string;
}

export interface AIProvider {
  streamChallenge(input: ChallengeInput): AsyncIterable<string>;
  generateReport(input: ReportInput): Promise<ReportOutput>;
}
