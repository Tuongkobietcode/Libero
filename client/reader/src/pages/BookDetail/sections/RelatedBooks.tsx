import { useQuery } from '@tanstack/react-query';

import { BookCard } from '../../../components/book/BookCard';
import { Card } from '../../../components/ui/Card';
import { Spinner } from '../../../components/ui/Spinner';
import { SectionHeader } from '../../../components/layout/SectionHeader';
import { catalogApi } from '../../../services/catalog.api';
import { queryKeys } from '../../../lib/queryKeys';

interface RelatedBooksProps {
  currentBookId: string;
}

export function RelatedBooks({ currentBookId }: RelatedBooksProps) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.popular(8, 30),
    queryFn: () => catalogApi.getPopular({ limit: 8, windowDays: 30 }),
    meta: { errorMessage: 'Không tải được sách liên quan.' },
  });

  const items = (data ?? []).filter((book) => book._id !== currentBookId).slice(0, 5);

  return (
    <Card padding="md">
      <SectionHeader title="Sách liên quan" action={{ label: 'Xem tất cả', to: '/search' }} />

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">Chưa có sách liên quan để gợi ý.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((book) => (
            <BookCard key={book._id} book={book} />
          ))}
        </div>
      )}
    </Card>
  );
}
