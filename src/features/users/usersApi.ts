import { baseApi, OVERRIDE_ON_HMR } from '../../store/apiBase';
import { unwrap } from '../../store/unwrap';

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export const usersApi = baseApi.injectEndpoints({
  overrideExisting: OVERRIDE_ON_HMR,
  endpoints: (builder) => ({
    listUsers: builder.query<DirectoryUser[], void>({
      query: () => ({ url: '/users' }),
      transformResponse: unwrap<DirectoryUser[]>,
      providesTags: ['Users'],
    }),
  }),
});

export const { useListUsersQuery } = usersApi;
