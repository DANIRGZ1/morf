import { useState, type Dispatch, type SetStateAction } from 'react'

const FREE_MAX_MB    = 10
const FREE_MAX_BATCH = 2

export interface FreemiumState {
  showUpgrade: boolean
  setShowUpgrade: Dispatch<SetStateAction<boolean>>
  upgradeReason: string
  checkLimits: (files: Array<{ size: number }>, toolId: string) => boolean
}

export function useFreemium(): FreemiumState {
  const [showUpgrade, setShowUpgrade]     = useState(false)
  const [upgradeReason, setUpgradeReason] = useState('size')

  const isPro = () => localStorage.getItem('morf_pro') === 'true'

  const BATCH_TOOL_IDS = new Set(['merge', 'compress', 'png-jpg', 'jpg-png', 'rotate'])

  const checkLimits = (files: Array<{ size: number }>, toolId: string): boolean => {
    if (isPro()) return true
    if (BATCH_TOOL_IDS.has(toolId) && files.length > FREE_MAX_BATCH) {
      setUpgradeReason('batch')
      setShowUpgrade(true)
      return false
    }
    if (files.some(f => f.size > FREE_MAX_MB * 1024 * 1024)) {
      setUpgradeReason('size')
      setShowUpgrade(true)
      return false
    }
    return true
  }

  return { showUpgrade, setShowUpgrade, upgradeReason, checkLimits }
}
