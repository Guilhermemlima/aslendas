import { requireCouple } from '@/services/session'
import { listLocations } from '@/services/content'
import { CoupleMap } from '@/features/map/couple-map'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export const metadata = { title: 'Mapa · Nosso Universo' }

export default async function MapPage() {
  const { couple } = await requireCouple()
  const locations = await listLocations(couple.id)

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="Por onde a gente passou"
        title="Nosso Mapa"
        description="Cada lugar guarda uma história — e uma vontade de voltar."
      />

      <CoupleMap
        places={locations.map((location) => ({
          id: location.id,
          name: location.name,
          city: location.city,
          country: location.country,
          latitude: location.latitude,
          longitude: location.longitude,
          visitedOn: location.visited_on,
          story: location.story,
        }))}
      />
    </PageTransition>
  )
}
