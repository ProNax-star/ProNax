import { createFileRoute } from '@tanstack/react-router'
import SoundsExplorer from '@/features/pages/SoundsExplorer'

export const Route = createFileRoute('/sounds/')({
  component: SoundsExplorer,
})
