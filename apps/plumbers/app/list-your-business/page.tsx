import { getAllServiceSlugs, getAllAreaSlugs } from '@graph-directory/core-mutators'
import { ListBusinessForm } from './list-business-form'

export default async function ListYourBusinessPage() {
  // Load services and areas from database
  const [services, areas] = await Promise.all([
    getAllServiceSlugs(),
    getAllAreaSlugs(),
  ])

  return <ListBusinessForm availableServices={services} availableAreas={areas} />
}
