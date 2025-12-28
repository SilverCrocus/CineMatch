export interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
  vote_average: number;
  genre_ids: number[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface Session {
  id: string;
  code: string;
  status: 'waiting' | 'active' | 'completed';
  host_id: string;
  created_at: string;
}

export interface Friend {
  id: string;
  name: string;
  email: string;
  image?: string;
  status: 'pending' | 'accepted';
}
