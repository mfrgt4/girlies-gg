export type Game = {
  id: string
  name: string
  genre: string | null
  description: string | null
  logo_url: string | null
  banner_url: string | null
  roles: string[]
  characters: string[]
  ranks: string[]
}

export type Profile = {
  id: string
  username: string
  avatar_url: string | null
  bio: string
  favorite_games: string[]
}

export type PlayerCard = {
  id: string
  user_id: string
  game_id: string
  nickname: string
  avatar_url: string | null
  main_character: string | null
  game_role: string | null
  game_rank: string | null
  play_style: string | null
  availability: string | null
  seeking: string | null
  bio: string
  tags: string[]
  theme: string
  accent_color: string | null
  frame: string
  sticker: string | null
  is_published: boolean
  created_at: string
  profiles?: Pick<Profile, 'username' | 'avatar_url'> | null
}
