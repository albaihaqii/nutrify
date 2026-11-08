import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { SignOutDialog } from './sign-out-dialog'

const navigate = vi.fn()
const reset = vi.fn()
const clear = vi.fn()

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (state: { auth: { reset: () => void } }) => unknown
  ) => selector({ auth: { reset } }),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQueryClient: () => ({ clear }) }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: () => navigate }
})

describe('SignOutDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the Indonesian confirmation copy', async () => {
    const { getByText } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await expect.element(getByText('Keluar dari Nutrify?')).toBeVisible()
    await expect
      .element(getByText('Anda perlu masuk lagi untuk mengakses dashboard.'))
      .toBeVisible()
  })

  it('clears the session and cache, then goes to a clean sign-in page', async () => {
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await userEvent.click(getByRole('button', { name: /^Ya, keluar$/i }))

    expect(reset).toHaveBeenCalledOnce()
    expect(clear).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith({ to: '/sign-in', replace: true })
  })

  it('changes nothing when Batal is clicked', async () => {
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await userEvent.click(getByRole('button', { name: /^Batal$/i }))

    expect(reset).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})
