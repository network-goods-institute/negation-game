import { NextResponse } from "next/server";

export function createSecureErrorResponse(
  message: string,
  status: number = 500,
  corsOrigin: string = "https://forum.scroll.io"
): NextResponse {
  const sanitizedMessage =
    process.env.NODE_ENV === "production"
      ? getSanitizedErrorMessage(status)
      : message;

  const response = NextResponse.json({ error: sanitizedMessage }, { status });

  response.headers.set("Access-Control-Allow-Origin", corsOrigin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");

  return response;
}

function getSanitizedErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "Bad Request";
    case 401:
      return "Unauthorized";
    case 403:
      return "Forbidden";
    case 404:
      return "Not Found";
    case 429:
      return "Too Many Requests";
    case 500:
    default:
      return "Internal Server Error";
  }
}
