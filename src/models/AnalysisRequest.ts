/** The type of content being analyzed. */
export type MessageType = 'sms' | 'email' | 'url' | 'unknown';

/** Input payload for the scam analyzer. */
export interface AnalysisRequest {
  /** The raw text to analyze (SMS body, email body, or URL). */
  message: string;
  /** Content type hint; defaults to 'unknown' when omitted. */
  type?: MessageType;
  /** When the user submitted this request. */
  submittedAt: Date;
}
