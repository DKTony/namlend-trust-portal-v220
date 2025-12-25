/**
 * Backend Notifications Hooks
 * Version: v3.0.0
 * 
 * React Query hooks for backend notification integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BackendNotificationService, NotificationFilters } from '../services/backendNotificationService';
import { BackendNotification } from '../types';

/**
 * Get notifications with optional filters
 */
export const useNotifications = (filters?: NotificationFilters) => {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => BackendNotificationService.getNotifications(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Get unread notification count
 */
export const useUnreadNotificationCount = () => {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => BackendNotificationService.getUnreadCount(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

/**
 * Mark notification as read mutation
 */
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => 
      BackendNotificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

/**
 * Mark all notifications as read mutation
 */
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => BackendNotificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

/**
 * Get notification preferences
 */
export const useNotificationPreferences = () => {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => BackendNotificationService.getPreferences(),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Update notification preference mutation
 */
export const useUpdateNotificationPreference = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      channel: string;
      category: string;
      enabled: boolean;
    }) => BackendNotificationService.updatePreference(
      params.channel,
      params.category,
      params.enabled
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
};

/**
 * Hook for real-time notification updates
 */
export const useRealtimeNotifications = (
  userId: string | undefined,
  onNewNotification?: (notification: BackendNotification) => void
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = BackendNotificationService.subscribeToNotifications(
      userId,
      (notification) => {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        
        // Call callback if provided
        if (onNewNotification) {
          onNewNotification(notification);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId, queryClient, onNewNotification]);
};
