import { id } from '@/locales/id'
import { formatNumber } from '@/lib/format'
import { type SettingsValues } from '@/features/settings/data/settings'
import { formatDecimal } from '@/features/settings/lib/decimal'
import { type RuleCode } from '../data/advice'

type IdealRanges = Pick<
  SettingsValues,
  'phMin' | 'phMax' | 'ecMin' | 'ecMax' | 'temperatureMin' | 'temperatureMax'
>

const text = id.advisor.rules.conditions

function withRange(template: string, min: string, max: string): string {
  return template.replace('{min}', min).replace('{max}', max)
}

/**
 * The condition as a sentence. Rules are stored as a code; the numbers come
 * from Settings, so the text never goes stale when a threshold is changed.
 * `ranges` is undefined while Settings has not loaded.
 */
export function conditionText(
  code: RuleCode,
  ranges: IdealRanges | undefined
): string {
  switch (code) {
    case 'n_deficiency_in_range':
      return text.nDeficiencyInRange.replace('{status}', id.plantStatus.n)
    case 'fe_deficiency':
      return text.statusIs.replace('{status}', id.plantStatus.fe)
    case 'needs_check':
      return text.statusIs.replace('{status}', id.plantStatus.check)
    case 'ph_out_of_range':
      return ranges
        ? withRange(
            text.ph,
            formatNumber(ranges.phMin, 1),
            formatNumber(ranges.phMax, 1)
          )
        : text.phFallback
    case 'ec_out_of_range':
      return ranges
        ? withRange(
            text.ec,
            formatNumber(ranges.ecMin, 1),
            formatNumber(ranges.ecMax, 1)
          )
        : text.ecFallback
    case 'temperature_out_of_range':
      return ranges
        ? withRange(
            text.temperature,
            formatDecimal(ranges.temperatureMin),
            formatDecimal(ranges.temperatureMax)
          )
        : text.temperatureFallback
  }
}
