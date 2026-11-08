export type AlertKind = 'fe' | 'check' | 'n' | 'sensorOffline'

export type DashboardAlert = {
  id: string
  kind: AlertKind
  title: string
  minutesAgo: number
}

// Dummy data until the alerts API exists.
export const latestAlerts: DashboardAlert[] = [
  {
    id: 'a1',
    kind: 'fe',
    title: 'L5 terdeteksi Defisiensi Fe (82%)',
    minutesAgo: 12,
  },
  {
    id: 'a2',
    kind: 'check',
    title: 'Model tidak sepakat pada L6, perlu dicek manual',
    minutesAgo: 12,
  },
  {
    id: 'a3',
    kind: 'n',
    title: 'L3 terdeteksi Defisiensi N (88%)',
    minutesAgo: 47,
  },
  {
    id: 'a4',
    kind: 'sensorOffline',
    title: 'Sensor EC sempat offline selama 2 menit',
    minutesAgo: 180,
  },
]
