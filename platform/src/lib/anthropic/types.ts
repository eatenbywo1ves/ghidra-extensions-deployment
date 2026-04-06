import { z } from "zod";

export const CharacterSchema = z.object({
  name: z.string(),
  role: z.enum(["protagonist", "antagonist", "supporting", "minor"]),
  physicalDescription: z.string(),
  personalityTraits: z.array(z.string()),
  imagePromptHint: z.string(),
});

export const SceneSchema = z.object({
  title: z.string(),
  setting: z.string(),
  mood: z.string(),
  visualElements: z.string(),
  imagePromptHint: z.string(),
});

export const LiteraryAnalysisSchema = z.object({
  characters: z.array(CharacterSchema),
  scenes: z.array(SceneSchema),
  themes: z.array(z.string()),
  styleNotes: z.string(),
  narrativeArc: z.enum([
    "three-act",
    "hero-journey",
    "kishōtenketsu",
    "episodic",
    "other",
  ]),
  genre: z.string(),
  genreConfidence: z.number().min(0).max(1),
  coverArtConcept: z.string(),
  typographyMood: z.string(),
});

export const ImagePromptsSchema = z.object({
  coverArt: z.string().optional(),
  characterPortraits: z.array(z.string()).optional(),
  sceneIllustrations: z.array(z.string()).optional(),
  typographyPreview: z.string().optional(),
});

export type CharacterAnalysis = z.infer<typeof CharacterSchema>;
export type SceneAnalysis = z.infer<typeof SceneSchema>;
export type LiteraryAnalysis = z.infer<typeof LiteraryAnalysisSchema>;
export type ImagePrompts = z.infer<typeof ImagePromptsSchema>;
