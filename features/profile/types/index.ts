/** Public profile by username. */

export interface PublicProfileUser {
  id?: number
  username: string
  name?: string
  bio?: string
  location?: string
  profile_picture?: string | null
}
