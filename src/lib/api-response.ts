import { NextResponse } from "next/server"

/**
 * Standard API error response structure
 */
export interface ApiError {
  error: string
  code?: string
  details?: unknown
}

/**
 * Standard API success response structure
 */
export interface ApiSuccess<T = Record<string, unknown>> {
  success: true
  data?: T
}

/**
 * HTTP status codes commonly used in the API
 */
export const StatusCode = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  GONE: 410,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const

/**
 * Creates a standard error response
 */
export function errorResponse(
  message: string,
  status: number = StatusCode.BAD_REQUEST,
  details?: unknown
): NextResponse<ApiError> {
  const body: ApiError = {
    error: message,
  }
  if (details !== undefined) {
    body.details = details
  }
  return NextResponse.json(body, { status })
}

/**
 * Creates a standard success response
 */
export function successResponse<T = Record<string, unknown>>(
  data?: T,
  status: number = StatusCode.OK
): NextResponse<ApiSuccess<T> | T> {
  if (data === undefined) {
    return NextResponse.json({ success: true } as ApiSuccess<T>, { status })
  }
  // If data is already an object with properties, return it directly
  // Otherwise wrap it in a success envelope
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    return NextResponse.json(data, { status })
  }
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Common error response helpers
 */
export const ApiError = {
  badRequest: (message: string, details?: unknown) =>
    errorResponse(message, StatusCode.BAD_REQUEST, details),

  unauthorized: (message = "Unauthorized") =>
    errorResponse(message, StatusCode.UNAUTHORIZED),

  forbidden: (message = "Access denied") =>
    errorResponse(message, StatusCode.FORBIDDEN),

  notFound: (message = "Not found") =>
    errorResponse(message, StatusCode.NOT_FOUND),

  conflict: (message: string) =>
    errorResponse(message, StatusCode.CONFLICT),

  gone: (message: string) =>
    errorResponse(message, StatusCode.GONE),

  payloadTooLarge: (message = "Request too large") =>
    errorResponse(message, StatusCode.PAYLOAD_TOO_LARGE),

  validationFailed: (message: string, errors?: unknown) =>
    errorResponse(message, StatusCode.UNPROCESSABLE_ENTITY, errors),

  tooManyRequests: (message = "Too many requests. Please try again later.") =>
    errorResponse(message, StatusCode.TOO_MANY_REQUESTS),

  internalError: (message = "Internal server error") =>
    errorResponse(message, StatusCode.INTERNAL_SERVER_ERROR),
}
