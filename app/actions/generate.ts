'use server'

import { generateApiDocs, type GenerateInput, type GenerateResult } from '@/lib/ai/generate'

export async function generateApiDocsAction(input: GenerateInput): Promise<GenerateResult> {
  return generateApiDocs(input)
}
