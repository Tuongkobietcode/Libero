import { HeroSearch } from './sections/HeroSearch';
import { QuickStats } from './sections/QuickStats';
import { NewBooks, PopularBooks, Recommendations } from './sections/BookShelves';
import { RecentActivity } from './sections/RecentActivity';

export default function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      <HeroSearch />

      <QuickStats />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <NewBooks />
          <PopularBooks />
          <Recommendations />
        </div>
        <RecentActivity />
      </div>
    </div>
  );
}
