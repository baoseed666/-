export interface ChallengeInput {
  rawText: string;
  budget: number | null;
  peopleCount: number;
  city: string;
  shopContext: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  cityPulse?: {
    weather: { temp: number; desc: string; suitable: boolean; icon: string };
    crowdLevel: 'low' | 'medium' | 'high';
    hotNeighborhood: string;
  };
  eventsContext?: string;
}

export interface ActionLink {
  type: 'book' | 'nav' | 'group' | 'student' | 'search' | 'video';
  label: string;
  url: string;
}

export interface AiTask {
  type: 'main' | 'side' | 'hidden';
  description: string;
  tips: string[];
  shopHint: string | null;
  actionLinks?: ActionLink[];
}

export interface AiPlan {
  id: string;
  title: string;
  difficulty: '地狱' | '普通' | '简单';
  hp: number;
  mp: number;
  estimatedSave: number;
  estimatedSpend: number;
  tasks: AiTask[];
}

export interface ChallengeOutput {
  plans: AiPlan[];
}

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
