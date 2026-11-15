import { useState } from 'react'
import { id } from '@/locales/id'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { useSettings } from '@/features/settings/api/settings-queries'
import { useFallbackRules } from '../api/advice-queries'
import { type FallbackRule } from '../data/advice'
import { conditionText } from '../lib/conditions'
import { RuleDialog } from './rule-dialog'
import { TextList } from './text-list'

const TEXT_CELL = 'whitespace-normal align-top'

/** The fallback rules. Admins can edit the steps; viewers only read them. */
export function RulesCard({ canEdit }: { canEdit: boolean }) {
  const query = useFallbackRules()
  const ranges = useSettings().data
  const [editing, setEditing] = useState<FallbackRule | null>(null)
  const columns = id.advisor.rules.columns

  return (
    <Card className='min-w-0 gap-0 p-5 shadow-none'>
      <h2 className='mb-4 text-[15px] font-semibold'>
        {id.advisor.rules.title}
      </h2>

      <QueryBoundary
        query={query}
        skeleton={<Skeleton className='h-[300px] w-full' />}
        empty={{
          when: (data) => data.length === 0,
          view: <EmptyState title={id.advisor.history.empty.none} />,
        }}
      >
        {(rules) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{columns.condition}</TableHead>
                <TableHead>{columns.actions}</TableHead>
                {canEdit && (
                  <TableHead>
                    <span className='sr-only'>{columns.edit}</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => {
                const condition = conditionText(rule.code, ranges)
                return (
                  <TableRow key={rule.code}>
                    <TableCell className={`${TEXT_CELL} min-w-[240px]`}>
                      {condition}
                    </TableCell>
                    <TableCell className={`${TEXT_CELL} min-w-[320px]`}>
                      <TextList items={rule.suggestedActions} />
                    </TableCell>
                    {canEdit && (
                      <TableCell className='align-top'>
                        <Button
                          type='button'
                          variant='outline'
                          className='h-8 px-2.5 text-[13px]'
                          aria-label={id.advisor.rules.editLabel.replace(
                            '{condition}',
                            condition
                          )}
                          onClick={() => setEditing(rule)}
                        >
                          {id.advisor.rules.edit}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </QueryBoundary>

      {editing && (
        <RuleDialog
          key={editing.code}
          rule={editing}
          condition={conditionText(editing.code, ranges)}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  )
}
