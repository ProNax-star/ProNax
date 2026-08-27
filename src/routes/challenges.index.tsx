import { createFileRoute } from '@tanstack/react-router'
import Challenges from '@/features/pages/Challenges'

export const Route = createFileRoute('/challenges/')({
  component: Challenges,
})
