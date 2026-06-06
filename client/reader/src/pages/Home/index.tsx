import { HeroSearch } from './components/HeroSearch';
import { QuickStats } from './components/QuickStats';
import { NewBooks, PopularBooks, Recommendations } from './components/BookShelves';
import { RecentActivity } from './components/RecentActivity';

export default function HomePage() {
  return (
    <div className="flex flex-col gap-9">
      <HeroSearch />
      <QuickStats />
      <RecentActivity />
      <NewBooks />
      <PopularBooks />
      <Recommendations />
    </div>
  );
}
