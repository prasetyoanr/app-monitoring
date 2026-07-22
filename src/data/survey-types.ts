export type SurveyStatus = "draft" | "active" | "closed";
export type SurveyDisplayStatus = SurveyStatus | "expired";
export type SurveyKpiCategory = "installation" | "repair";

export type SurveyQuestionType =
  | "short_answer"
  | "paragraph"
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "linear_scale";

export type SurveyAnswerValue = string | string[] | number;
export type SurveySentimentLabel =
  | "very_positive"
  | "positive"
  | "neutral"
  | "negative"
  | "very_negative"
  | "not_applicable";

export interface SurveyAnswerAnalysisRecord {
  status: "pending" | "completed" | "failed";
  label: SurveySentimentLabel | null;
  score: number | null;
  confidencePercent: number | null;
  summary: string;
  manualScore: number | null;
}

export interface SurveyQuestionInput {
  clientId: string;
  type: SurveyQuestionType;
  title: string;
  isRequired: boolean;
  options: string[];
  kpiCategory: SurveyKpiCategory | null;
}

export interface SurveyQuestionRecord {
  id: string;
  position: number;
  type: SurveyQuestionType;
  title: string;
  isRequired: boolean;
  options: string[];
  kpiCategory: SurveyKpiCategory | null;
}

export interface SurveyListRecord {
  id: string;
  title: string;
  description: string;
  status: SurveyDisplayStatus;
  storedStatus: SurveyStatus;
  publicCode: string;
  expiresAt: string | null;
  createdAt: string;
  questionCount: number;
  responseCount: number;
}

export interface SurveySubmissionRecord {
  id: string;
  clientName: string;
  division: string;
  submittedAt: string;
  answers: Array<{
    questionId: string;
    value: SurveyAnswerValue;
    analysis: SurveyAnswerAnalysisRecord | null;
  }>;
}

export interface SurveyResponseData {
  surveyId: string;
  title: string;
  questions: SurveyQuestionRecord[];
  submissions: SurveySubmissionRecord[];
}

export interface PublicSurveyRecord {
  id: string;
  title: string;
  description: string;
  status: SurveyDisplayStatus;
  expiresAt: string | null;
  questions: SurveyQuestionRecord[];
}

export interface SurveyReportRecord {
  surveyId: string;
  surveyTitle: string;
  responseId: string;
  clientName: string;
  division: string;
  submittedAt: string;
  submittedDate: string;
  submittedAtIso: string;
  answers: Array<{
    questionId: string;
    questionTitle: string;
    questionType: SurveyQuestionType;
    kpiCategory: SurveyKpiCategory | null;
    value: SurveyAnswerValue;
    analysis: SurveyAnswerAnalysisRecord | null;
  }>;
}
