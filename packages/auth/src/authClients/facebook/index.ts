import * as FB from 'fb-sdk-wrapper'

export type Facebook = typeof FB

import { AuthClient } from '../'

export type FacebookUser = facebook.AuthResponse

export interface AuthClientFacebook extends AuthClient {
  login(options?: facebook.LoginOptions): Promise<facebook.StatusResponse>
  logout(): Promise<facebook.StatusResponse>
  signup(options?: facebook.LoginOptions): Promise<facebook.StatusResponse>
  getToken(force?: boolean): Promise<null | string>
  getUserMetadata(force?: boolean): Promise<null | FacebookUser>
}

export const facebook = (client: Facebook): AuthClientFacebook => {
  return {
    type: 'facebook',
    client,

    async login(options?) {
      return await client.login(options)
    },

    async logout() {
      return await client.logout()
    },

    async signup(options?) {
      return await this.login(options)
    },

    async getToken(force = false) {
      const authResponse = await this.getUserMetadata(force)
      return authResponse?.accessToken || null
    },

    /** The user's data from the AuthProvider */
    async getUserMetadata(force = false) {
      const statusResponse = await client.getLoginStatus(force)
      if (statusResponse.status === 'connected') {
        return statusResponse.authResponse
      } else {
        return null
      }
    },
  }
}
