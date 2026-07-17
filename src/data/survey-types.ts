export type SurveyStatus = "draft" | "active" | "closed";
export type SurveyDisplayStatus = SurveyStatus | "expired";

export type SurveyQuestionType =
  | "short_answer"
  | "paragraph"
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "linear_scale";

export type SurveyAnswerValue = string | string[] | number;

export interface SurveyQuestionInput {
  clientId: string;
  type: SurveyQuestionType;
  title: string;
  isRequired: boolean;
  options: string[];
}

export interface SurveyQuestionRecord {
  id: string;
  position: number;
  type: SurveyQuestionType;
  title: string;
  isRequired: boolean;
  options: string[];
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
  answers: Array<{
    questionTitle: string;
    questionType: SurveyQuestionType;
    value: SurveyAnswerValue;
  }>;
}
