import { MAX_IMAGE_BYTES } from '../data/models'

type ImageProblem = 'notImage' | 'tooLarge'

/** What is wrong with a chosen file, checked before it is sent. null when it can be sent. */
export function imageProblem(
  file: Pick<File, 'type' | 'size'>
): ImageProblem | null {
  if (!file.type.startsWith('image/')) return 'notImage'
  if (file.size > MAX_IMAGE_BYTES) return 'tooLarge'
  return null
}
