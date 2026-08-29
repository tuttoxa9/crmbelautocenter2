import type { CrmPerson, DayPlan, PersonWeek, QualityTask } from "@/lib/quality/types";

export type Fact = { stories: number; reels: number; posts: number };

export type TeamRow = {
  person: CrmPerson;
  off: boolean;
  note: string;
  plan: DayPlan;
  stories: { fact: number; norm: number };
  reelsToday: { fact: number; norm: number };
  reels: { fact: number; norm: number };
  posts: { fact: number; norm: number };
  shoot: { fact: number; norm: number; cap: number; waiting: number };
  waiting: any[];
  shots: any[];
  tasks: QualityTask[];
  weekOrg: Fact;
  days: { dateKey: string; plan: DayPlan; fact: Fact }[];
};

export type Board = {
  todayKey: string;
  weekStart: string;
  weekKeys: string[];
  weekPeople: Record<string, PersonWeek>;
  people: CrmPerson[];
  peopleAll?: CrmPerson[];
  team: TeamRow[];
  waiting: any[];
  ready: any[];
  unplanned: any[];
  organic: Record<string, Record<string, Fact>>;
  tasks: QualityTask[];
  unattributed: number;
  liveStories: any[];
  ig: { hasToken: boolean; lastPollAt: number | null; lastPollError: string | null };
  me: CrmPerson | null;
  role: string;
};
