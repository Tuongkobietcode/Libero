import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocation } from 'react-router-dom';

import BookListPage from '../pages/Catalog/BookList';
import { useNotificationsStore } from '../store/notifications.store';
import { renderWithProviders } from '../test/render';

const mocks = vi.hoisted(() => ({
  listBooks: vi.fn(),
  getFacets: vi.fn(),
  deleteBook: vi.fn(),
}));

vi.mock('../services/catalog.api', () => ({
  catalogApi: {
    listBooks: mocks.listBooks,
    getFacets: mocks.getFacets,
    deleteBook: mocks.deleteBook,
  },
}));

vi.mock('../hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

function LocationProbe() {
  const location = useLocation();

  return <span data-testid="location">{location.pathname}</span>;
}

describe('BookListPage', () => {
  beforeEach(() => {
    useNotificationsStore.getState().clear();
    mocks.listBooks.mockReset();
    mocks.getFacets.mockReset();
    mocks.deleteBook.mockReset();
    mocks.getFacets.mockResolvedValue({
      categories: [{ _id: 'category-1', name: 'Technology', count: 1 }],
      statuses: {
        available: 2,
        borrowing: 3,
        soon: 0,
      },
      publishYear: {
        min: 2020,
        max: 2026,
      },
    });
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

  it('opens the matching book detail page when a table row is clicked', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <>
        <BookListPage />
        <LocationProbe />
      </>,
      {
        route: '/catalog',
      },
    );

    const row = (await screen.findByText('Alpha Book')).closest('tr');
    expect(row).not.toBeNull();

    await user.click(row!);

    expect(screen.getByTestId('location')).toHaveTextContent('/catalog/book-1');
  });
});
