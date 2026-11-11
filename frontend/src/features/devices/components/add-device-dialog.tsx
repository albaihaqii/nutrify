import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { id } from '@/locales/id'
import { toast } from 'sonner'
import { getApiErrorCode } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateDevice } from '../api/devices-queries'
import { CODE_PATTERN, deviceTypes, type DeviceKey } from '../data/devices'
import { deviceErrorMessage } from '../lib/errors'

const schema = z.object({
  type: z.enum(deviceTypes),
  code: z.string().regex(CODE_PATTERN, id.devices.add.errors.code),
  name: z
    .string()
    .trim()
    .min(1, id.devices.add.errors.name)
    .max(100, id.devices.add.errors.nameLong),
})

type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = { type: 'sensor_node', code: '', name: '' }

interface AddDeviceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (deviceName: string, key: DeviceKey) => void
}

export function AddDeviceDialog({
  open,
  onOpenChange,
  onCreated,
}: AddDeviceDialogProps) {
  const create = useCreateDevice()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  })

  function handleOpenChange(next: boolean) {
    if (!next) form.reset(DEFAULTS)
    onOpenChange(next)
  }

  async function onSubmit(values: FormValues) {
    try {
      const key = await create.mutateAsync(values)
      handleOpenChange(false)
      onCreated(values.name, key)
    } catch (error) {
      if (getApiErrorCode(error) === 'conflict') {
        form.setError('code', { message: id.devices.errors.conflict })
      } else {
        toast.error(deviceErrorMessage(error))
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{id.devices.add.title}</DialogTitle>
          <DialogDescription>{id.devices.add.description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='add-device-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex flex-col gap-4'
          >
            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{id.devices.add.type}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {deviceTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {id.devices.types[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{id.devices.add.name}</FormLabel>
                  <FormControl>
                    <Input autoComplete='off' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='code'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{id.devices.add.code}</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete='off'
                      className='font-mono'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{id.devices.add.codeHint}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => handleOpenChange(false)}
          >
            {id.devices.add.cancel}
          </Button>
          <Button
            type='submit'
            form='add-device-form'
            disabled={form.formState.isSubmitting}
          >
            {id.devices.add.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
