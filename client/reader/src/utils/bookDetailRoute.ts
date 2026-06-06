import type { Location } from 'react-router-dom';

export type BookDetailRouteState = {
  backgroundPathname?: string;
};

export function getBookDetailRouteState(location: Location): BookDetailRouteState {
  const state = location.state as BookDetailRouteState | null;

  return {
    backgroundPathname: state?.backgroundPathname ?? location.pathname,
  };
}

export function getReaderTransitionKey(location: Location): string {
  const state = location.state as BookDetailRouteState | null;

  if (location.pathname.startsWith('/books/') && state?.backgroundPathname) {
    return state.backgroundPathname;
  }

  return location.pathname;
}
