'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * `/twin` ("InnerSelf") retired as a dedicated destination — spec §6 is
 * explicit: "Do not create a duplicate InnerSelf destination for MVP... No
 * dedicated Twin/InnerSelf screen is required." (docs/INTELLIGENCE_SPEC_AUDIT.md
 * Critical Finding #2, ADR 0010.) Kept as a redirect rather than deleted
 * outright / left to 404, in case anything still links here from outside
 * this app (the in-app Sidebar mini-card and mobile Explore tiles were the
 * only internal links and were removed the same session). The confirm/
 * reject calibration UI this page used to own now lives contextually on
 * Dashboard as `TwinCalibrationCard`, per the spec's own prescribed pattern.
 */
export default function TwinPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard')
  }, [router])
  return null
}
