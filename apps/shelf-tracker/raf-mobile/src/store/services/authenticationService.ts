import type { TokenPair } from '@/types/api/models';
import type { ForgotPasswordRequest, ResetPasswordRequest, SignInRequest, SignUpRequest } from '@/types/api/requests';
import { baseApi } from '../middlewares/createApi';

/** Credentials from these endpoints are stored by the auth middleware. */
export const authenticationService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<TokenPair, SignInRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    register: build.mutation<TokenPair, SignUpRequest>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    /** Signs in, or creates the account, with a Google ID token. */
    google: build.mutation<TokenPair, { idToken: string }>({
      query: (body) => ({ url: '/auth/google', method: 'POST', body }),
    }),
    /** Emails a reset code, if the account exists. */
    forgotPassword: build.mutation<void, ForgotPasswordRequest>({
      query: (body) => ({ url: '/auth/password/forgot', method: 'POST', body }),
    }),
    /** Sets a new password with the emailed code and signs in. */
    resetPassword: build.mutation<TokenPair, ResetPasswordRequest>({
      query: (body) => ({ url: '/auth/password/reset', method: 'POST', body }),
    }),
    logout: build.mutation<void, { refreshToken: string }>({
      query: (body) => ({ url: '/auth/logout', method: 'POST', body }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGoogleMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authenticationService;
