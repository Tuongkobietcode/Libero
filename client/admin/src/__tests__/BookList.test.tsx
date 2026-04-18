import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BookListPage from '../pages/Catalog/BookList';
import { useNotificationsStore } from '../store/notifications.store';
import { renderWithProviders } from '../test/render';

const mocks = vi.hoisted(() => ({
  listBooks: vi.fn(),
  deleteBook: vi.fn(),
}));

vi.mock('../services/catalog.api', () => ({
  catalogApi: {
    listBooks: mocks.listBooks,
    deleteBook: mocks.deleteBook,
  },
}));

vi.mock('../hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

describe('BookListPage', () => {
  beforeEach(() => {
    useNotificationsStore.getState().clear();
    mocks.listBooks.mockReset();
    mocks.deleteBook.mockReset();
    mocks.listBooks.mockResolvedValue({
      items: [
        {
          _id: 'book-1',
          isbn: '9786041234567',
          title: 'Alpha Book',
          authors: [{ _id: 'author-1', name: 'Author One' }],
          categories: [{ _id: 'category-1', name: 'Reference' }],
          totalCopies: 5,
          availableCopies: 2,
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-10T00:00:00.000Z',
        },
      ],
      pagination: {
        page: 2,
        limit: 10,
        totalItems: 1,
        totalPages: 1,
      },
    });
  });

  it('requests books with the active search params and renders the result table', async () => {
    renderWithProviders(<BookListPage />, {
      route: '/catalog?q=Alpha&available=available&page=2&limit=10',
    });

    expect(await screen.findByText('Alpha Book')).toBeInTheDocument();
    expect(mocks.listBooks).toHaveBeenCalledWith({
      q: 'Alpha',
      available: true,
      page: 2,
      limit: 10,
    });
    expect(screen.getByText('Author One')).toBeInTheDocument();
    expect(screen.getByText('Reference')).toBeInTheDocument();
  });
});
