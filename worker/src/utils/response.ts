export function successResponse(data: any, message?: string) {
  return {
    success: true,
    data,
    message,
  }
}

export function errorResponse(message: string, code: number = 400) {
  return {
    success: false,
    error: message,
    code,
  }
}
