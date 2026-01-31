import { expect, test } from 'vitest'

test('Check if App Name is correct', () => {
  const appName = "Nightingale AI" 
  expect(appName).toContain('Nightingale')
})
