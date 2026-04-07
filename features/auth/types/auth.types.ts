/** Shared auth shapes for forms and API responses (optional imports). */

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
  password_confirmation: string
}

export interface LoginSuccessResponse {
  token: string
  refresh_token: string
  route: string
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
  new_password_confirmation: string
}
