/**
 * Currently the supabase auth decoder returns something like this:
{
  "aud": "authenticated",
  "exp": 1716806712,
  "iat": 1716803112,
  "iss": "https://bubnfbrfzfdryapcuybr.supabase.co/auth/v1",
  "sub": "75fd8091-e0a7-4e7d-8a8d-138d0eb3ca5a",
  "email": "dannychoudhury+1@gmail.com",
  "phone": "",
  "app_metadata": {
    "provider": "email",
    "providers": [
      "email"
    ],
    "roles": "admin" <-- this the role we're looking for
  },
  "user_metadata": {
    "full-name": "Danny Choudhury 1"
  },
  "role": "authenticated", <-- this is the role supabase sets
  "aal": "aal1",
  "amr": [
    {
      "method": "password",
      "timestamp": 1716803107
    }
  ],
  "session_id": "39b4ae31-c57a-4ac1-8f01-e9d6ccbd9365",
  "is_anonymous": false
}
 */

interface PartialSupabaseDecoded {
  app_metadata: {
    [key: string]: unknown
    roles?: string | undefined
  }
}

export const defaultGetRoles = (decoded: PartialSupabaseDecoded): string[] => {
  try {
    const roles = decoded?.app_metadata?.roles

    if (Array.isArray(roles)) {
      return roles
    } else {
      return roles ? [roles] : []
    }
  } catch {
    return []
  }
}
