export enum ApiCode {
  SUCCESS = 200,
  FAIL = 500,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
}

export interface ApiResponse<T = any> {
  code: ApiCode;
  data?: T;
  msg?: string;
}

// === API Tester Types ===

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ProxyRequestDto {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface ProxyResponseDto {
  status: number;
  statusText: string;
  headers: Record<string, any>;
  data: any;
  timeTaken: number; // ms
}
