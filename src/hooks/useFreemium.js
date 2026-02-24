import { useState } from 'react'

const FREE_MAX_MB    = 10
const FREE_MAX_BATCH = 2

export function useFreemium() {
  const [showUpgrade, setShowUpgrade]   = useState(false)
  const [upgradeReason, setUpgradeReason] = useState('size')

  const isPro = () => localStorage.getItem('morf_pro') === 'true'

  const checkLimits = (files, toolId) => {
    if (isPro()) return true
    if (toolId === 'merge' && files.length > FREE_MAX_BATCH) {
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
