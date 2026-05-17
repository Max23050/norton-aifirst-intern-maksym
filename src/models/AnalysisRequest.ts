/** The type of content being analyzed. */
export type MessageType = 'sms' | 'email' | 'url';

/** Input payload for the scam analyzer. */
export interface AnalysisRequest {
  /** The raw text to analyze (SMS body, email body, or URL). */
  message: string;
  /** Optional content type hint. Omit when the type is unknown. */
  type?: MessageType;
  /** When the user submitted this request. */
  submittedAt: Date;
}
