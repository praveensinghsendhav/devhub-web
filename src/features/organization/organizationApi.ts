import type {
  AcceptInviteRequest,
  CreateInvitesRequest,
  CreateInvitesResponse,
  InvitePreview,
  LoginResponse,
  Organization,
  OrganizationInvite,
  OrganizationMember,
  RegisterOrganizationRequest,
} from '@devhub/shared-types';
import { baseApi, OVERRIDE_ON_HMR } from '../../store/apiBase';
import { unwrap } from '../../store/unwrap';

export const organizationApi = baseApi.injectEndpoints({
  overrideExisting: OVERRIDE_ON_HMR,
  endpoints: (builder) => ({
    registerOrganization: builder.mutation<LoginResponse, RegisterOrganizationRequest>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      transformResponse: unwrap<LoginResponse>,
    }),
    previewInvite: builder.query<InvitePreview, string>({
      query: (token) => ({ url: '/auth/invites/preview', method: 'POST', body: { token } }),
      transformResponse: unwrap<InvitePreview>,
    }),
    acceptInvite: builder.mutation<LoginResponse, AcceptInviteRequest>({
      query: (body) => ({ url: '/auth/invites/accept', method: 'POST', body }),
      transformResponse: unwrap<LoginResponse>,
    }),
    getCurrentOrganization: builder.query<Organization, void>({
      query: () => ({ url: '/organizations/current' }),
      transformResponse: unwrap<Organization>,
      providesTags: ['Organization'],
    }),
    listMembers: builder.query<OrganizationMember[], void>({
      query: () => ({ url: '/organizations/current/members' }),
      transformResponse: unwrap<OrganizationMember[]>,
      providesTags: ['Users'],
    }),
    listInvites: builder.query<OrganizationInvite[], void>({
      query: () => ({ url: '/organizations/current/invites' }),
      transformResponse: unwrap<OrganizationInvite[]>,
      providesTags: ['Invites'],
    }),
    createInvites: builder.mutation<CreateInvitesResponse, CreateInvitesRequest>({
      query: (body) => ({ url: '/organizations/current/invites', method: 'POST', body }),
      transformResponse: unwrap<CreateInvitesResponse>,
      invalidatesTags: ['Invites'],
    }),
    revokeInvite: builder.mutation<null, string>({
      query: (inviteId) => ({
        url: `/organizations/current/invites/${encodeURIComponent(inviteId)}`,
        method: 'DELETE',
      }),
      transformResponse: unwrap<null>,
      invalidatesTags: ['Invites'],
    }),
  }),
});

export const {
  useRegisterOrganizationMutation,
  usePreviewInviteQuery,
  useAcceptInviteMutation,
  useGetCurrentOrganizationQuery,
  useListMembersQuery,
  useListInvitesQuery,
  useCreateInvitesMutation,
  useRevokeInviteMutation,
} = organizationApi;
