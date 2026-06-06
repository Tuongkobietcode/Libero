import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { connectRealtime, disconnectRealtime, type RealtimeDomainEvent, type RealtimeNotificationPayload } from '../services/realtime';
import { useAuthStore } from '../store/auth.store';
import { useNotificationsStore } from '../store/notifications.store';
import { NotificationEvent } from '../types/models';

function invalidateReaderQueries(queryClient: ReturnType<typeof useQueryClient>, eventType?: string): void {
  void queryClient.invalidateQueries({ queryKey: ['notifications'] });

  if (!eventType) {
    return;
  }

  if (
    eventType === NotificationEvent.ReservationCreated ||
    eventType === NotificationEvent.ReservationRequested ||
    eventType === NotificationEvent.ReservationAdvanced ||
    eventType === NotificationEvent.ReservationCancelled ||
    eventType === NotificationEvent.ReservationExpired ||
    eventType === NotificationEvent.ReservationFulfilled ||
    eventType === NotificationEvent.BookAvailable ||
    eventType === NotificationEvent.HoldExpiring
  ) {
    void queryClient.invalidateQueries({ queryKey: ['reader-my-reservations'] });
    void queryClient.invalidateQueries({ queryKey: ['reader', 'my-reservations'] });
    void queryClient.invalidateQueries({ queryKey: ['reader', 'book-detail-active-reservations'] });
    void queryClient.invalidateQueries({ queryKey: ['reader', 'my-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['reader', 'my-activities'] });
  }

  if (
    eventType === NotificationEvent.BookHoldCreated ||
    eventType === NotificationEvent.BookHoldCancelled ||
    eventType === NotificationEvent.BookHoldExpired ||
    eventType === NotificationEvent.BookHoldFulfilled
  ) {
    void queryClient.invalidateQueries({ queryKey: ['reader-my-book-holds'] });
    void queryClient.invalidateQueries({ queryKey: ['reader', 'book-detail-active-holds'] });
    void queryClient.invalidateQueries({ queryKey: ['reader', 'book-detail'] });
    void queryClient.invalidateQueries({ queryKey: ['reader', 'search-books'] });
    void queryClient.invalidateQueries({ queryKey: ['reader', 'home-new-books'] });
    void queryClient.invalidateQueries({ queryKey: ['reader', 'my-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['reader', 'my-activities'] });
  }

  if (
    eventType === NotificationEvent.CheckoutConfirmation ||
    eventType === NotificationEvent.DueReminder ||
    eventType === NotificationEvent.Overdue
  ) {
    void queryClient.invalidateQueries({ queryKey: ['reader-my-loans'] });
    void queryClient.invalidateQueries({ queryKey: ['reader', 'my-loans'] });
    void queryClient.invalidateQueries({ queryKey: ['reader-my-fines'] });
    void queryClient.invalidateQueries({ queryKey: ['reader', 'my-fines'] });
    void queryClient.invalidateQueries({ queryKey: ['reader', 'my-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['reader', 'my-activities'] });
  }

  if (eventType === NotificationEvent.AccountActivated || eventType === NotificationEvent.AccountBlocked) {
    void queryClient.invalidateQueries({ queryKey: ['reader-profile'] });
    void queryClient.invalidateQueries({ queryKey: ['reader-profile-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['reader-profile-activities'] });
  }
}

export function useRealtime(): void {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const pushNotification = useNotificationsStore((state) => state.push);

  useEffect(() => {
    if (!accessToken) {
      disconnectRealtime();
      return;
    }

    const socket = connectRealtime(accessToken);

    const handleNotification = ({ notification }: RealtimeNotificationPayload) => {
      invalidateReaderQueries(queryClient, notification.eventType);
      pushNotification({
        level: 'info',
        message: notification.title,
        description: notification.body,
      });
    };

    const handleDomainEvent = (event: RealtimeDomainEvent) => {
      invalidateReaderQueries(queryClient, event.type);
    };

    socket.on('notification:new', handleNotification);
    socket.on('library:event', handleDomainEvent);

    return () => {
      socket.off('notification:new', handleNotification);
      socket.off('library:event', handleDomainEvent);
    };
  }, [accessToken, pushNotification, queryClient]);
}
