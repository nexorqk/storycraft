export type StoryPageRequest = {
  childName: string;
  childAge: number | null;
  childInterests: string[];
  templateStoryPrompt: string;
  templateIllustrationStylePrompt: string;
  pageNumber: number;
  pageTextPrompt: string;
  previousPages: string[];
};

export type StoryPageResult = {
  text: string;
  illustrationPrompt: string;
};

export interface StoryProvider {
  generatePage(request: StoryPageRequest): Promise<StoryPageResult>;
}
