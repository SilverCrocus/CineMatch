export interface ParsedMovieList {
  titles: string[];
  source: string;
  error?: string;
}

export interface MovieListParser {
  name: string;
  canParse: (url: string) => boolean;
  parse: (url: string) => Promise<ParsedMovieList>;
}
