import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { connectRealtime, disconnectRealtime, type RealtimeDomainEvent, type RealtimeNotificationPayload } from '../services/realtime';
import { useAuthStore } from '../store/auth.store';
import { useNotificationsStore } from '../store/notifications.store';
import { NotificationEvent } from '../types/models';

function invalidateAdminQueries(queryClient: ReturnType<typeof useQueryClient>, eventType?: string): void {
  void queryClient.invalidateQueries({ queryKey: ['notifications'] });

  if (!eventType) {
    return;
  }

  if (
    eventType === NotificationEvent.ReservationRequested ||
    eventType === NotificationEvent.ReservationCreated ||
    eventType === NotificationEvent.BookAvailable ||
    eventType === NotificationEvent.HoldExpiring
  ) {
    void queryClient.invalidateQueries({ queryKey: ['reservations'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }

  if (eventType === NotificationEvent.BookHoldCreated) {
    void queryClient.invalidateQueries({ queryKey: ['book-holds'] });
    void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }

  if (
    eventType === NotificationEvent.CheckoutConfirmation ||
    eventType === NotificationEvent.DueReminder ||
    eventType === NotificationEvent.Overdue
  ) {
    void queryClient.invalidateQueries({ queryKey: ['loans'] });
    void queryClient.invalidateQueries({ queryKey: ['fines'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }

  if (eventType === NotificationEvent.AccountActivated || eventType === NotificationEvent.AccountBlocked) {
    void queryClient.invalidateQueries({ queryKey: ['members'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
      invalidateAdminQueries(queryClient, notification.eventType);
      pushNotification({
        level: 'info',
        message: notification.title,
        description: notification.body,
      });
    };

    const handleDomainEvent = (event: RealtimeDomainEvent) => {
      invalidateAdminQueries(queryClient, event.type);
    };

    socket.on('notification:new', handleNotification);
    socket.on('library:event', handleDomainEvent);

    return () => {
      socket.off('notification:new', handleNotification);
      socket.off('library:event', handleDomainEvent);
    };
  }, [accessToken, pushNotification, queryClient]);
}
