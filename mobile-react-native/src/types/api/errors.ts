/** Every failed request is mapped to this shape (see store/bases/errorMapping). */
export interface AppError {
  /** HTTP status, or 0 when the server could not be reached. */
  status: number;
  /** First human-readable message. */
  message: string;
  /** All messages, e.g. one per invalid field. */
  messages: string[];
  /** Raw body, for endpoints that return extra data (e.g. duplicate receiptId). */
  body?: unknown;
}
