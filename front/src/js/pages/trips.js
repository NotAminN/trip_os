import { tripService } from '../services/trips.js'
import { getState, setState } from '../state/app-state.js'
import { createTripCard } from '../components/trip-card.js'
import { openCreateTripWizard } from '../components/create-trip-wizard.js'
import { createModal } from '../components/modal.js'
import { toast } from '../components/toast.js'
import { icon } from '../shell/icons.js'
import { toPersianDigits } from '../utils/formatters.js'

export const meta = { title: 'سفرهای من' }

export async function render(container) {
  const trips = tripService.list()
  const currentId = getState().currentTripId

  container.innerHTML = `
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold text-deep">سفرهای من</h1>
        <p class="mt-1 text-sm text-slate">${toPersianDigits(trips.length)} سفر در این مرورگر ذخیره شده است.</p>
      </div>
      <button type="button" class="btn btn-primary" data-new-trip>${icon('plus', 16)}ساخت سفر جدید</button>
    </header>

    ${
      trips.length
        ? `<section class="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" data-trip-grid aria-label="فهرست سفرها"></section>`
        : `<section class="card mt-8 p-10 text-center" aria-label="بدون سفر">
            <span class="mx-auto grid size-16 place-items-center rounded-2xl bg-tint text-sky">${icon('compass', 28)}</span>
            <h2 class="mt-5 text-xl font-extrabold text-deep">هنوز سفری نساخته‌ای.</h2>
            <p class="mx-auto mt-2 max-w-sm text-sm leading-8 text-slate">
              اولین سفر خودت را طراحی کن و همه‌چیز — از مسیر تا چمدان — را در یک نگاه ببین.
            </p>
            <button type="button" class="btn btn-primary mx-auto mt-6" data-new-trip>${icon('plus', 16)}ساخت سفر جدید</button>
          </section>`
    }
  `

  container.querySelectorAll('[data-new-trip]').forEach((btn) => {
    btn.addEventListener('click', () => openCreateTripWizard({ onCreated: () => render(container) }))
  })

  if (trips.length) {
    const grid = container.querySelector('[data-trip-grid]')

    trips.forEach((trip) => {
      grid.appendChild(
        createTripCard({
          trip,
          onDeleted: (target) => confirmDelete(container, target),
        }),
      )
    })

    function confirmDelete(view, targetTrip) {
      const isCurrent = getState().currentTripId === targetTrip.id

      createModal({
        title: 'حذف سفر',
        description: `«${targetTrip.title}» برای همیشه حذف می‌شود.`,
        size: 'sm',
        content: `<p class="text-sm leading-7 text-slate">این کار برگشت‌پذیر نیست. مطمئنی؟</p>`,
        actions: [
          {
            label: 'بله، حذفش کن',
            variant: 'btn-primary',
            onClick: (api) => {
              tripService.delete(targetTrip.id).catch(() => {
                toast.error('حذف سفر ناموفق بود.')
              })
              if (isCurrent) {
                const next = tripService.list()[0]
                setState({ currentTripId: next ? next.id : '' })
              }
              api.requestClose()
              toast.success(`سفر «${targetTrip.title}» حذف شد.`)
              render(view)
            },
          },
          { label: 'انصراف', variant: 'btn-ghost', onClick: (api) => api.requestClose() },
        ],
      }).open()
    }
  }

  void currentId
}
