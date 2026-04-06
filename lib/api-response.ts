import { NextResponse } from "next/server";

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } as ApiSuccessResponse<T>, { status });
}

export function errorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, error } as ApiErrorResponse, { status });
}
