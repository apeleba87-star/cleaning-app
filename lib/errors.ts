export interface ApiError {
  error: string
  message: string
  details?: unknown
  statusCode: number
}

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }

  toJSON(): ApiError {
    return {
      error: this.name,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, details)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found') {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}

export function handleApiError(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(error.toJSON(), { status: error.statusCode })
  }

  if (error instanceof Error) {
    return Response.json(
      {
        error: 'InternalServerError',
        message: error.message,
        statusCode: 500,
      },
      { status: 500 }
    )
  }

  return Response.json(
    {
      error: 'InternalServerError',
      message: 'An unknown error occurred',
      statusCode: 500,
    },
    { status: 500 }
  )
}


