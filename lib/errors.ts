export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export function handleApiError(error: any) {
  console.error('API Error:', error)

  if (error instanceof ValidationError) {
    return Response.json(
      {
        error: error.message,
        details: error.details,
        statusCode: 400,
      },
      { status: 400 }
    )
  }

  if (error instanceof UnauthorizedError) {
    return Response.json(
      {
        error: error.message,
        statusCode: 401,
      },
      { status: 401 }
    )
  }

  if (error instanceof ForbiddenError) {
    return Response.json(
      {
        error: error.message,
        statusCode: 403,
      },
      { status: 403 }
    )
  }

  if (error instanceof NotFoundError) {
    return Response.json(
      {
        error: error.message,
        statusCode: 404,
      },
      { status: 404 }
    )
  }

  return Response.json(
    {
      error: error.message || 'Internal server error',
      statusCode: 500,
    },
    { status: 500 }
  )
}
















