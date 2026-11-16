import { AxiosError } from 'axios'
import { id } from '@/locales/id'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { ChangePasswordDialog } from './change-password-dialog'

const copy = id.auth.changePassword

const mocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}))

vi.mock('../change-password', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../change-password')>()
  return { ...actual, changePassword: mocks.changePassword }
})

async function fillForm(
  screen: Awaited<ReturnType<typeof render>>,
  values: { current: string; next: string; confirm: string }
) {
  await userEvent.fill(
    screen.getByLabelText(copy.current, { exact: true }),
    values.current
  )
  await userEvent.fill(
    screen.getByLabelText(copy.new, { exact: true }),
    values.next
  )
  await userEvent.fill(
    screen.getByLabelText(copy.confirm, { exact: true }),
    values.confirm
  )
  await userEvent.click(screen.getByRole('button', { name: /^Simpan$/ }))
}

describe('ChangePasswordDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the Indonesian copy', async () => {
    const screen = await render(
      <ChangePasswordDialog open onOpenChange={vi.fn()} />
    )

    await expect.element(screen.getByText(copy.description)).toBeVisible()
    await expect
      .element(screen.getByLabelText(copy.current, { exact: true }))
      .toBeVisible()
  })

  it('rejects a new password that is too short', async () => {
    const screen = await render(
      <ChangePasswordDialog open onOpenChange={vi.fn()} />
    )

    await fillForm(screen, {
      current: 'lama12345',
      next: 'pendek',
      confirm: 'pendek',
    })

    await expect
      .element(screen.getByText(copy.errors.newTooShort))
      .toBeVisible()
    expect(mocks.changePassword).not.toHaveBeenCalled()
  })

  it('rejects a confirmation that does not match', async () => {
    const screen = await render(
      <ChangePasswordDialog open onOpenChange={vi.fn()} />
    )

    await fillForm(screen, {
      current: 'lama12345',
      next: 'baru12345',
      confirm: 'beda12345',
    })

    await expect.element(screen.getByText(copy.errors.mismatch)).toBeVisible()
    expect(mocks.changePassword).not.toHaveBeenCalled()
  })

  it('rejects a new password equal to the current one', async () => {
    const screen = await render(
      <ChangePasswordDialog open onOpenChange={vi.fn()} />
    )

    await fillForm(screen, {
      current: 'sama12345',
      next: 'sama12345',
      confirm: 'sama12345',
    })

    await expect
      .element(screen.getByText(copy.errors.sameAsCurrent))
      .toBeVisible()
    expect(mocks.changePassword).not.toHaveBeenCalled()
  })

  it('saves, shows a success toast and closes the dialog', async () => {
    mocks.changePassword.mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    const screen = await render(
      <ChangePasswordDialog open onOpenChange={onOpenChange} />
    )

    await fillForm(screen, {
      current: 'lama12345',
      next: 'baru12345',
      confirm: 'baru12345',
    })

    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(mocks.changePassword).toHaveBeenCalledWith('lama12345', 'baru12345')
    expect(mocks.toastSuccess).toHaveBeenCalledWith(copy.success)
  })

  it('shows an inline error when the current password is wrong', async () => {
    const error = new AxiosError('Request failed')
    error.response = {
      status: 422,
      data: {
        error: {
          code: 'validation_error',
          details: { field: 'current_password' },
        },
      },
    } as AxiosError['response']
    mocks.changePassword.mockRejectedValue(error)
    const onOpenChange = vi.fn()
    const screen = await render(
      <ChangePasswordDialog open onOpenChange={onOpenChange} />
    )

    await fillForm(screen, {
      current: 'salah12345',
      next: 'baru12345',
      confirm: 'baru12345',
    })

    await expect
      .element(screen.getByText(copy.errors.currentWrong))
      .toBeVisible()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(mocks.toastError).not.toHaveBeenCalled()
  })

  it('shows a toast when the server cannot be reached', async () => {
    mocks.changePassword.mockRejectedValue(new AxiosError('Network Error'))
    const screen = await render(
      <ChangePasswordDialog open onOpenChange={vi.fn()} />
    )

    await fillForm(screen, {
      current: 'lama12345',
      next: 'baru12345',
      confirm: 'baru12345',
    })

    await vi.waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(id.errors.network)
    )
  })
})
