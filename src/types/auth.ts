export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  responsedAt: string;
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponseDto {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}
