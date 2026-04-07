export interface SearchImageUser {
  username: string
  profile_picture?: string | null
}

export interface SearchImageItem {
  id?: number
  photo_token: string
  image_url: string
  liked?: boolean
  user: SearchImageUser
}
