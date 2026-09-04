import { requireCouple } from '@/services/session'
import { listImportantDates } from '@/services/content'
import { CoupleCalendar } from '@/features/calendar/couple-calendar'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export const metadata = { title: 'Calendário · Nosso Universo' }

export default async function CalendarPage() {
  const { couple } = await requireCouple()
  const dates = await listImportantDates(couple.id)

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="Datas que não podem passar em branco"
        title="Calendário"
        description="Aniversários, viagens, encontros e lembretes — com contagem regressiva."
      />

      <CoupleCalendar
        anniversary={couple.started_at}
        dates={dates.map((date) => ({
          id: date.id,
          title: date.title,
          description: date.description,
          date: date.date,
          endDate: date.end_date,
          category: date.category,
          recurrence: date.recurrence,
        }))}
      />
    </PageTransition>
  )
}
