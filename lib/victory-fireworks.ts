export type VictoryFireworkBurst = {
  key: string
  top: `${number}%`
  left: `${number}%`
  color: string
  delayMs: number
  durationMs: number
}

export function createVictoryFireworkBursts(): VictoryFireworkBurst[] {
  return [
    {
      key: 'left',
      top: '14%',
      left: '12%',
      color: '#F4C85C',
      delayMs: 0,
      durationMs: 2200,
    },
    {
      key: 'right',
      top: '12%',
      left: '72%',
      color: '#E4DAFF',
      delayMs: 220,
      durationMs: 2400,
    },
    {
      key: 'center',
      top: '5%',
      left: '42%',
      color: '#70D7A5',
      delayMs: 420,
      durationMs: 2600,
    },
  ]
}
